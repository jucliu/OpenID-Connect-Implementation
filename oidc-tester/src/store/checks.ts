/** Redux slice definition for conformance checks. */
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface Check {
  description: string;
  pass: boolean;
  details?: string;
}

const initialState: { checks: Check[] } = { checks: [] };

export const checksSlice = createSlice({
  name: "checks",
  initialState,
  reducers: {
    logCheck: (state, action: PayloadAction<Check>) => {
      const check = action.payload;
      console.log(
        `${check.pass ? "🟩" : "🟥"} ${check.description}` +
          (check.details != null ? `\n  ${check.details}` : "")
      );
      state.checks = [...state.checks, action.payload];
    },
  },
});

export const { logCheck } = checksSlice.actions;

export default checksSlice.reducer;
