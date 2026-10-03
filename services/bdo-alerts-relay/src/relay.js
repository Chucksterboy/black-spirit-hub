import { handleUpdateManifestRequest } from "./update-manifest.js";

const UPSTREAM_ORIGIN = "https://api.bdoalerts.net";
const MAX_LOOKUP_LENGTH = 64;
const MAX_PROFILE_TARGET_LENGTH = 2048;
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
const SEARCH_CACHE_SECONDS = 5 * 60;
const PROFILE_CACHE_SECONDS = 60 * 60;
const UPSTREAM_TIMEOUT_MS = 29_000;
const REGIONS = new Set(["eu", "na", "kr", "sa", "asia"]);
const KINDS = new Set(["player", "guild"]);

export async function handleRequest(request, env, context, runtime = {}) {
	const updateManifestResponse = await handleUpdateManifestRequest(request, env);
	if (updateManifestResponse) {
		return updateManifestResponse;
	}

  if (request.method !== "GET") {
    return errorResponse(405, "Only GET requests are supported.", { Allow: "GET" });
  }

  const route = parseRoute(request.url);
  if (route.error) {
    return errorResponse(route.status, route.error);
  }

  // @ts-ignore Cloudflare's dashboard editor omits the Cache API declaration.
  const cache = runtime.cache ?? globalThis.caches?.default;
  const cacheKey = new Request(request.url, { method: "GET" });
  if (route.cacheSeconds > 0 && cache) {
    const cached = await cacheMatch(cache, cacheKey);
    if (cached) {
      return cached;
    }
  }

  const limiter = route.forceRefresh
    ? env.BDO_ALERTS_REFRESH_LIMIT
    : env.BDO_ALERTS_REQUEST_LIMIT;
  if (!(await allowRequest(limiter, request, route.rateLimitScope))) {
    return errorResponse(429, "Player and guild lookup is busy. Try again shortly.", {
      "Retry-After": "60",
    });
  }

  const apiKey = typeof env.BDO_ALERTS_API_KEY === "string"
    ? env.BDO_ALERTS_API_KEY.trim()
    : "";
  if (!apiKey) {
    return errorResponse(503, "The player and guild relay is not configured.");
  }

  let upstreamResponse;
  try {
    upstreamResponse = await fetchUpstream(
      runtime.fetchImpl ?? fetch,
      route.upstreamUrl,
      apiKey,
    );
  } catch (error) {
    console.error(
      "BDO Alerts relay fetch failed",
      error instanceof Error ? error.message : "unknown error",
    );
    return errorResponse(503, "The player and guild service is temporarily unavailable.");
  }

  if (!upstreamResponse.ok) {
    console.warn("BDO Alerts upstream returned", upstreamResponse.status);
    return upstreamFailureResponse(upstreamResponse.status);
  }
  if (!isJsonResponse(upstreamResponse) || exceedsMaximumLength(upstreamResponse)) {
    return errorResponse(502, "The player and guild service returned an invalid response.");
  }

  let payload;
  try {
    payload = await upstreamResponse.arrayBuffer();
  } catch {
    return errorResponse(502, "The player and guild service returned an invalid response.");
  }
  if (payload.byteLength > MAX_RESPONSE_BYTES) {
    return errorResponse(502, "The player and guild service returned an invalid response.");
  }

  const response = new Response(payload, {
    status: 200,
    headers: {
      "Cache-Control": `public, max-age=${route.cacheSeconds}`,
      "Content-Type": "application/json; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });

  if (route.cacheSeconds > 0 && cache) {
    deferCacheWrite(cache, cacheKey, response.clone(), context);
  }
  return response;
}

export function parseRoute(requestUrl) {
  let url;
  try {
    url = new URL(requestUrl);
  } catch {
    return invalidRoute();
  }

  const segments = url.pathname.split("/");
  if (segments.length !== 5 || segments[1] !== "api" || !KINDS.has(segments[2])) {
    return invalidRoute();
  }

  const kind = segments[2];
  if (segments[3] === "search") {
    return parseSearchRoute(url, kind, segments[4]);
  }
  return parseProfileRoute(url, kind, segments[3], segments[4]);
}

function parseSearchRoute(url, kind, region) {
  if (!REGIONS.has(region) || !hasOnlyQueryKeys(url, ["query"])) {
    return invalidRoute();
  }

  const query = url.searchParams.get("query");
  if (!isSafeLookupText(query, 2)) {
    return invalidRoute();
  }

  const upstreamUrl = new URL(`/api/${kind}/search/${region}`, UPSTREAM_ORIGIN);
  upstreamUrl.search = `?query=${encodeURIComponent(query)}`;
  return {
    upstreamUrl,
    cacheSeconds: SEARCH_CACHE_SECONDS,
    forceRefresh: false,
    rateLimitScope: `${kind}:search`,
  };
}

function parseProfileRoute(url, kind, region, rawName) {
  if (!REGIONS.has(region)) {
    return invalidRoute();
  }

  const name = decodePathSegment(rawName);
  if (!isSafeLookupText(name, 1)) {
    return invalidRoute();
  }

  const profileTarget = url.searchParams.get("profile_target");
  const forceRefresh = url.searchParams.get("force_refresh") === "true";
  const permittedQuery = hasOnlyQueryKeys(url, [])
    || (kind === "player"
      && (hasOnlyQueryKeys(url, ["profile_target"])
        || hasOnlyQueryKeys(url, ["profile_target", "force_refresh"])));
  if (!permittedQuery
    || (profileTarget !== null && !isSafeProfileTarget(profileTarget))
    || (forceRefresh && profileTarget === null)
    || (url.searchParams.has("force_refresh") && !forceRefresh)) {
    return invalidRoute();
  }

  const upstreamUrl = new URL(`/api/${kind}/${region}/${encodeURIComponent(name)}`, UPSTREAM_ORIGIN);
  if (profileTarget !== null) {
    upstreamUrl.search = `?profile_target=${encodeURIComponent(profileTarget)}`;
    if (forceRefresh) {
      upstreamUrl.search += "&force_refresh=true";
    }
  }
  return {
    upstreamUrl,
    cacheSeconds: forceRefresh ? 0 : PROFILE_CACHE_SECONDS,
    forceRefresh,
    rateLimitScope: forceRefresh ? `${kind}:refresh` : `${kind}:profile`,
  };
}

function hasOnlyQueryKeys(url, expectedKeys) {
  const keys = [...url.searchParams.keys()];
  return keys.length === expectedKeys.length
    && new Set(keys).size === expectedKeys.length
    && expectedKeys.every(key => url.searchParams.has(key));
}

function decodePathSegment(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

function isSafeLookupText(value, minimumLength) {
  return typeof value === "string"
    && value.length >= minimumLength
    && value.length <= MAX_LOOKUP_LENGTH
    && value === value.trim()
    && !/[\u0000-\u001F\u007F-\u009F\uD800-\uDFFF/\\?#%&=]/.test(value);
}

function isSafeProfileTarget(value) {
  return typeof value === "string"
    && value.length > 0
    && value.length <= MAX_PROFILE_TARGET_LENGTH
    && !/[\u0000-\u001F\u007F-\u009F\uD800-\uDFFF]/.test(value);
}

async function allowRequest(limiter, request, scope) {
  if (!limiter || typeof limiter.limit !== "function") {
    return false;
  }

  const client = request.headers.get("CF-Connecting-IP")?.trim() || "anonymous";
  try {
    const result = await limiter.limit({ key: `${scope}:${client}` });
    return result?.success === true;
  } catch {
    return false;
  }
}

function isJsonResponse(response) {
  return response.headers.get("Content-Type")?.toLowerCase().startsWith("application/json") === true;
}

async function fetchUpstream(fetchImpl, upstreamUrl, apiKey) {
  // The shared signal bounds both attempts to the same total request budget.
  const signal = AbortSignal.timeout(UPSTREAM_TIMEOUT_MS);
  let response = await fetchImpl(upstreamUrl, createUpstreamRequestOptions(apiKey, signal));
  if (response.status >= 500 && response.status <= 599) {
    response = await fetchImpl(upstreamUrl, createUpstreamRequestOptions(apiKey, signal));
  }
  return response;
}

function createUpstreamRequestOptions(apiKey, signal) {
  return {
    method: "GET",
    headers: {
      Accept: "application/json",
      "User-Agent": "Black-Spirit-Hub-Relay/1.0",
      "X-API-Key": apiKey,
    },
    // Preserve the provider-key boundary: redirects are not followed, and
    // the generic non-2xx handling safely rejects any 3xx response.
    redirect: "manual",
    signal,
  };
}

function exceedsMaximumLength(response) {
  const value = response.headers.get("Content-Length");
  if (value === null) {
    return false;
  }
  const length = Number(value);
  return !Number.isSafeInteger(length) || length < 0 || length > MAX_RESPONSE_BYTES;
}

function deferCacheWrite(cache, key, response, context) {
  const write = Promise.resolve(cache.put(key, response)).catch(() => undefined);
  if (typeof context?.waitUntil === "function") {
    context.waitUntil(write);
  }
}

async function cacheMatch(cache, key) {
  try {
    return await cache.match(key);
  } catch {
    return undefined;
  }
}

function upstreamFailureResponse(status) {
  if (status === 404) {
    return errorResponse(404, "The requested player or guild was not found.");
  }
  if (status === 429) {
    return errorResponse(429, "Player and guild lookup is busy. Try again shortly.", {
      "Retry-After": "60",
    });
  }
  if (status >= 500 && status <= 599) {
    return errorResponse(503, "The player and guild service is temporarily unavailable.");
  }
  return errorResponse(502, "The player and guild relay could not complete the request.");
}

function invalidRoute() {
  return { status: 404, error: "The requested player and guild route was not found." };
}

function errorResponse(status, message, additionalHeaders = {}) {
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
