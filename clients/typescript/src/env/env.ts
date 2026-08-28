/* src/env/env.ts — service overlay. Edit defaults here; regenerate generated.ts from flags-2-env. */

import * as generated from "./generated.ts";

const defaults: Record<string, string> = {};

export default {
  get env(): Record<string, string> {
    return load();
  },
};

export function load(
  shell: Record<string, string | undefined> = typeof process !== "undefined" ? process.env : {},
): Record<string, string> {
  const env = Object.assign({}, defaults, generated.loadEnvMapFromOs(shell));
  env["FLAGS_2_ENV_API_BASE"] = generated.requireEnv(
    "FLAGS_2_ENV_API_BASE",
    "string",
    ["http://127.0.0.1:8080", "https://api.flags2env.example"],
    env["FLAGS_2_ENV_API_BASE"],
  );
  return env;
}

export { generated };
