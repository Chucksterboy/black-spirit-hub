import assert from "node:assert/strict";
import test from "node:test";
import { handleRequest } from "../src/relay.js";

function createEnvironment(manifestValue) {
  const calls = { key: 0, limiter: 0, upstream: 0 };
  return {
    calls,
    env: {
      BDO_ALERTS_API_KEY: "test-only-secret",
      BDO_ALERTS_REQUEST_LIMIT: {
        async limit() {
          calls.limiter += 1;
          return { success: true };
        },
      },
      BDO_ALERTS_REFRESH_LIMIT: {
        async limit() {
          calls.limiter += 1;
          return { success: true };
        },
      },
      BSHUB_UPDATE_MANIFEST: manifestValue === undefined ? undefined : {
        async get(key) {
          calls.key += 1;
          assert.equal(key, "live");
          return manifestValue;
        },
      },
    },
  };
}

function noExternalRuntime(calls) {
  return {
    cache: {
      async match() {
        assert.fail("the update manifest must not read the BDO edge cache");
      },
      async put() {
        assert.fail("the update manifest must not write the BDO edge cache");
      },
    },
    async fetchImpl() {
      calls.upstream += 1;
      assert.fail("the update manifest must not call an upstream service");
    },
  };
}

test("returns a safe pending manifest when no live KV record exists", async () => {
  const { env, calls } = createEnvironment();
  const response = await handleRequest(
    new Request("https://relay.example/status/update"),
    env,
    { waitUntil() { assert.fail("the update manifest must not cache"); } },
    noExternalRuntime(calls),
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    schemaVersion: 1,
    channel: "microsoft-store",
    availability: "pending",
    version: null,
  });
  assert.equal(calls.key, 0);
  assert.equal(calls.limiter, 0);
  assert.equal(calls.upstream, 0);
  assert.match(response.headers.get("Cache-Control") || "", /no-store/);
});

test("returns only a validated live Store version without touching BDO services", async () => {
  const live = JSON.stringify({
    schemaVersion: 1,
    channel: "microsoft-store",
    availability: "live",
    version: "0.9.69.0",
    privateNotes: "must-not-leak",
  });
  const { env, calls } = createEnvironment(live);
  const response = await handleRequest(
    new Request("https://relay.example/status/update"),
    env,
    { waitUntil() { assert.fail("the update manifest must not cache"); } },
    noExternalRuntime(calls),
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    schemaVersion: 1,
    channel: "microsoft-store",
    availability: "live",
    version: "0.9.69.0",
  });
  assert.equal(calls.key, 1);
  assert.equal(calls.limiter, 0);
  assert.equal(calls.upstream, 0);
});

test("fails closed to pending for malformed, non-live, or unsafe live manifests", async () => {
  for (const value of [
    "not json",
    JSON.stringify({ schemaVersion: 1, channel: "microsoft-store", availability: "pending", version: "0.9.69.0" }),
    JSON.stringify({ schemaVersion: 1, channel: "microsoft-store", availability: "live", version: "0.9.69" }),
    JSON.stringify({ schemaVersion: 1, channel: "microsoft-store", availability: "live", version: "0.9.70000.0" }),
    JSON.stringify({ schemaVersion: 2, channel: "microsoft-store", availability: "live", version: "0.9.69.0" }),
  ]) {
    const { env, calls } = createEnvironment(value);
    const response = await handleRequest(
      new Request("https://relay.example/status/update"),
      env,
      { waitUntil() { assert.fail("the update manifest must not cache"); } },
      noExternalRuntime(calls),
    );
    assert.equal((await response.json()).availability, "pending");
    assert.equal(calls.limiter, 0);
    assert.equal(calls.upstream, 0);
  }
});

test("accepts only the exact GET update-manifest path", async () => {
  const { env, calls } = createEnvironment();
  const post = await handleRequest(
    new Request("https://relay.example/status/update", { method: "POST" }),
    env,
    {},
    noExternalRuntime(calls),
  );
  assert.equal(post.status, 405);
  assert.equal(post.headers.get("Allow"), "GET");

  const query = await handleRequest(
    new Request("https://relay.example/status/update?version=0.9.69.0"),
    env,
    {},
    noExternalRuntime(calls),
  );
  assert.equal(query.status, 404);
  assert.equal(calls.key, 0);
  assert.equal(calls.limiter, 0);
  assert.equal(calls.upstream, 0);
});
