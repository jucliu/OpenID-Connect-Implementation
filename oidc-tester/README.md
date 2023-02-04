# OpenID Connect Tester

This is a small web app to test the conformance of a minimal OpenID Connect
authorization server, using the OAuth 2.0 + PKCE flow, and retrieving and
verifying a JWT identity token.

## Configuration

**REQUIRED**

You need to create a file under `src/oidc-config.json` that looks like the
following:

```js
{
    "redirect_uri": "http://localhost:3000/oauth/callback",  // change this if you run this app on a different port
    "oidc_server": "http://localhost:<PORT>/"  // should be the port your OpenID Connect server is listening on
}
```

This path is conveniently `.gitignore`d so that you don't accidentally check it
in.

## Running and Building

### Docker

Docker is the preferred method for running the tester against an OIDC identity
provider.

Build the docker image, tagging it with a name (we use `oidc-tester`):

```bash
$ docker build -t oidc-tester .
```

And then run that image on a container, publishing port 3000:

```bash
$ docker run -p 3000:3000 oidc-tester
```

Note that it may take a while for webpack to complete compilation, but once you
see the message `Compiled successfully!` you'll be good to go. Open
[localhost:3000](http://localhost:3000) to access the tester application.

### Local Node

Running locally allows for auto-reloading triggered by file changes; use this
method when developing the tester application itself

In the project directory, run:

```bash
$ npm install
$ npm start
```

This will run the app in development mode, and open a browser window. When you
make edits, the page will reload, and any lint errors will be reported in the
terminal.

### Running on a different port

The default is to run on port 3000; to use another port when running on a local
Node, specify a `PORT` environment variable as follows, but **remember to
update src/oidc-config.json** so that the `redirect_uri` reflects the correct
port number:

```bash
$ PORT=3006 npm start
```

For Docker, you still need to update the `redirect_uri` config value, and then
re-build the image to pick up the config change. Then, rather than setting an
environment variable, just publish the container's port 3000 as the desired
port on the host:

```bash
$ docker build -t oidc-tester .
$ docker run -p 3006:3000
```

## How to read this code

The bulk of the OpenID connect operations are implemented in `src/oidc.ts`.
What follows is a guide to the important functions contained therein, their
output, and the expected behavior of the authorization server.

### `getOidcConfig()`

**Params:** none, but uses the `oidc_server` config key.

**Returns:** a `Promise` of a valid OpenID Connect configuration

**Throws:** if the configuration could not be retrieved, or is invalid

Retrieves and validates the OIDC config JSON from the server specified in the
`oidc_server` configuration parameter. This is always assumed to exist at
the path `/.well-known/openid-configuration`.

### `getJWKS()`

**Params:**: the OIDC config fetched by `getOidcConfig()`

**Returns:** a `Promise<{ keys: JWK[] }>`

**Throws:** if the JWKS could not be fetched, or is invalid

This fetches the JSON Web Key Set (abbreviated JWKS) from the URL specified in
the `jwks_uri` key of the OIDC config. It ensures that it is a JSON object
matching the following schema:

```json
{
    "keys": [
        {
            "kty": "EC" | "RSA" | ...
            ...other fields...
        },
        ...other keys...
    ]
}
```

Your application only needs to return one key here, and it should be a
signing/verifying key, such as an EC (Elliptic Curve) or RSA key. The easiest
thing to do is:

* Go to <https://jwkeygen.io/>
* Generate a key with the following parameters:
  * Use: Sign
  * Type: Asymmetric
  * Algorithm: ECDSA
  * Elliptic curve: P-256
  * Include Key ID?: Yes
* Save the public and private keys in JWK (i.e. JSON) format.
* Return the public key as the only value in the `"keys"` field of your JWKS.
* Keep the private key secret (to your server), and use it to sign your
  returned JSON Web Tokens (JWTs).

### `getAuthorizeUrlAndVerifier()`

**Params:**: the OIDC config fetched by `getOidcConfig()`

**Returns:** `{ url: '<AUTHORIZATION_ENDPOINT>?params...', codeVerifier: 'abc123...' }`

Builds an authorization URL to redirect the user to, which will begin the
OAuth/OIDC flow. This uses the `authorization_endpoint` key from the OIDC
config, and adds a number of parameters as URL query params (i.e.
`?param1=foo&param2=bar&...`).

It also generates a random PKCE code verifier, putting its hash in the
authorization URL (as `code_challenge`), and returning the original verifier
string in its return value. Callers of this function should save that returned
code verifier to [session storage][], and should send it back with the token
request (see `getToken()` below). This step is used by the authorization server
to verify that the client that generated this request is the same client trying
to obtain a token—even if an attacker were able to observe the requests back
and forth, they wouldn't be able to reconstruct the original code verifier
based on the challenge. Read more about PKCE [here][pkce].

The params added to the authorization URL are as follows:

* `client_id` - (optional) will only be present if specified in the config.
* `redirect_uri` - as specified in the config.
* `response_type` - will always be the string `'code'`.
* `response_mode` - will always be the string `'query'`.
* `code_challenge` - the base64url-encoded SHA-256 hash of the code verifier.
* `code_challenge_method` - will always be the string `'S256'`.
* `scope` - will always be the string `'openid'`.

[pkce]: https://dropbox.tech/developers/pkce--what-and-why-
[session storage]: https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage

### `getToken()`

**Params:**
* the OIDC config fetched by `getOidcConfig()`
* the `code` returned by the authorization server
* the previously-generated PKCE code verifier corresponding to this auth flow

**Returns:** A `Promise<string>` containing the serialized JWT from the token
endpoint's response (just the value of the `"id_token"` key, not the full
response)

