/**
 * The main implementation parts of the OpenID Connect client flow.
 */
import joi from "joi";
import {
  base64url,
  JSONWebKeySet,
  jwtVerify,
  JWTVerifyGetKey,
  JWTVerifyResult,
} from "jose";
import { assertOk, attempt, validate } from "./checks";
import serverConfig from "./oidc-config.json";

/** Utility for fetching possibly-undefined server config keys. */
function getConfigValue(key: string): string|undefined {
  return (serverConfig as {[key: string]: string|undefined})[key] as string;
}

export const OIDC_BASE_URL = serverConfig.oidc_server;
export const OIDC_CONFIG_URL = new URL(OIDC_BASE_URL);
// This URL is fixed in the spec; all the other URLs are defined in the
// document that lives at this path.
OIDC_CONFIG_URL.pathname = "/.well-known/openid-configuration";

/** The minimum interface expected from an OpenID Connect config doc. */
export interface OIDCConfig {
  issuer: string;
  authorization_endpoint: string;
  jwks_uri: string;
  token_endpoint: string;
}

/** Validates a retrieved JSON document as an OpenID Connect configuration. */
const configValidator = joi
  .object({
    issuer: joi.string().required(),
    authorization_endpoint: joi.string().required(),
    jwks_uri: joi.string().required(),
    token_endpoint: joi.string().required(),
  })
  .unknown(true);

/** Retrieve and validate the OIDC config from the server. */
export async function getOidcConfig(): Promise<OIDCConfig> {
  const config = await attempt(async () => {
    const response = await assertOk(
      fetch(OIDC_CONFIG_URL.toString()),
      "/.well-known/openid-configuration"
    );
    return response.json();
  }, "/.well-known/openid-configuration can be fetched and is valid JSON");

  validate(
    config,
    configValidator,
    "/.well-known/openid-configuration is a valid OpenID Connect config doc"
  );

  return config;
}

type JWK = {kty: 'EC'|'RSA', [key: string]: any};
// The following parameters, if present in a JWK, indicate that the auth server
// has exposed private key parameters.
const PRIVATE_EC_PARAMS = ['d'];
const PRIVATE_RSA_PARAMS = ['d', 'dp', 'dq', 'p', 'q', 'qi'];

function validateJwkHasNoPrivateInfo(value: JWK, _helpers: joi.CustomHelpers<JWK>) {
  if (value.kty === 'EC') {
    if (PRIVATE_EC_PARAMS.some(k => k in value && value[k])) {
      throw new Error('JWKS contains private EC key information');
    }
  } else if (value.kty === 'RSA') {
    if (PRIVATE_RSA_PARAMS.some(k => k in value && value[k])) {
      throw new Error('JWKS contains private RSA key information');
    }
  } else {
    throw new Error(`Invalid key type for public key (must be 'EC' or 'RSA'): ${value.kty}`);
  }
  return value;
}

/** Validates a retrieved JSON document as a JSON Web Key Set. */
const jwksValidator = joi.object({
  keys: joi
    .array()
    .items(
      joi
        .object({
          kty: joi.string().required(),
        })
        .unknown(true)
        .custom(validateJwkHasNoPrivateInfo, "Public JWKS doesn't contain private key information")
    )
    .min(1)
    .required(),
});

/**
 * Retrieve and validate the JSON Web Key Set from the URI specified in the
 * OIDC config.
 */
export async function getJWKS(
  c: OIDCConfig
): Promise<JSONWebKeySet | undefined> {
  const jwks = await attempt(async () => {
    const response = await assertOk(fetch(c.jwks_uri), "jwks_uri");
    return response.json();
  }, "JWKS (jwks_uri) can be fetched and is valid JSON");

  validate(jwks, jwksValidator, "JWKS is a valid JSON Web Key Set");

  return jwks;
}

