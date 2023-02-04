/**
 * The 'home' page that allows login/logout, displays authn status, and
 * renders the ID token once verified.
 */
import { Button, Typography } from "@mui/material";
import Card from "../components/Card";
import VerifyJWT from "../components/VerifyJWT";
import { useDispatch, useSelector } from "../hooks";
import { authorize, logOut } from "../store";
import { selectCanLogIn, selectIdToken } from "../store/oidc";

export default function Home() {
  const dispatch = useDispatch();
  const canLogIn = useSelector(selectCanLogIn);
  const idToken = useSelector(selectIdToken);
  const oidcState = useSelector((state) => state.oidc);

  // Start the authorization flow
  const logIn = () => {
    if (!canLogIn) return;
    dispatch(authorize());
  };

  // Clear the current ID token (if any)
  const doLogOut = () => {
    dispatch(logOut());
  };

  return (
    <>
      {oidcState.configStatus === "error" && (
        <Typography>Error loading OIDC config.</Typography>
      )}

      {oidcState.token == null && (
        <Card>
          <Typography>Logged out</Typography>
          <Button variant="contained" onClick={logIn}>
            Log In
          </Button>
        </Card>
      )}
      {idToken != null && (
        <>
          <Card>
            <Typography>Logged in!</Typography>
            <Button variant="contained" onClick={doLogOut}>
              Log Out
            </Button>
          </Card>

          <VerifyJWT />
        </>
      )}
    </>
  );
}
