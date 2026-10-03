export const UPDATE_MANIFEST_PATH = "/status/update";

const LIVE_MANIFEST_KEY = "live";
const SCHEMA_VERSION = 1;
const CHANNEL = "microsoft-store";

/// Returns a response only for the public update-manifest endpoint. All other
/// paths deliberately fall through to the constrained BDO Alerts relay.
export async function handleUpdateManifestRequest(request, env) {
  let url;
  try {
    url = new URL(request.url);
  } catch {
    return null;
  }

  if (url.pathname !== UPDATE_MANIFEST_PATH) {
    return null;
  }
  if (request.method !== "GET") {
    return manifestError(405, "Only GET requests are supported.", { Allow: "GET" });
  }
  if (url.search.length !== 0) {
    return manifestError(404, "The requested update route was not found.");
  }

  const liveManifest = await readLiveManifest(env?.BSHUB_UPDATE_MANIFEST);
  return manifestResponse(liveManifest ?? pendingManifest());
}

async function readLiveManifest(namespace) {
  if (!namespace || typeof namespace.get !== "function") {
    return null;
  }
  try {
    const value = await namespace.get(LIVE_MANIFEST_KEY);
    return parseLiveManifest(value);
  } catch {
    // A missing or temporarily unavailable KV binding must never turn an
    // unverified Store package into an actionable update.
    return null;
  }
}

export function parseLiveManifest(value) {
  if (typeof value !== "string" || value.length === 0 || value.length > 1024) {
    return null;
  }
  try {
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)
      || parsed.schemaVersion !== SCHEMA_VERSION
      || parsed.channel !== CHANNEL
      || parsed.availability !== "live") {
      return null;
    }
    const version = normalizePackageVersion(parsed.version);
    return version === null
      ? null
      : { schemaVersion: SCHEMA_VERSION, channel: CHANNEL, availability: "live", version };
  } catch {
    return null;
  }
}

function pendingManifest() {
  return {
    schemaVersion: SCHEMA_VERSION,
    channel: CHANNEL,
    availability: "pending",
    version: null,
  };
}

function normalizePackageVersion(value) {
  if (typeof value !== "string" || value.length === 0 || value.length > 23) {
    return null;
  }
  const parts = value.split(".");
  if (parts.length !== 4) {
    return null;
  }
  const normalized = [];
  for (const part of parts) {
    if (!/^(0|[1-9]\d{0,4})$/.test(part)) {
      return null;
    }
    const numeric = Number(part);
    if (!Number.isInteger(numeric) || numeric < 0 || numeric > 65535) {
      return null;
    }
    normalized.push(String(numeric));
  }
  return normalized.join(".");
}

function manifestResponse(payload) {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: {
      "Cache-Control": "no-store, max-age=0",
      "Content-Type": "application/json; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function manifestError(status, message, additionalHeaders = {}) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      ...additionalHeaders,
    },
  });
}
