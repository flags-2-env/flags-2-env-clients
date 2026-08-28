import { ClientError } from "./errors.ts";
import { load as loadServiceEnv } from "./env/env.ts";

export interface ClientConfig {
  baseUrl: string;
  bearerToken?: string;
  maxResponseBytes: number;
}

/** Build config from an explicit env map. Process env is the caller's effect. */
export function configFromEnv(
  env: Record<string, string | undefined>,
): ClientConfig {
  const overlay = loadServiceEnv(env);
  const baseUrl = overlay["FLAGS_2_ENV_API_BASE"]?.trim();
  if (!baseUrl) {
    throw new ClientError("invalid_base");
  }
  return {
    baseUrl,
    bearerToken: overlay["FLAGS_2_ENV_TOKEN"] || undefined,
    maxResponseBytes: 64 * 1024,
  };
}
