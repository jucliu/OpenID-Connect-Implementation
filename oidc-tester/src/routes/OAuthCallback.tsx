/**
 * The OAuth/OIDC callback page. If authorization proceeds and is valid, this
 * will redirect back to the home page, having set the ID token in the Redux
 * store. If authorization fails, this page stays on-screen and renders the
 * error(s).
 */
import { Button, Typography } from "@mui/material";
import joi from "joi";
import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { check } from "../checks";
import Card from "../components/Card";
import { useDispatch, useSelector } from "../hooks";
import { getToken } from "../store";

// Matches all printable ASCII chars.
// See: https://datatracker.ietf.org/doc/html/rfc6749#appendix-A.11
const codeValidator = joi.string().regex(/^[ -~]+$/);

export default function OAuthCallback() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const oidcState = useSelector((state) => state.oidc);
  const [searchParams] = useSearchParams();

  const code = searchParams.get("code");
  const codeVerifier = sessionStorage.getItem("codeVerifier");
  const oidcConfig = oidcState.config;

  useEffect(() => {
    const codeValid = codeValidator.validate(code);
    check(
      codeValid.error == null,
      "Auth server passes valid code back to application in URL params",
      codeValid.error?.message
    );
  }, [code]);

  useEffect(() => {
    if (!codeVerifier) {
      // This would actually be a bug in our application, or indicative that
      // the user is trying to navigate directly to the callback page without
      // initiating the flow in the same browser tab.
      throw new Error(
        "Expected code verifier to be present in session storage"
      );
    }
    if (!code || !oidcConfig) return;

    dispatch(getToken({ code, codeVerifier }));
  }, [dispatch, code, codeVerifier, oidcConfig]);

  useEffect(() => {
    if (oidcState.tokenStatus === "loaded") {
      navigate("/");
    }
  }, [navigate, oidcState.tokenStatus]);

  return (
    <Card title="OAuth Callback">
      {oidcState.tokenStatus === "loading" && (
        <Typography>Loading token...</Typography>
      )}
      {oidcState.tokenStatus === "error" && (
        <>
          <Typography>Error fetching token.</Typography>
          <Button variant="outlined" onClick={() => navigate("/")}>
            Back to home page
          </Button>
        </>
      )}
    </Card>
  );
}
