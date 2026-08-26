import { ClientError } from "./errors";

export interface ClientConfig {
  baseUrl: string;
  bearerToken?: string;
  maxResponseBytes: number;
}

export function configFromEnv(
  env: Record<string, string | undefined> = process.env,
): ClientConfig {
  const baseUrl = env["FLAGS_2_ENV_API_BASE"]?.trim();
  if (!baseUrl) {
    throw new ClientError("invalid_base");
  }
  return {
    baseUrl,
    bearerToken: env["FLAGS_2_ENV_TOKEN"] || undefined,
    maxResponseBytes: 64 * 1024,
  };
}

