/**
 * Typed variants of common Redux hooks, for strongly-typed use of the Redux
 * store.
 */
import {
  TypedUseSelectorHook,
  useDispatch as untypedUseDispatch,
  useSelector as untypedUseSelector,
} from "react-redux";
import type { AppDispatch, RootState } from "./store";

// Use these throughout the app instead of Redux's `useDispatch` and `useSelector`
export const useDispatch = () => untypedUseDispatch<AppDispatch>();
export const useSelector: TypedUseSelectorHook<RootState> = untypedUseSelector;
