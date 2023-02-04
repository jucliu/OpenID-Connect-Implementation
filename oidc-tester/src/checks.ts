/**
 * Helpers for conformance checks and assertions.
 *
 * The functions in this file all add conformance checks to the Redux store,
 * which are then rendered in the app, so the user can track the conformance of
 * their OpenID Connect auth server.
 */
import joi from "joi";
import store, { logCheck } from "./store";

/** Log the result of a conformance check, returning the pass/fail value. */
export function check(
  condition: boolean,
  description: string,
  details?: string
): boolean {
  store.dispatch(logCheck({ pass: condition, description, details }));
  return condition;
}

/**
 * Validate an object against a joi schema, throwing an error if it doesn't
 * match, and logging a conformance check either way. Also acts as a Typescript
 * type assertion, so that validated objects can be treated as the narrowed
 * types in subsequent code.
 */
export function validate<T>(
  obj: unknown,
  validator: joi.AnySchema<T>,
  description: string
): asserts obj is T {
  const valid = validator.validate(obj);
  store.dispatch(
    logCheck({
      pass: valid.error == null,
      description,
      details: valid.error?.message,
    })
  );
  if (valid.error != null) {
    throw new Error(
      `FAILED: ${description}` + valid.error?.message != null
        ? `\n${valid.error.message}`
        : ""
    );
  }
}

/**
 * Check that a fetch HTTP response is successful, throwing an error otherwise.
 *
 * IMPORTANT: Remember to `await` the result of this function, otherwise
 * execution will proceed and you'll get an error trying to read the response
 * body twice.
 *
 * This function doesn't log a conformance check, because that's typically
 * handled by a higher-level attempt() call.
 */
export async function assertOk(
  fetchCall: Promise<Response>,
  requestDescription: string
): Promise<Response> {
  const response = await fetchCall;
  if (response.ok) {
    return response;
  }
  const body = await response.text();
  throw new Error(
    `${requestDescription} failed with ${response.status}:\n${body}`
  );
}

/**
 * Attempt to execute a function, logging a conformance check when it (or a
 * promise it returns) fails/passes.
 */
export function attempt<T>(
  func: () => T,
  description: string,
  details?: (err: any) => string
) {
  const getDetails = (e: any) => {
    if (details != null) {
      return { details: details(e) };
    } else if (
      e instanceof Error ||
      ("message" in e && typeof e.message === "string")
    ) {
      return { details: e.message };
    } else {
      return {};
    }
  };

  let result: T;
  try {
    result = func();
  } catch (e) {
    store.dispatch(logCheck({ pass: false, description, ...getDetails(e) }));
    throw e;
  }

  if (result instanceof Promise) {
    return result
      .then((value) => {
        store.dispatch(logCheck({ pass: true, description }));
        return value;
      })
      .catch((err) => {
        store.dispatch(
          logCheck({ pass: false, description, ...getDetails(err) })
        );
        return Promise.reject(err);
      });
  } else {
    return result;
  }
}
