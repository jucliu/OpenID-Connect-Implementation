/**
 * Redux slice/reducers definition for tracking OpenID Connect authn flow
 * state. Also exports a number of memoized selectors that can be used to
 * retrieve flow state and the actual config, key set and token string once
 * obtained.
 */
import {
  createAsyncThunk,
  createSelector,
  createSlice,
} from "@reduxjs/toolkit";
import { createLocalJWKSet, JSONWebKeySet } from "jose";
import { RootState } from ".";
import {
  getAuthorizeUrlAndVerifier,
  getJWKS,
  getOidcConfig,
  getToken as getOidcToken,
  OIDCConfig,
} from "../oidc";

interface OIDCState {
  configStatus: null | "loading" | "loaded" | "error";
  config?: OIDCConfig;
  jwksStatus: null | "loading" | "loaded" | "error";
  jwks?: JSONWebKeySet;
  tokenStatus: null | "loading" | "loaded" | "error";
  token?: string;
}

const initialState: OIDCState = {
  configStatus: null,
  jwksStatus: null,
  tokenStatus: null,
};

export const fetchConfig = createAsyncThunk("oidc/fetchConfig", async () => {
  return getOidcConfig();
});

export const fetchJWKS = createAsyncThunk(
  "oidc/fetchJWKS",
  async (_, thunkAPI) => {
    const oidcConfig = (thunkAPI.getState() as RootState).oidc.config;
    if (!oidcConfig) {
      throw new Error(
        "oidc/fetchJWKS was called before OIDC config was fetched"
      );
    }
    return getJWKS(oidcConfig);
  }
);

export const authorize = createAsyncThunk(
  "oidc/authorize",
  async (_, thunkAPI) => {
    const oidcConfig = (thunkAPI.getState() as RootState).oidc.config;
    if (!oidcConfig) {
      throw new Error(
        "oidc/authorize was called before OIDC config was fetched"
      );
    }
    const { url, codeVerifier } = await getAuthorizeUrlAndVerifier(oidcConfig);
    window.sessionStorage.setItem("codeVerifier", codeVerifier);
    window.location.href = url;
    return Promise.resolve(undefined);
  }
);

export const getToken = createAsyncThunk(
  "oidc/getToken",
  async (arg: { code: string; codeVerifier: string }, thunkAPI) => {
    const oidcConfig = (thunkAPI.getState() as RootState).oidc.config;
    if (!oidcConfig) {
      throw new Error(
        "oidc/getToken was called before OIDC config was fetched"
      );
    }
    const token = await getOidcToken(oidcConfig, arg.code, arg.codeVerifier);
    if (!token) {
      throw new Error("Couldn't get ID token");
    }
    return token;
  }
);

export const oidcSlice = createSlice({
  name: "oidc",
  initialState,
  reducers: {
    logOut: (state) => {
      state.tokenStatus = null;
      delete state.token;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchConfig.pending, (state) => {
      state.configStatus = "loading";
    });
    builder.addCase(fetchConfig.rejected, (state) => {
      state.configStatus = "error";
      delete state.config;
    });
    builder.addCase(fetchConfig.fulfilled, (state, action) => {
      if (action.payload == null) {
        state.configStatus = "error";
        delete state.config;
      } else {
        state.configStatus = "loaded";
        state.config = action.payload;
      }
    });
    builder.addCase(fetchJWKS.pending, (state) => {
      state.jwksStatus = "loading";
    });
    builder.addCase(fetchJWKS.fulfilled, (state, action) => {
      if (action.payload == null) {
        state.jwksStatus = "error";
        delete state.jwks;
      } else {
        state.jwksStatus = "loaded";
        state.jwks = action.payload;
      }
    });
    builder.addCase(fetchJWKS.rejected, (state) => {
      state.jwksStatus = "error";
      delete state.jwks;
    });
    builder.addCase(getToken.pending, (state) => {
      state.tokenStatus = "loading";
    });
    builder.addCase(getToken.rejected, (state) => {
      state.tokenStatus = "error";
      delete state.token;
    });
    builder.addCase(getToken.fulfilled, (state, action) => {
      state.tokenStatus = "loaded";
      state.token = action.payload;
    });
  },
});

export const { logOut } = oidcSlice.actions;

const selectOIDC = createSelector(
  [(state: { oidc: OIDCState }) => state.oidc],
  (oidc) => oidc
);

export const selectCanLogIn = createSelector(
  [selectOIDC],
  (oidc) => oidc.configStatus === "loaded" && oidc.config != null
);

export const selectOIDCConfig = createSelector(
  [selectOIDC],
  (oidc) => oidc.config
);

export const selectCanVerify = createSelector(
  [selectOIDC],
  (oidc) =>
    oidc.configStatus === "loaded" &&
    oidc.jwksStatus === "loaded" &&
    oidc.config != null &&
    oidc.jwks != null
);

export const selectJWKS = createSelector(
  [selectOIDC, selectCanVerify],
  (oidc, canVerify) => (canVerify ? createLocalJWKSet(oidc.jwks!) : undefined)
);

export const selectIdToken = createSelector([selectOIDC], (oidc) => oidc.token);

export default oidcSlice.reducer;
