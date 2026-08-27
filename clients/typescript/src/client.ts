import type { ClientConfig } from "./config.ts";
import { ClientError } from "./errors.ts";
import type { Health } from "./types.ts";

export class Client {
  private readonly config: ClientConfig;

  constructor(config: ClientConfig) {
    if (!config.baseUrl.trim()) {
      throw new ClientError("invalid_base");
    }
    this.config = config;
  }

  healthUrl(): string {
    return `${this.config.baseUrl.replace(/\/$/, "")}/v1/health`;
  }

  decodeHealth(body: Uint8Array): Health {
    if (body.byteLength > this.config.maxResponseBytes) {
      throw new ClientError("too_large");
    }
    try {
      return JSON.parse(new TextDecoder().decode(body)) as Health;
    } catch {
      throw new ClientError("invalid_json");
    }
  }
}
