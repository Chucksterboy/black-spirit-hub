import assert from "node:assert/strict";
import test from "node:test";
import { handleRequest, parseRoute } from "../src/relay.js";

const fakeSecret = "test-only-secret";

function createEnvironment({ requestAllowed = true, refreshAllowed = true } = {}) {
  const normalCalls = [];
  const refreshCalls = [];
  return {
    env: {
      BDO_ALERTS_API_KEY: fakeSecret,
      BDO_ALERTS_REQUEST_LIMIT: {
        async limit(value) {
          normalCalls.push(value);
          return { success: requestAllowed };
        },
      },
      BDO_ALERTS_REFRESH_LIMIT: {
        async limit(value) {
          refreshCalls.push(value);
          return { success: refreshAllowed };
        },
      },
    },
    normalCalls,
    refreshCalls,
  };
}

function createCache() {
  const responses = new Map();
  return {
    async match(request) {
      return responses.get(request.url)?.clone();
    },
    async put(request, response) {
      responses.set(request.url, response.clone());
    },
    set(url, response) {
      responses.set(url, response.clone());
    },
  };
}

function createContext() {
  const pending = [];
  return {
    pending,
    waitUntil(promise) {
      pending.push(Promise.resolve(promise));
    },
  };
}

function jsonResponse(payload, status = 200, headers = {}) {
  const body = JSON.stringify(payload);
  return new Response(body, {
    status,
    headers: {
      "Content-Type": "application/json",
      "Content-Length": String(Buffer.byteLength(body)),
      ...headers,
    },
  });
}

test("only accepts the documented GET player and guild routes", () => {
  assert.equal(parseRoute("https://relay.example/api/player/search/eu?query=Luminous").error, undefined);
  assert.equal(parseRoute("https://relay.example/api/guild/eu/Luminous").error, undefined);
  assert.ok(parseRoute("https://relay.example/healthz").error);
  assert.ok(parseRoute("https://relay.example/api/market/price-history?item_ids=1").error);
  assert.ok(parseRoute("https://relay.example/api/player/search/console_eu?query=Luminous").error);
  assert.ok(parseRoute("https://relay.example/api/player/search/eu?query=Luminous&force_refresh=true").error);
  assert.ok(parseRoute("https://relay.example/api/guild/eu/Luminous?profile_target=opaque").error);
  assert.ok(parseRoute("https://relay.example/api/player/eu/Luminous?force_refresh=true").error);
});

test("forwards only an allowlisted search request and adds the relay secret", async () => {
  const { env, normalCalls } = createEnvironment();
  const cache = createCache();
  const context = createContext();
  let received;
  const response = await handleRequest(
    new Request("https://relay.example/api/player/search/eu?query=Luminous", {
      headers: { "CF-Connecting-IP": "203.0.113.10", "X-API-Key": "untrusted-client-value" },
    }),
    env,
    context,
    {
      cache,
      async fetchImpl(url, init) {
        received = { url: String(url), init };
        return jsonResponse({ region: "eu", players: [] }, 200, { "Set-Cookie": "must-not-pass-through" });
      },
    },
  );

  await Promise.all(context.pending);
  assert.equal(response.status, 200);
  assert.equal(await response.json().then(value => value.region), "eu");
  assert.equal(received.url, "https://api.bdoalerts.net/api/player/search/eu?query=Luminous");
  assert.equal(received.init.method, "GET");
  assert.equal(received.init.redirect, "manual");
  assert.equal(received.init.headers["X-API-Key"], fakeSecret);
  assert.equal(Object.hasOwn(received.init.headers, "X-API-Key"), true);
  assert.equal(Object.hasOwn(received.init.headers, "x-api-key"), false);
  assert.equal(response.headers.get("Set-Cookie"), null);
  assert.equal(normalCalls.length, 1);
  assert.match(normalCalls[0].key, /^player:search:203\.0\.113\.10$/);
});

test("retries one upstream 5xx response within the same request budget", async () => {
  const { env, normalCalls } = createEnvironment();
  const attempts = [];
  const response = await handleRequest(
    new Request("https://relay.example/api/player/search/eu?query=Luminous"),
    env,
    createContext(),
    {
      async fetchImpl(url, init) {
        attempts.push({ url: String(url), init });
        if (attempts.length === 1) {
          return jsonResponse({ transient: true }, 503);
        }
        return jsonResponse({ recovered: true });
      },
    },
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { recovered: true });
  assert.equal(attempts.length, 2);
  assert.equal(attempts[0].url, "https://api.bdoalerts.net/api/player/search/eu?query=Luminous");
  assert.equal(attempts[1].url, attempts[0].url);
  assert.equal(attempts[0].init.redirect, "manual");
  assert.equal(attempts[1].init.redirect, "manual");
  assert.equal(attempts[0].init.headers["X-API-Key"], fakeSecret);
  assert.equal(attempts[1].init.headers["X-API-Key"], fakeSecret);
  assert.strictEqual(attempts[1].init.signal, attempts[0].init.signal);
  assert.equal(normalCalls.length, 1);
});

