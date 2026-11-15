// Test-only JavaScript reference for future AttoLang host transport integration.
// NOT an AttoLang SDK, runtime, compiler proof, or network implementation.
export class HealthContractError extends Error {
  constructor(code) { super(code); this.name = 'HealthContractError'; this.code = code; }
}
export function healthUrl(base) {
  let url;
  try { url = new URL(base); }
  catch { throw new HealthContractError('INVALID_ORIGIN'); }
  if (url.protocol !== 'https:' || !url.hostname || url.username || url.password ||
      url.search || url.hash) throw new HealthContractError('INVALID_ORIGIN');
  url.pathname = '/v1/health';
  url.search = '';
  url.hash = '';
  return url;
}
export function mayIssueRequest({capabilityLive, httpsOnly, hostnameValid, sameOrigin, bearerSafe}) {
  return capabilityLive && httpsOnly && hostnameValid && sameOrigin && bearerSafe;
}
export function mayAcceptResponse({transportOk, status, bodyBytes, byteBudget, noRedirect,
  jsonShapeValid, protocolSupported}) {
  return transportOk && status === 200 && Number.isSafeInteger(bodyBytes) &&
    bodyBytes >= 0 && Number.isSafeInteger(byteBudget) && byteBudget > 0 &&
    bodyBytes <= byteBudget && noRedirect && jsonShapeValid && protocolSupported;
}
export async function readBounded(body, byteBudget) {
  if (!Number.isSafeInteger(byteBudget) || byteBudget < 1 || byteBudget > 16 * 1024 * 1024)
    throw new HealthContractError('INVALID_BUDGET');
  if (body == null || typeof body[Symbol.asyncIterator] !== 'function')
    throw new HealthContractError('INVALID_BODY');
  const chunks = [];
  let total = 0;
  for await (const chunk of body) {
    if (!(chunk instanceof Uint8Array)) throw new HealthContractError('INVALID_BODY');
    if (chunk.byteLength > byteBudget - total) throw new HealthContractError('RESPONSE_TOO_LARGE');
    chunks.push(Buffer.from(chunk));
    total += chunk.byteLength;
  }
  return Buffer.concat(chunks, total);
}
export async function fetchHealthReference({baseUrl, transport, capabilityLive, bearerToken,
  maxBytes = 65536}) {
  const url = healthUrl(baseUrl);
  if (typeof transport !== 'function') throw new HealthContractError('NO_TRANSPORT');
  if (!capabilityLive) throw new HealthContractError('CAPABILITY_DENIED');
  if (bearerToken !== undefined && (typeof bearerToken !== 'string' ||
      !/^[A-Za-z0-9._~+\/-]+=*$/.test(bearerToken))) {
    throw new HealthContractError('INVALID_TOKEN');
  }
  if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0 || maxBytes > 16 * 1024 * 1024)
    throw new HealthContractError('INVALID_BUDGET');
  const headers = bearerToken === undefined ? {} : {authorization: 'Bearer ' + bearerToken};
  let response;
  try { response = await transport({url: url.href, headers, redirect: 'manual'}); }
  catch { throw new HealthContractError('TRANSPORT_FAILURE'); }
  if (!response || response.redirected || (response.status >= 300 && response.status <= 399))
    throw new HealthContractError('REDIRECT_DENIED');
  if (response.status !== 200) throw new HealthContractError('HTTP_STATUS');
  let bytes;
  try { bytes = await readBounded(response.body, maxBytes); }
  catch (error) {
    if (error instanceof HealthContractError) throw error;
    throw new HealthContractError('TRANSPORT_FAILURE');
  }
  let decoded;
  try { decoded = JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(bytes)); }
  catch { throw new HealthContractError('INVALID_JSON'); }
  if (decoded === null || Array.isArray(decoded) || typeof decoded !== 'object' ||
      decoded.ok !== true || typeof decoded.service !== 'string' || decoded.service.length === 0 ||
      decoded.protocol !== '1') throw new HealthContractError('INVALID_HEALTH');
  return {ok: true, service: decoded.service, protocol: decoded.protocol};
}
