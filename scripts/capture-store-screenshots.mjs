import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { readFile, stat, mkdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

// Creates reviewable Microsoft Store listing screenshots from the actual
// shipped frontend. The capture harness is intentionally separate from the
// application: it never changes product source, starts the Windows desktop
// executable, reaches the network, or embeds credentials. Its bridge replies
// are fixed sample values so screenshots are reproducible rather than tied to
// a customer's local market history.

const repoRoot = path.resolve(import.meta.dirname, "..");
const htmlName = "BlackSpiritHub.Resources.Black_Spirit_Hub.html";
const defaultOutput = path.join(repoRoot, "docs", "store-listing", "screenshots");
const defaultEdge = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const runtimePlaywright = "C:\\Users\\MOBPC\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\node_modules\\playwright";

const options = new Map();
for (let index = 2; index < process.argv.length; index += 2) {
  const key = process.argv[index];
  const value = process.argv[index + 1];
  assert.ok(value, `${key || "Option"} requires a value.`);
  assert.ok(["--root", "--output", "--playwright-dir", "--browser", "--views"].includes(key), `Unknown option: ${key}`);
  options.set(key, value);
}

const captureRoot = path.resolve(options.get("--root") || path.join(repoRoot, "Source Code"));
const outputDirectory = path.resolve(options.get("--output") || defaultOutput);
const playwrightDirectory = options.get("--playwright-dir") || runtimePlaywright;
const browserPath = options.get("--browser") || defaultEdge;
const require = createRequire(import.meta.url);
const { chromium } = require(playwrightDirectory);

const views = [
  { id: "home", file: "01-home-dashboard.png", viewId: "homeView" },
  { id: "market", file: "02-market-analytics.png", viewId: "marketView" },
  { id: "recipe-book", file: "03-recipe-book.png", viewId: "recipeBookView" },
  { id: "grind-zones", file: "04-grind-zones.png", viewId: "grindTrackerView" },
  { id: "lightstone-sets", file: "05-lightstone-sets.png", viewId: "lightstoneSetsView" },
];
const requestedViews = (options.get("--views") || views.map(view => view.id).join(","))
  .split(",")
  .map(value => value.trim())
  .filter(Boolean);
const captureViews = views.filter(view => requestedViews.includes(view.id));
assert.equal(captureViews.length, requestedViews.length, `Unknown capture view requested: ${requestedViews.filter(id => !views.some(view => view.id === id)).join(", ")}`);

const contentTypes = new Map([
  [".html", "text/html; charset=utf-8"], [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"], [".json", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml"], [".png", "image/png"], [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"], [".webp", "image/webp"], [".gif", "image/gif"],
  [".ico", "image/x-icon"], [".woff", "font/woff"], [".woff2", "font/woff2"],
  [".ttf", "font/ttf"], [".otf", "font/otf"], [".mp3", "audio/mpeg"],
]);

function bridgeMockScript() {
  // This exact script is evaluated only in the disposable Playwright browser
  // context. It is not served, bundled, or copied into Black Spirit Hub.
  return String.raw`(() => {
    "use strict";
    const messageListeners = new Set();
    const sampleUpdatedUtc = "2026-09-27T08:00:00.000Z";
    const trackedItems = [
      { itemId: 11278, enhancement: 0, name: "Black Magic Crystal - Harphia", region: "eu", lastPrice: 12800000, lastUpdatedUtc: sampleUpdatedUtc },
      { itemId: 16015, enhancement: 0, name: "Caphras Stone", region: "eu", lastPrice: 2950000, lastUpdatedUtc: sampleUpdatedUtc },
      { itemId: 44195, enhancement: 0, name: "Deboreka Necklace", region: "eu", lastPrice: 81700000000, lastUpdatedUtc: sampleUpdatedUtc }
    ];
    const pricePoints = [
      ["2026-09-01T08:00:00.000Z", 10900000, 120], ["2026-09-05T08:00:00.000Z", 11200000, 151],
      ["2026-09-09T08:00:00.000Z", 11100000, 186], ["2026-09-13T08:00:00.000Z", 11700000, 238],
      ["2026-09-17T08:00:00.000Z", 11900000, 287], ["2026-09-21T08:00:00.000Z", 12300000, 342],
      ["2026-09-25T08:00:00.000Z", 12600000, 414], ["2026-09-27T08:00:00.000Z", 12800000, 460]
    ];
    const outfitOpportunities = [
      { itemId: 319999, name: "Sample Classic Outfit Box", price: 340000000, sales24Hours: 15, sales3Days: 54, sales7Days: 109, preorderCount: 2, estimatedQueueDays: 0.5, demandMomentumPercent: 26, recommendationEligible: true, salesSignalEligible: true, preorderDataFresh: true, lastDetailedUtc: sampleUpdatedUtc },
      { itemId: 319998, name: "Sample Premium Outfit Box", price: 415000000, sales24Hours: 12, sales3Days: 41, sales7Days: 96, preorderCount: 0, estimatedQueueDays: null, demandMomentumPercent: 19, recommendationEligible: false, salesSignalEligible: true, preorderDataFresh: true, lastDetailedUtc: sampleUpdatedUtc },
      { itemId: 319997, name: "Sample Artisan Outfit Box", price: 295000000, sales24Hours: 9, sales3Days: 35, sales7Days: 77, preorderCount: 4, estimatedQueueDays: 1.2, demandMomentumPercent: 11, recommendationEligible: true, salesSignalEligible: true, preorderDataFresh: true, lastDetailedUtc: sampleUpdatedUtc }
    ];
    const outfitReport = () => ({
      catalogCount: 460,
      detailedCount: 137,
      coveragePercent: 29.8,
      lastSalesSampleUtc: sampleUpdatedUtc,
      opportunities: outfitOpportunities,
      topOpportunities: outfitOpportunities
    });
    const marketAnalytics = (payload = {}) => {
      const item = trackedItems.find(candidate => candidate.itemId === Number(payload.itemId)) || trackedItems[0];
      return {
        item,
        currentPrice: item.lastPrice,
        minimumPrice: 10900000,
        maximumPrice: 12800000,
        averagePrice: 11862500,
        trendPercent: 17.43,
        sales: [
          { label: "24h", sales: 46, complete: true, coverageHours: 24 },
          { label: "7 days", sales: 198, complete: true, coverageHours: 168 },
          { label: "30 days", sales: 460, complete: true, coverageHours: 720 }
        ],
        points: pricePoints.map(([timestamp, price, tradeCount]) => ({ timestamp, price, tradeCount }))
      };
    };
    const reply = (command, payload) => {
      switch (command) {
        case "getAppBehaviorSettings":
        case "saveAppBehaviorSettings":
        case "saveStartupPreference":
          return { minimizeToTray: false, openImmediatelyWhenReady: true, backgroundMarketUpdatesEnabled: false, backgroundMarketUpdatesAvailable: false };
        case "getBackgroundMarketStatus":
          return { enabled: false, message: "Background updates are managed while the app is open." };
        case "healthCheck":
          return { databaseReadable: true, contentIndexReadable: true, contentCount: 18472, stale: false, lastRefreshStatus: "completed", degradedReasons: [] };
        case "getAppVersion":
          return { version: "v0.9.67" };
        case "checkForUpdates":
          return { updateAvailable: false, storeManaged: true, message: "Updates are managed by the Microsoft Store." };
        case "getEnglishTtsVoices":
          return { voices: [], defaultVoiceId: "" };
        case "initializeBossSchedule":
        case "refreshBossSchedule":
          return { status: "BUNDLED", message: "Using bundled EU schedule" };
        case "initialize":
          return { provider: "Central Market", settings: { region: "eu" } };
        case "getRegionState":
          return { items: trackedItems, outfits: outfitReport() };
        case "getAnalytics":
          return marketAnalytics(payload);
        case "getOutfitReport":
          return outfitReport();
        case "getGrindMarketPrices":
          return { prices: [], capturedUtc: sampleUpdatedUtc, message: "Reference values shown where available." };
        case "initializeWeeklyPlanner":
          return { selectedIds: [], completedIds: [], onboardingComplete: false };
        case "initializeCoupons":
        case "refreshCoupons":
          return { coupons: [], availableCount: 0, expiredCount: 0, redeemedCount: 0 };
        default:
          return {};
      }
    };
    const webview = {
      addEventListener(type, callback) { if (type === "message" && typeof callback === "function") messageListeners.add(callback); },
      removeEventListener(type, callback) { if (type === "message") messageListeners.delete(callback); },
      postMessage(message) {
        if (!message || message.command === "cancelRequest" || !message.id) return;
        const envelope = { id: message.id, ok: true, data: reply(message.command, message.payload || {}) };
        queueMicrotask(() => messageListeners.forEach(listener => listener({ data: envelope })));
      }
    };
    window.chrome = window.chrome || {};
    try { Object.defineProperty(window.chrome, "webview", { configurable: true, value: webview }); }
    catch (_) { window.chrome.webview = webview; }

    // Use the production auto-hidden state so Store screenshots focus on the
    // requested feature rather than the navigation's initial hover state.
    window.__bshStoreCaptureHideNavigation = () => {
      document.body.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, pointerType: "mouse", clientY: 500 }));
      document.body.classList.add("navAutoHidden");
      window.dispatchEvent(new Event("resize"));
    };
  })();`;
}

function safeRequestPath(root, rawPath) {
  const pathname = decodeURIComponent(rawPath).replace(/^\/+/, "");
  const target = path.resolve(root, pathname || htmlName);
  const relative = path.relative(root, target);
  if (relative.startsWith("..") || path.isAbsolute(relative)) return null;
  return target;
}

async function startStaticServer(root) {
  const server = createServer(async (request, response) => {
    try {
      const requestUrl = new URL(request.url || "/", "http://127.0.0.1");
      const target = safeRequestPath(root, requestUrl.pathname);
      if (!target) {
        response.writeHead(403).end();
        return;
      }
      const details = await stat(target);
      if (!details.isFile()) {
        response.writeHead(404).end();
        return;
      }
      const content = await readFile(target);
      response.writeHead(200, {
        "Cache-Control": "no-store",
        "Content-Type": contentTypes.get(path.extname(target).toLowerCase()) || "application/octet-stream"
      }).end(content);
    } catch {
      response.writeHead(404).end();
    }
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  assert.ok(address && typeof address === "object", "The local screenshot server did not bind a port.");
  return { server, origin: `http://127.0.0.1:${address.port}` };
}

async function closeServer(server) {
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
}

async function waitForView(page, view) {
  if (view.id !== "home") {
    await page.locator(`[data-app-view="${view.viewId}"]`).click();
    await page.waitForTimeout(420);
  }
  if (view.id === "market") {
    // The current Store UI presents Outfit Opportunities rather than the
    // legacy item-tracker workspace. Activate its normal in-app tab handler.
    await page.evaluate(() => {
      document.querySelector('[data-market-panel="outfitPanel"]')?.click();
    });
    await page.waitForTimeout(180);
  }
  if (view.id === "recipe-book") {
    await page.waitForFunction(() => document.getElementById("recipeBookSearchInput")?.disabled === false);
    await page.locator("#recipeBookSearchInput").fill("Balenos");
    await page.waitForTimeout(160);
  }
  if (view.id === "grind-zones") {
    await page.waitForSelector("[data-grind-picker-spot]");
    // The picker is the normal entry view for this tool and is the clearest
    // Store screenshot: it shows the searchable zone catalog before a choice.
  }
  if (view.id === "lightstone-sets") {
    await page.locator('[data-lightstone-choice="lifeskill"]').first().click();
    await page.waitForTimeout(220);
  }
  await page.evaluate(() => window.__bshStoreCaptureHideNavigation?.());
  await page.waitForTimeout(280);
}

function pngDimensions(contents) {
  assert.ok(contents.length >= 24, "Screenshot is not a complete PNG.");
  assert.equal(contents.toString("hex", 0, 8), "89504e470d0a1a0a", "Screenshot is not a PNG.");
  return { width: contents.readUInt32BE(16), height: contents.readUInt32BE(20) };
}

const mainHtml = path.join(captureRoot, htmlName);
const recipeCatalog = path.join(captureRoot, "Assets", "RecipeBook", "recipes.json");
await stat(mainHtml);
const recipeCatalogContents = await readFile(recipeCatalog);
await mkdir(outputDirectory, { recursive: true });

const { server, origin } = await startStaticServer(captureRoot);
let browser;
try {
  browser = await chromium.launch({
    headless: true,
    executablePath: browserPath,
    args: ["--hide-scrollbars", "--disable-gpu", "--no-first-run"]
  });
  const generated = [];
  for (const view of captureViews) {
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      screen: { width: 1920, height: 1080 },
      deviceScaleFactor: 1,
      reducedMotion: "reduce"
    });
    context.setDefaultTimeout(8000);
    const errors = [];
    await context.addInitScript({ content: bridgeMockScript() });
    await context.route("**/*", async route => {
      const url = route.request().url();
      if (url === "https://recipebook.bdo.local/recipes.json") {
        await route.fulfill({
          body: recipeCatalogContents,
          contentType: "application/json; charset=utf-8",
          headers: { "Access-Control-Allow-Origin": "*", "Cache-Control": "no-store" }
        });
      } else if (url.startsWith(origin + "/")) {
        await route.continue();
      } else if (/^https?:/i.test(url)) {
        await route.abort();
      } else {
        await route.continue();
      }
    });
    const page = await context.newPage();
    page.on("pageerror", error => errors.push(error.stack || error.message));
    await page.goto(`${origin}/${encodeURIComponent(htmlName)}`, { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(320);
    await waitForView(page, view);
    assert.deepEqual(errors, [], `${view.id} rendered with script errors: ${errors.join(" | ")}`);
    const screenshotPath = path.join(outputDirectory, view.file);
    await page.screenshot({ path: screenshotPath, fullPage: false, animations: "disabled" });
    const dimensions = pngDimensions(await readFile(screenshotPath));
    assert.deepEqual(dimensions, { width: 1920, height: 1080 }, `${view.file} must be exactly 1920x1080.`);
    generated.push({ view: view.id, screenshotPath, dimensions });
    await context.close();
  }
  console.log(JSON.stringify({ root: captureRoot, outputDirectory, generated }, null, 2));
} finally {
  if (browser) await browser.close();
  await closeServer(server);
}
