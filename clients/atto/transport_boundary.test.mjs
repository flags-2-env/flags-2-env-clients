import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {HealthContractError, healthUrl, mayIssueRequest, mayAcceptResponse,
  readBounded, fetchHealthReference} from './host_reference.mjs';
const source = readFileSync(new URL('./transport_boundary.atto', import.meta.url), 'utf8')
  .replace(/\s+/g, ' ');
function body(...buffers) {
  return (async function* () { for (const value of buffers) yield Buffer.from(value); })();
}
function mockResponse(payload, status = 200) {
  return {status, redirected: false, body: body(Buffer.from(payload))};
}
async function expectCode(promise, code) {
  await assert.rejects(promise, e => e instanceof HealthContractError && e.code === code);
}
test('Atto source matches host predicates', () => {
  assert.match(source, /define module flags_2_env_transport_boundary as/);
  assert.ok(source.includes('return capability_live && https_only && hostname_valid && same_origin && bearer_safe;'));
  assert.ok(source.includes('return transport_ok && status == 200 && body_bytes >= 0 && byte_budget > 0 && body_bytes <= byte_budget && no_redirect && json_shape_valid && protocol_supported;'));
});
test('all 32 request bitmasks', () => {
  for (let mask = 0; mask < 32; mask++) {
    assert.equal(mayIssueRequest({capabilityLive: !!(mask & 1), httpsOnly: !!(mask & 2),
      hostnameValid: !!(mask & 4), sameOrigin: !!(mask & 8), bearerSafe: !!(mask & 16)}), mask === 31);
  }
});
test('768 response combinations', () => {
  for (const status of [199,200,201,301])
    for (const byteBudget of [-1,0,8])
      for (const bodyBytes of [-1,0,8,9])
        for (let mask = 0; mask < 16; mask++) {
          assert.equal(mayAcceptResponse({transportOk: !!(mask & 1), status, bodyBytes, byteBudget,
            noRedirect: !!(mask & 2), jsonShapeValid: !!(mask & 4),
            protocolSupported: !!(mask & 8)}),
            status === 200 && byteBudget > 0 && bodyBytes >= 0 && bodyBytes <= byteBudget && mask === 15);
        }
});
test('origin validation rejects insecure schemes and injected credentials', () => {
  assert.equal(healthUrl('https://api.example/base').href, 'https://api.example/v1/health');
  for (const bad of ['http://api.example','ftp://api.example','https://u:p@api.example',
    'https://api.example?token=x','https://api.example/#part','not a URL']) {
    assert.throws(() => healthUrl(bad), e => e.code === 'INVALID_ORIGIN');
  }
});
test('bounded reader rejects over-budget streams', async () => {
  assert.equal((await readBounded(body('ab','cd'),4)).toString(), 'abcd');
  await expectCode(readBounded(body('abcde'),4), 'RESPONSE_TOO_LARGE');
  await expectCode(readBounded(body('a'),0), 'INVALID_BUDGET');
  await expectCode(readBounded('text',4), 'INVALID_BODY');
});
test('reference transport guards status JSON version auth and redirects', async () => {
  const good = JSON.stringify({ok:true, service:'flags2env', protocol:'1'});
  const transport = async ({url,redirect,headers}) => {
    assert.equal(url,'https://example.com/v1/health');
    assert.equal(redirect,'manual');
    assert.deepEqual(headers,{authorization:'Bearer test-only'});
    return mockResponse(good);
  };
  assert.deepEqual(await fetchHealthReference({baseUrl:'https://example.com',transport,
    capabilityLive:true,bearerToken:'test-only'}), {ok:true,service:'flags2env',protocol:'1'});
  await expectCode(fetchHealthReference({baseUrl:'https://example.com',transport,
    capabilityLive:false}), 'CAPABILITY_DENIED');
  for (const token of ['   ', 'abc\r\nInjected: true', 'hello world', '🔥']) {
    await expectCode(fetchHealthReference({baseUrl:'https://example.com',transport,
      capabilityLive:true,bearerToken:token}), 'INVALID_TOKEN');
  }
  await expectCode(fetchHealthReference({baseUrl:'https://example.com',
    transport:async()=>mockResponse(good,401),capabilityLive:true}), 'HTTP_STATUS');
  await expectCode(fetchHealthReference({baseUrl:'https://example.com',
    transport:async()=>mockResponse('{'),capabilityLive:true}), 'INVALID_JSON');
  await expectCode(fetchHealthReference({baseUrl:'https://example.com',
    transport:async()=>mockResponse(JSON.stringify({ok:true,service:'s',protocol:'2'})),
    capabilityLive:true}), 'INVALID_HEALTH');
  await expectCode(fetchHealthReference({baseUrl:'https://example.com',
    transport:async()=>({status:302,redirected:true,body:body('x')}),
    capabilityLive:true}), 'REDIRECT_DENIED');
  await expectCode(fetchHealthReference({baseUrl:'https://example.com',
    transport:async()=>mockResponse(good),capabilityLive:true,maxBytes:4}), 'RESPONSE_TOO_LARGE');
  await expectCode(fetchHealthReference({baseUrl:'https://example.com',
    transport:async()=>{throw Error('offline');},capabilityLive:true}), 'TRANSPORT_FAILURE');
  await expectCode(fetchHealthReference({baseUrl:'https://example.com',
    transport:async()=>({status:200,redirected:false,body:body(Buffer.from([0xff]))}),
    capabilityLive:true}), 'INVALID_JSON');
});
