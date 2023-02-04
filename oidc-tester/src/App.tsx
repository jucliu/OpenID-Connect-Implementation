/**
 * The main app container. Renders the title, the currently routed page, and
 * the conformance checks.
 */
import { Container, Stack, Typography } from "@mui/material";
import { Outlet } from "react-router-dom";
import Checks from "./components/Checks";

function App() {
  return (
    <Container maxWidth="md">
      <Stack spacing={4}>
        <Typography variant="h4" component="h1" sx={{ paddingBottom: 0 }}>
          OpenID Connect Tester
        </Typography>

        <Outlet />

        <Checks />
      </Stack>
    </Container>
  );
}

export default App;
