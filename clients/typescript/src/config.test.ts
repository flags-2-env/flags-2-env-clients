import assert from "node:assert/strict";
import test from "node:test";

import { configFromEnv } from "./config.ts";
import { ClientError } from "./errors.ts";

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
      assert.ok(error instanceof ClientError);
      assert.equal(error.code, "invalid_base");
      return true;
    });
  } finally {
    if (previous === undefined) delete process.env.FLAGS_2_ENV_API_BASE;
    else process.env.FLAGS_2_ENV_API_BASE = previous;
  }
});