test("stops after the single upstream 5xx retry", async () => {
  const { env } = createEnvironment();
  let attempts = 0;
  const response = await handleRequest(
    new Request("https://relay.example/api/player/search/eu?query=Luminous"),
    env,
    createContext(),
    {
      async fetchImpl() {
        attempts += 1;
        return jsonResponse({ transient: true }, 503);
      },
    },
  );

  assert.equal(response.status, 503);
  assert.equal(attempts, 2);
});

test("serves ordinary lookups from the edge cache before the rate limiter or upstream", async () => {
  const { env, normalCalls } = createEnvironment();
  const cache = createCache();
  const url = "https://relay.example/api/guild/search/eu?query=Luminous";
  cache.set(url, jsonResponse({ cached: true }));
  let calls = 0;
  const response = await handleRequest(new Request(url), env, createContext(), {
    cache,
    async fetchImpl() {
      calls += 1;
      return jsonResponse({ cached: false });
    },
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { cached: true });
  assert.equal(calls, 0);
  assert.equal(normalCalls.length, 0);
});

test("allows player profile force-refresh only with an opaque target and does not cache it", async () => {
  const { env, normalCalls, refreshCalls } = createEnvironment();
  const cache = createCache();
  const context = createContext();
  let receivedUrl;
  const response = await handleRequest(
    new Request("https://relay.example/api/player/eu/Luminous?profile_target=opaque%2Btarget&force_refresh=true"),
    env,
    context,
    {
      cache,
      async fetchImpl(url) {
        receivedUrl = String(url);
        return jsonResponse({ refreshed: true });
      },
    },
  );

  await Promise.all(context.pending);
  assert.equal(response.status, 200);
  assert.equal(receivedUrl, "https://api.bdoalerts.net/api/player/eu/Luminous?profile_target=opaque%2Btarget&force_refresh=true");
  assert.equal(normalCalls.length, 0);
  assert.equal(refreshCalls.length, 1);
  assert.equal(await cache.match(new Request("https://relay.example/api/player/eu/Luminous?profile_target=opaque%2Btarget&force_refresh=true")), undefined);
});

test("fails closed when the limiter or secret is missing", async () => {
  const { env } = createEnvironment();
  const blocked = await handleRequest(
    new Request("https://relay.example/api/player/search/eu?query=Luminous"),
    { ...env, BDO_ALERTS_REQUEST_LIMIT: { async limit() { return { success: false }; } } },
    createContext(),
    { fetchImpl: async () => assert.fail("blocked requests must not reach the upstream") },
  );
  assert.equal(blocked.status, 429);

  const missingSecret = await handleRequest(
    new Request("https://relay.example/api/player/search/eu?query=Luminous"),
    { ...env, BDO_ALERTS_API_KEY: "" },
    createContext(),
    { fetchImpl: async () => assert.fail("unconfigured requests must not reach the upstream") },
  );
  assert.equal(missingSecret.status, 503);
});

test("does not pass upstream failure bodies or non-JSON payloads through", async () => {
  const { env } = createEnvironment();
  let unavailableCalls = 0;
  const unavailable = await handleRequest(
    new Request("https://relay.example/api/player/search/eu?query=Luminous"),
    env,
    createContext(),
    {
      fetchImpl: async () => {
        unavailableCalls += 1;
        return new Response("upstream diagnostic", { status: 403 });
      },
    },
  );
  assert.equal(unavailable.status, 502);
  assert.doesNotMatch(await unavailable.text(), /upstream diagnostic/);
  assert.equal(unavailableCalls, 1);

  const invalid = await handleRequest(
    new Request("https://relay.example/api/player/search/eu?query=Luminous"),
    env,
    createContext(),
    { fetchImpl: async () => new Response("not-json", { status: 200, headers: { "Content-Type": "text/plain" } }) },
  );
  assert.equal(invalid.status, 502);
});

test("rejects an oversized chunked JSON response even without Content-Length", async () => {
  const { env } = createEnvironment();
  const oversizedBody = `{"payload":"${"x".repeat((2 * 1024 * 1024) + 1)}"}`;
  const response = await handleRequest(
    new Request("https://relay.example/api/player/search/eu?query=Luminous"),
    env,
    createContext(),
    {
      fetchImpl: async () => new Response(oversizedBody, {
        headers: { "Content-Type": "application/json" },
      }),
    },
  );

  assert.equal(response.status, 502);
});
