import assert from "node:assert/strict";
import test from "node:test";

import { configFromEnv } from "./config.ts";

test("configFromEnv reads only the supplied map", () => {
  const previous = process.env.FLAGS_2_ENV_API_BASE;
  process.env.FLAGS_2_ENV_API_BASE = "https://process.example";
  try {
    const config = configFromEnv({
      FLAGS_2_ENV_API_BASE: "https://flags.example",
      FLAGS_2_ENV_TOKEN: "secret",
    });
    assert.equal(config.baseUrl, "https://flags.example");
    assert.equal(config.bearerToken, "secret");
    assert.throws(() => configFromEnv({}), (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.match(
        error.message,
        /missing required environment variable FLAGS_2_ENV_API_BASE/,
      );
      assert.match(error.message, /expected type: string/);
      assert.match(error.message, /http:\/\/127\.0\.0\.1:8080/);
      return true;
    });
  } finally {
    if (previous === undefined) delete process.env.FLAGS_2_ENV_API_BASE;
    else process.env.FLAGS_2_ENV_API_BASE = previous;
  }
});