**Throws:** If the token endpoint rejected the request, or returned an invalid
response

Exchanges the `code` from a successful authorization flow, along with the
stored PKCE code verifier, for a token response containing an ID token (as a
signed JWT). It will make a `POST` request to the `token_endpoint` from the
OIDC config, with a `Content-Type` of `application/x-www-form-urlencoded`
(meaning parameters are encoded in the same way as in the query params part of
a URL).

The fields set in the body of the request will be:

* `code` - the authorization code from the `redirect_uri` that the user was
  sent back to.
* `code_verifier` - the PKCE code verifier from the previous step. The
  authorization server should perform `base64url(sha256(code_verifier))` on
  this value and compare it to the `code_challenge` from the authorization URL,
  and reject the request if they don't match.
* `grant_type` - will always be the string `'authorization_code'`.
* `redirect_uri` - as specified in the config, and _should_ be the same value
  as was set in the authorization URL.

A successful response should look like the following, using the string
representation of the JWT:

```json
{
    "id_token": "xxxxx.yyyyy.zzzzz"
}
```

If the request is invalid, the authorization server should respond with an HTTP
400 status code, and provide error details in JSON format in the body like so:

```json
{
    "error": "invalid_request",
    "error_description": "A description of why the request failed"
}
```

**N.B.** the `"error_description"` field is optional (but nice to have).

### `verifyIdToken()`

**Params:**
* the OIDC config fetched by `getOidcConfig()`
* the JWKS fetched by `getJWKS()` (parsed by the JOSE library into an indexed
  form, which is done elsewhere in this codebase)
* the ID token string returned by `getToken()`

**Returns:** `Promise<{ payload: {...}, protectedHeader: {...} }>`

**Throws:** If the JWT token is invalid (format, failed signature, expired, etc.)

This will parse and verify the provided JSON Web Token string (in `.`-separated
base64url format), using the public key(s) provided at the JWKS URI. It will check:

* That the signature is valid, based on the public key(s) provided at the JWKS
  URI;
* That the `issuer` claim is present, and matches that specified in the OIDC
  config; and
* That the token is not expired, if an expiry is set on the token.
