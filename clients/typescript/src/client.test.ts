import assert from "node:assert/strict";
import test from "node:test";

import { Client } from "./client.ts";

test("decodeHealth is a pure function of the response body", () => {
  const client = new Client({
    baseUrl: "https://flags.example",
    maxResponseBytes: 64 * 1024,
  });
  const body = new TextEncoder().encode('{"ok":true,"service":"flags-2-env"}');
  assert.deepEqual(client.decodeHealth(body), {
    ok: true,
    service: "flags-2-env",
  });
  assert.deepEqual(client.decodeHealth(body), {
    ok: true,
    service: "flags-2-env",
  });
});
