/** Renders the conformance checks as they run (see src/checks.ts) */
import { Paper, styled } from "@mui/material";
import { useSelector } from "../hooks";
import { Check } from "../store/checks";
import Card from "./Card";
import Code from "./Code";

export default function Checks() {
  const checks = useSelector((state) => state.checks.checks);

  return (
    <Card title="Checks">
      {[...checks].reverse().map((check) => {
        return <CheckDisplay key={JSON.stringify(check)} check={check} />;
      })}
    </Card>
  );
}

const CheckDescription = styled("p")(({ theme }) => ({
  ...theme.typography.body2,
  marginTop: 0,
  marginBottom: 0,
}));

const CheckStatus = styled("span")({
  fontWeight: "bold",
});

function CheckDisplay({ check }: { check: Check }) {
  const color = check.pass ? "success.dark" : "error.dark";

  return (
    <Paper
      elevation={2}
      sx={{ padding: 1, borderLeft: 15, borderLeftColor: color }}
    >
      <CheckDescription>
        <CheckStatus>{check.pass ? "PASS" : "FAIL"}:</CheckStatus>{" "}
        {check.description}
      </CheckDescription>
      {check.details != null && <Code>{check.details}</Code>}
    </Paper>
  );
}
