export class ClientError extends Error {
  readonly code: "invalid_base" | "empty_token" | "http" | "too_large" | "invalid_json";

  constructor(code: "invalid_base" | "empty_token" | "http" | "too_large" | "invalid_json") {
    super(code);
    this.name = "ClientError";
    this.code = code;
  }
}
