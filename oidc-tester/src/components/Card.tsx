/**
 * A simple card component, with an optional title, which places its children
 * in a vertical stack.
 */
import { Paper, Stack, Typography } from "@mui/material";

export default function Card(props: {
  children: any;
  elevation?: number;
  title?: string;
}) {
  const { children, elevation, title } = { elevation: 1, ...props };
  return (
    <Paper elevation={elevation}>
      <Stack spacing={2} sx={{ padding: 2 }}>
        {title && (
          <Typography variant="h6" component="h2">
            {title}
          </Typography>
        )}
        {children}
      </Stack>
    </Paper>
  );
}
