/** A styled <pre> that renders blocks of monospace text. */
import { styled } from "@mui/material";

export default styled("pre")(({ theme }) => ({
  ...theme.typography.body2,
  fontFamily: ["ui-monospace", "monospace"],
  whiteSpace: "pre",
  padding: theme.spacing(1),
  marginTop: theme.spacing(1),
  marginBottom: 0,
}));
