/** The Redux store for the application. */
import { configureStore } from "@reduxjs/toolkit";
import checksReducer from "./checks";
import oidcReducer from "./oidc";

const store = configureStore({
  reducer: {
    oidc: oidcReducer,
    checks: checksReducer,
  },
});

export default store;

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export { logCheck } from "./checks";
export { authorize, fetchConfig, getToken, logOut } from "./oidc";
