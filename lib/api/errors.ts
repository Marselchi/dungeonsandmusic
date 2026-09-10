import type { ApiErrorCode } from "./types";

export class ApiError extends Error {
  readonly code: ApiErrorCode | string;
  readonly status: number;

  constructor(status: number, code: ApiErrorCode | string, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

/** Thrown when the backend can't be reached at all (offline, wrong URL, CORS, etc). */
export class BackendUnreachableError extends Error {
  constructor(cause: unknown) {
    super("Could not reach the backend. Check the backend URL and that it's running.");
    this.name = "BackendUnreachableError";
    this.cause = cause;
  }
}
