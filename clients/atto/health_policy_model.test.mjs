import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('./health_policy.atto', import.meta.url), 'utf8');
const manifest = JSON.parse(readFileSync(new URL('./manifest.json', import.meta.url), 'utf8'));
const compact = source.replace(/\s+/g, ' ');

function canAcceptHealth(status, transportOk, withinBudget, decodedJson, healthOk, serviceNonempty) {
  return status === 200 && transportOk && withinBudget && decodedJson && healthOk && serviceNonempty;
}

function canForwardBearer(tokenRequested, tokenNonempty, transportSecure, sameOrigin) {
  return tokenRequested && tokenNonempty && transportSecure && sameOrigin;
}

test('source keeps the audited fail-closed boolean expressions', () => {
  assert.match(source, /define module flags_2_env_client as/);
  assert.ok(compact.includes('return status == 200 && transport_ok && within_response_budget && decoded_json && health_ok && service_nonempty;'));
  assert.ok(compact.includes('return token_requested && token_nonempty && transport_secure && same_origin;'));
  assert.match(source, /pub fnc self_check\(\): bool/);
});

test('the experimental manifest does not claim a released SDK or compiler proof', () => {
  assert.equal(manifest.contract, 'flags-2-env/attolang-client-policy/v1');
  assert.equal(manifest.source_extension, '.atto');
  assert.equal(manifest.status, 'experimental-source-only');
  assert.equal(manifest.runtime_verified, false);
  assert.equal(manifest.http_transport_implemented, false);
  assert.equal(manifest.json_decoder_implemented, false);
  assert.equal(manifest.compiler_backend_verified, false);
});

test('health admission is fail-closed across 160 decision cases', () => {
  let cases = 0, accepted = 0;
  for (const status of [0, 199, 200, 201, 401]) {
    for (let mask = 0; mask < 32; mask += 1) {
      const bits = Array.from({ length: 5 }, (_, i) => Boolean(mask & (1 << i)));
      const actual = canAcceptHealth(status, ...bits);
      assert.equal(actual, status === 200 && mask === 31, `status=${status} mask=${mask}`);
      cases += 1;
      if (actual) accepted += 1;
    }
  }
  assert.equal(cases, 160);
  assert.equal(accepted, 1);
  assert.equal(canAcceptHealth(201, true, true, true, true, true), false);
});

test('bearer forwarding is fail-closed across all 16 boolean inputs', () => {
  for (let mask = 0; mask < 16; mask += 1) {
    const bits = Array.from({ length: 4 }, (_, i) => Boolean(mask & (1 << i)));
    assert.equal(canForwardBearer(...bits), mask === 15, `mask=${mask}`);
  }
  assert.equal(canForwardBearer(true, true, false, true), false);
  assert.equal(canForwardBearer(true, true, true, false), false);
});
