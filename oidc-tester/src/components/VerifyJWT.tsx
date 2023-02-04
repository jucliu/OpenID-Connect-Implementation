/**
 * Verifies the ID token in the Redux store, rendering its contents as a Card
 * if successful. Verification failures will be output in the details of a
 * failed conformance check (see verifyIdToken in src/oidc.ts).
 */
import { Typography } from "@mui/material";
import { JWTVerifyResult } from "jose";
import { useEffect, useState } from "react";
import { useSelector } from "../hooks";
import { verifyIdToken } from "../oidc";
import { selectIdToken, selectJWKS, selectOIDCConfig } from "../store/oidc";
import Card from "./Card";
import JSONObject from "./JSONObject";

export default function VerifyJWT() {
  const oidcConfig = useSelector(selectOIDCConfig);
  const jwks = useSelector(selectJWKS);
  const idToken = useSelector(selectIdToken);

  const [verifiedToken, setVerifiedToken] = useState<
    JWTVerifyResult | undefined
  >();

  useEffect(() => {
    if (oidcConfig != null && jwks != null && idToken != null) {
      verifyIdToken(oidcConfig, jwks, idToken)
        .then((verified) => {
          setVerifiedToken({
            payload: verified.payload,
            protectedHeader: verified.protectedHeader,
          });
        })
        .catch((err) => {
          setVerifiedToken(undefined);
          console.error(err);
        });
    }
  }, [oidcConfig, jwks, idToken]);

  return (
    <>
      {verifiedToken && (
        <Card>
          <Typography variant="h6" component="h2">
            JWT Token
          </Typography>
          <JSONObject obj={verifiedToken} />
        </Card>
      )}
    </>
  );
}