/** Make a random 43-byte string to use as a PKCE code verifier. */
function makeCodeVerifier(): string {
  const randomBytes = crypto.getRandomValues(new Uint8Array(32));
  // Unpadded base64 of a 32-byte string will always be 43 bytes.
  return base64url.encode(randomBytes);
}

/** Hash the PKCE code verifier to get the code_challenge, using S256. */
async function getCodeChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(verifier)
  );
  return base64url.encode(new Uint8Array(digest));
}

/**
 * Build the authorization URL to which the user should be redirected to start
 * the authn flow.
 *
 * Also returns the PKCE code verifier, which will be needed for token
 * retrieval and should be stored in `sessionStorage` (which will keep it local
 * to this browser tab).
 */
export async function getAuthorizeUrlAndVerifier(
  c: OIDCConfig
): Promise<{ url: string; codeVerifier: string }> {
  const codeVerifier = makeCodeVerifier();
  const codeChallenge = await getCodeChallenge(codeVerifier);
  const url = new URL(c.authorization_endpoint);
  // For testing against the Google API
  let clientId = getConfigValue('client_id');
  if (clientId) {
    url.searchParams.set("client_id", clientId);
  }
  url.searchParams.set("redirect_uri", serverConfig.redirect_uri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("response_mode", "query");
  url.searchParams.set("code_challenge", codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("scope", getConfigValue('scope') ?? 'openid');
  return { url: url.toString(), codeVerifier };
}

/** Validates a retrieved JSON document as a token endpoint response. */
const tokenResponseSchema = joi
  .object({
    id_token: joi
      .string()
      .regex(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/)
      .required(),
  })
  .unknown(true);

/** Retrieve and validate the ID token from the OIDC server.
 *
 * Takes the OIDC config, the authorization code (provided in the URL when the
 * user was redirected back to our app), and the PKCE code verifier that was
 * generated for this flow.
 *
 * Attempts to exchange the code with the server to get an ID token, which is
 * then extracted from the response, coarsely validated as a JWT, and
 * returned as a string. If any part of this fails, the returned Promise will
 * reject, and its likely there will also be an associated conformance check
 * failure output to the UI.
 */
export async function getToken(
  c: OIDCConfig,
  code: string,
  codeVerifier: string
): Promise<string> {
  const form = new URLSearchParams();
  // For testing against the Google API
  let clientId = getConfigValue('client_id');
  if (clientId) {
    form.set("client_id", clientId);
  }
  // Ditto.
  let clientSecret = getConfigValue('client_secret');
  if (clientSecret) {
    form.set("client_secret", clientSecret);
  }
  form.set("code", code);
  form.set("code_verifier", codeVerifier);
  form.set("grant_type", "authorization_code");
  form.set("redirect_uri", serverConfig.redirect_uri);

  const tokenRequest = {
    method: "POST",
    body: form,
    headers: {
      accept: "application/json",
      "content-type": "application/x-www-form-urlencoded",
    },
  };

  const body = await attempt(async () => {
    const response = await assertOk(
      fetch(c.token_endpoint, tokenRequest),
      "Token endpoint"
    );
    return response.json();
  }, "Token endpoint returns a JSON response");

  validate(
    body,
    tokenResponseSchema,
    "Token JSON contains id_token, and the token looks like a JWT"
  );

  return body.id_token;
}

/**
 * Verify a JWT against the OpenID Connect server's configuration and published
 * JSON Web Key set.
 *
 * The returned Promise will reject if verification fails and a conformance
 * check will be logged. If verification passes, the token information will be
 * returned as an object with `payload` and `protectedHeader` attributes.
 */
export async function verifyIdToken(
  oidcConfig: OIDCConfig,
  jwks: JWTVerifyGetKey,
  idToken: string
): Promise<JWTVerifyResult> {
  return attempt(async () => {
    const claims: { [key: string]: string } = {};
    if (oidcConfig.issuer) claims.issuer = oidcConfig.issuer;
    return jwtVerify(idToken, jwks, claims);
  }, "ID Token passes JWT verification");
}
