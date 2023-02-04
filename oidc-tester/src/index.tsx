/**
 * The main entry point of the application. Sets up initial OIDC requests, the
 * Redux store, and React Router paths.
 */
import React from "react";
import ReactDOM from "react-dom";
import { Provider } from "react-redux";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import App from "./App";
import "./index.css";
import Home from "./routes/Home";
import OAuthCallback from "./routes/OAuthCallback";
import store from "./store";
import { fetchConfig, fetchJWKS } from "./store/oidc";

// Fetch the OIDC config immediately on load.
store.dispatch(fetchConfig());

// Fetch the JWKS as soon as the OIDC config is available (we need to wait
// because the JWKS URI is specified in the OIDC config).
const unsubscribeFetchJWKS = store.subscribe(() => {
  const state = store.getState();
  if (state.oidc.config != null && state.oidc.jwks == null) {
    setTimeout(() => store.dispatch(fetchJWKS()), 0);
    unsubscribeFetchJWKS();
  }
});

ReactDOM.render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<App />}>
            <Route path="oauth/callback" element={<OAuthCallback />} />
            <Route path="" element={<Home />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </Provider>
  </React.StrictMode>,
  document.getElementById("root")
);
