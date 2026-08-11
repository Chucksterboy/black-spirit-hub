import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const sourceRoot = process.argv[2] ? path.resolve(process.argv[2]) : path.join(repoRoot, "Source Code");
const html = fs.readFileSync(path.join(sourceRoot, "BlackSpiritHub.Resources.Black_Spirit_Hub.html"), "utf8");
const css = fs.readFileSync(path.join(sourceRoot, "BlackSpiritHub.Resources.Black_Spirit_Hub.css"), "utf8");
const js = fs.readFileSync(path.join(sourceRoot, "BlackSpiritHub.Resources.Black_Spirit_Hub.js"), "utf8");
const dehkiaHtml = html.match(/<section id="dehkiaFuelView"[\s\S]*?<section id="lightstoneSetsView"/)?.[0] ?? "";
const dehkiaJs = js.match(/const DEHKIA_CATALOG=\[[\s\S]*?function initializeDehkiaFuel\(\)[\s\S]*?\n\}/)?.[0] ?? "";

const catalogMatch = js.match(/const DEHKIA_CATALOG=\[([\s\S]*?)\]\.map\(\(\[itemId,name,tier\]\)=>\(\{itemId,name,tier\}\)\);/);
assert.ok(catalogMatch, "Dehkia catalog declaration is missing");
const catalogRows = [...catalogMatch[1].matchAll(/\[(\d+),"((?:[^"\\]|\\.)*)","(high|low)"\]/g)].map(match => ({
  itemId: Number(match[1]),
  name: JSON.parse(`"${match[2]}"`),
  tier: match[3]
}));
assert.equal(catalogRows.length, 26, "Dehkia catalog must contain the official 26 accessories");
assert.equal(new Set(catalogRows.map(row => row.itemId)).size, 26, "Dehkia catalog item IDs must be unique");
assert.equal(catalogRows.filter(row => row.tier === "high").length, 15, "Expected 15 high-tier accessories");
assert.equal(catalogRows.filter(row => row.tier === "low").length, 11, "Expected 11 low-tier accessories");

assert.match(js, /const DEHKIA_FUEL_YIELDS=\{high:\{1:165,2:450,3:1275\},low:\{1:25,2:75,3:210\}\};/);
assert.match(js, /const DEHKIA_ENHANCEMENT_MARKS=\{1:"I",2:"II",3:"III",4:"IV"\};/, "Roman-numeral enhancement marks must remain future-safe through IV");
assert.equal(catalogRows.length * 3, 78, "Every accessory must expose PRI, DUO, and TRI choices");
assert.equal(Math.floor(67_733_330 / 165), 410_505, "Price-per-fuel calculation must floor the exact quotient");
assert.match(js, /Math\.floor\(totalCost\/row\.fuelYield\)/, "UI must floor price per fuel");
assert.match(js, /return row\.price\+10\*crystalValue/, "Total cost must always include the accessory and ten crystals");
assert.match(js, /row\.price>0&&row\.stock>0&&row\.pricePerFuel!==null/, "Marketplace best must require a positive price and stock");
assert.doesNotMatch(dehkiaHtml, /\bOwn(?:ed)?\b/i, "Dehkia UI must not expose ownership controls");
assert.doesNotMatch(dehkiaJs, /\bowned\b|dehkiaFuelOwned/i, "Dehkia logic must not contain ownership state");

assert.match(html, /data-app-view="dehkiaFuelView"[^>]*>[\s\S]*?<span class="navLabel">Dehkia Fuel<\/span>/);
assert.match(html, /<section id="dehkiaFuelView" class="appView">/);
assert.doesNotMatch(html, /<option\s+value="365">\s*1 year\s*<\/option>/i);
assert.match(html, /Assets\/DehkiaFuel\/item-766108\.png/);
const cssAssetToken = html.match(/BlackSpiritHub\.Resources\.Black_Spirit_Hub\.css\?v=([^"']+)/)?.[1];
const jsAssetToken = html.match(/BlackSpiritHub\.Resources\.Black_Spirit_Hub\.js\?v=([^"']+)/)?.[1];
assert.ok(cssAssetToken, "Stylesheet cache token is missing");
assert.equal(jsAssetToken, cssAssetToken, "CSS and JavaScript cache tokens must match");
assert.match(cssAssetToken, /^v0\.9\.\d+(?:-[a-z0-9.-]+)?$/i, "Unexpected Dehkia asset cache token");
assert.doesNotMatch(dehkiaHtml, /https?:\/\//i, "Dehkia view cannot hotlink remote assets");
assert.doesNotMatch(dehkiaHtml, /dehkiaFilter|dehkiaReset|type="search"/i, "Dehkia price checker must not render a filter panel");
assert.doesNotMatch(dehkiaJs, /DEHKIA_FILTER|dehkiaFuelFilters|dehkiaFilteredRows|dehkiaResetFilters/i, "Dehkia price checker must not retain filter state or logic");
const summaryMarkup = dehkiaHtml.match(/<section class="dehkiaSummaryGrid"[\s\S]*?<\/section>/)?.[0] ?? "";
assert.equal((summaryMarkup.match(/<article class="dehkiaSummaryCard/g) ?? []).length, 2, "Dehkia summary must contain exactly two cards");
assert.doesNotMatch(dehkiaHtml, /dehkiaVisibleCount|Visible choices/i, "Visible Choices card must be removed");

for (const id of [
  "dehkiaRefresh", "dehkiaCrystalValue", "dehkiaUseLiveCrystal", "dehkiaCrystalIcon", "dehkiaBestIconWrap", "dehkiaBestIcon", "dehkiaBestEnhancement",
  "dehkiaBestName", "dehkiaBestValue", "dehkiaUpdatedText", "dehkiaRows"
]) {
  assert.match(html, new RegExp(`id="${id}"`), `Missing Dehkia control #${id}`);
}
for (const key of ["name", "price", "fuelYield", "stock", "totalCost", "pricePerFuel"]) {
  assert.match(html, new RegExp(`data-dehkia-sort="${key}"`), `Missing sortable Dehkia column ${key}`);
}
assert.match(js, /const all=dehkiaEnrichRows\(\),rows=dehkiaSortedRows\(all\)/, "All 78 rows must render without filtering");
assert.match(js, /bestIcon\.src=dehkiaIconPath\(marketBest\)/, "Best available row must display its local accessory icon");
assert.match(js, /bestEnhancement\.textContent=marketBest\?dehkiaEnhancementMark\(marketBest\.enhancementLevel\):""/, "Best available icon must display its enhancement mark");
assert.match(js, /class="dehkiaItemIconWrap"[\s\S]*?class="dehkiaIconEnhancement" data-level="\$\{row\.enhancementLevel\}"/, "Every table icon must include a Roman-numeral enhancement overlay");
assert.match(js, /crystalIconPath/, "Crystal icon path from the native response must be consumed");

assert.match(js, /bridgeCall\("getDehkiaFuelData",\{forceRefresh:Boolean\(forceRefresh\)\}\)/);
const timeout = Number(js.match(/getDehkiaFuelData:(\d+)/)?.[1]);
assert.ok(timeout > 90_000, `Frontend timeout (${timeout}) must exceed the native 90-second command timeout`);
assert.match(js, /if\(viewId === "dehkiaFuelView"\) initializeDehkiaFuel\(\);/);
assert.match(js, /dehkiaFuelView:"Assets\/CinematicBackgrounds\/cinematic-09\.jpg"/);
assert.match(js, /if\(raw==="cache"\)return"cached";/, "Backend CACHE status must render as cached");
assert.doesNotMatch(dehkiaJs, /\b500000\b/, "Dehkia must never invent a 500,000-silver crystal fallback");
assert.doesNotMatch(dehkiaHtml, /value="500000"|Fallback estimate/i, "The crystal field must start blank without fallback copy");
assert.match(dehkiaHtml, /placeholder="Enter crystal price"/i, "The blank crystal field must prompt for a real value");
assert.match(js, /const DEHKIA_MARKET_ROW_COUNT=DEHKIA_CATALOG\.length\*3;/, "The frontend must derive the exact 78-row contract from the canonical catalog");
assert.match(js, /if\(!Array\.isArray\(rows\)\|\|rows\.length!==DEHKIA_MARKET_ROW_COUNT\)return false;/, "Incomplete payloads must be rejected before normalization");
assert.match(js, /!DEHKIA_CANONICAL_KEYS\.has\(key\)\|\|seen\.has\(key\)\|\|price===null\|\|stock===null/, "Unknown, duplicate, unpriced, and invalid-stock rows must be rejected");
assert.match(js, /if\(!dehkiaRowsAreComplete\(dehkiaState\.rows\)\)return false;/, "Partial snapshots must never be persisted");
assert.doesNotMatch(dehkiaJs, /\?\?new Date\(\)\.toISOString\(\)/, "A reference payload without a timestamp must not claim it was updated now");
assert.match(js, /mode:"manual",value,verified:true/, "Manual crystal values must persist as trusted user values");
assert.match(css, /#dehkiaFuelView/);
assert.doesNotMatch(css, /\.dehkiaFilter(?:Panel|Grid|Heading|Wide)?\b/, "Removed filter panel CSS must not remain");
assert.match(css, /\.dehkiaTableScroller\{[^}]*overflow:auto/);
assert.match(css, /\.dehkiaTableScroller::-webkit-scrollbar\{[^}]*width:0;height:0[^}]*\}/);
assert.match(css, /\.dehkiaIconEnhancement\{[^}]*position:absolute[^}]*color:#fff/, "Enhancement marks must be crisp overlays, not baked into low-resolution artwork");
assert.match(css, /\.dehkiaCrystalInput input\{[^}]*text-align:center!important/, "The manual crystal-price value must remain centered in its control");
assert.match(css, /\.dehkiaCrystalInput input\{[^}]*clip-path:none!important[^}]*appearance:textfield/, "The crystal-price control must not inherit clipped theme geometry or off-center spinners");
assert.match(css, /\.dehkiaCrystalCard>img\{[^}]*box-sizing:content-box[^}]*width:44px[^}]*height:44px[^}]*justify-self:center[^}]*object-fit:contain[^}]*object-position:center[^}]*image-rendering:auto/, "The crystal summary must render its native 44px icon at 1:1, centered without cropping");
assert.match(css, /\.dehkiaBestIcon\{[^}]*box-sizing:content-box[^}]*width:44px[^}]*height:44px[^}]*object-fit:contain[^}]*object-position:center[^}]*image-rendering:auto/, "The best-choice summary must render its native 44px icon at 1:1, centered without cropping");
assert.doesNotMatch(css, /\.dehkia(?:CrystalCard>img|BestIcon)\{[^}]*(?:width|height):(?:56|64)px/, "Responsive rules must not enlarge native Dehkia summary icons");
assert.match(css, /\.dehkiaBestIconWrap\{[^}]*width:66px[^}]*height:66px[^}]*overflow:visible/, "The best-choice enhancement badge must not be clipped by its icon wrapper");

const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
for (const itemId of [...catalogRows.map(row => row.itemId), 766108]) {
  const iconPath = path.join(sourceRoot, "Assets", "DehkiaFuel", `item-${itemId}.png`);
  assert.ok(fs.existsSync(iconPath), `Missing local Dehkia icon ${path.basename(iconPath)}`);
  const icon = fs.readFileSync(iconPath);
  assert.ok(icon.length > 1_000, `Dehkia icon ${path.basename(iconPath)} is unexpectedly small`);
  assert.ok(icon.subarray(0, 8).equals(pngSignature), `Dehkia icon ${path.basename(iconPath)} is not a PNG`);
  assert.equal(icon.readUInt32BE(16), 44, `Dehkia icon ${path.basename(iconPath)} must retain its native 44px width`);
  assert.equal(icon.readUInt32BE(20), 44, `Dehkia icon ${path.basename(iconPath)} must retain its native 44px height`);
}

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function createDehkiaHarness(initialSettings = {}) {
  const settings = clone(initialSettings);
  const writes = [];
  const context = vm.createContext({
    console,
    document: {
      activeElement: null,
      getElementById: () => null,
      querySelectorAll: () => [],
      createElement: () => ({ className: "", textContent: "", setAttribute() {} })
    },
    HTMLImageElement: class HTMLImageElement {},
    readSetting(key, fallback) {
      return Object.prototype.hasOwnProperty.call(settings, key) ? clone(settings[key]) : fallback;
    },
    persistSetting(key, value) {
      settings[key] = clone(value);
      writes.push({ key, value: clone(value) });
    },
    escapeHtml(value) { return String(value); },
    bridgeCall: async () => { throw new Error("Bridge is not available in this focused test."); }
  });
  vm.runInContext(`${dehkiaJs}\nglobalThis.__dehkiaTest={
    rowCount:DEHKIA_MARKET_ROW_COUNT,state:dehkiaState,staticRows:dehkiaStaticRows,
    rowsAreComplete:dehkiaRowsAreComplete,completeRows:dehkiaCompleteMarketRows,
    restore:dehkiaRestoreSnapshot,persist:dehkiaPersistSnapshot,apply:dehkiaApplyPayload,
    enrich:dehkiaEnrichRows,totalCost:dehkiaTotalCost,validTimestamp:dehkiaValidTimestamp
  };`, context);
  return { api: context.__dehkiaTest, settings, writes };
}

const emptyHarness = createDehkiaHarness();
assert.equal(emptyHarness.api.rowCount, 78, "The runtime completeness contract must be exactly 78 rows");
assert.equal(emptyHarness.api.state.crystal.value, null, "A first run must keep the crystal value unknown");
assert.equal(emptyHarness.api.totalCost({ price: 60_000_000 }, null), null, "Unknown crystal value must suppress total cost");
assert.ok(emptyHarness.api.enrich().every(row => row.totalCost === null && row.pricePerFuel === null && row.rank === null), "Unknown inputs must suppress all efficiency rankings");

const legacyFallbackHarness = createDehkiaHarness({ dehkiaFuelCrystal: { mode: "live", value: 500_000 } });
assert.equal(legacyFallbackHarness.api.state.crystal.value, null, "An unverified legacy live fallback must be discarded");
const manualHarness = createDehkiaHarness({ dehkiaFuelCrystal: { mode: "manual", value: 700_000 } });
assert.deepEqual(clone(manualHarness.api.state.crystal), { mode: "manual", value: 700_000, verified: true }, "A valid user-entered value must survive migration");
const verifiedLiveHarness = createDehkiaHarness({ dehkiaFuelCrystal: { mode: "live", value: 710_000, verified: true } });
assert.equal(verifiedLiveHarness.api.state.crystal.value, 710_000, "The last verified live value must survive a missing estimate");

const completeRows = emptyHarness.api.staticRows().map((row, index) => ({ ...clone(row), price: 60_000_000 + index, stock: index % 7 }));
assert.equal(emptyHarness.api.rowsAreComplete(completeRows), true, "Every canonical priced row with nonnegative stock must form a complete snapshot");
assert.equal(emptyHarness.api.rowsAreComplete(completeRows.slice(0, -1)), false, "A 77-row payload must be rejected");
assert.equal(emptyHarness.api.rowsAreComplete([...completeRows.slice(0, -1), completeRows[0]]), false, "A duplicate canonical key must be rejected");
assert.equal(emptyHarness.api.rowsAreComplete(completeRows.map((row, index) => index === 0 ? { ...row, price: 0 } : row)), false, "Zero-priced rows must make a snapshot incomplete");
assert.equal(emptyHarness.api.rowsAreComplete(completeRows.map((row, index) => index === 0 ? { ...row, stock: -1 } : row)), false, "Negative stock must make a snapshot incomplete");

const persistenceHarness = createDehkiaHarness();
persistenceHarness.api.state.rows = completeRows.slice(0, -1);
assert.equal(persistenceHarness.api.persist(), false, "Partial state must never be persisted");
assert.equal(persistenceHarness.writes.some(write => write.key === "dehkiaFuelSnapshot"), false, "Partial state must not touch the snapshot setting");
persistenceHarness.api.state.rows = completeRows;
assert.equal(persistenceHarness.api.persist(), true, "A complete snapshot may be persisted");
assert.equal(persistenceHarness.settings.dehkiaFuelSnapshot.rows.length, 78);

const partialCacheHarness = createDehkiaHarness({ dehkiaFuelSnapshot: { rows: completeRows.slice(0, -1), fetchedUtc: new Date().toISOString() } });
assert.equal(partialCacheHarness.api.restore(), false, "A partial local snapshot must never be restored");
const completeCacheHarness = createDehkiaHarness({ dehkiaFuelSnapshot: { rows: completeRows, fetchedUtc: "2026-08-11T10:00:00Z", suggestedCrystalValue: 720_000 } });
assert.equal(completeCacheHarness.api.restore(), true, "A complete local snapshot must restore atomically");
assert.equal(completeCacheHarness.api.state.marketRows, 78);

const referenceHarness = createDehkiaHarness();
assert.equal(referenceHarness.api.apply({ status: "REFERENCE", items: referenceHarness.api.staticRows() }), 0, "Reference-only rows must never become a market snapshot");
assert.equal(referenceHarness.api.state.fetchedUtc, null, "Reference-only rows without a timestamp must not claim an update time");
assert.equal(referenceHarness.api.validTimestamp(undefined), null);

const verifiedValueHarness = createDehkiaHarness({ dehkiaFuelCrystal: { mode: "live", value: 710_000, verified: true } });
assert.equal(verifiedValueHarness.api.apply({ status: "LIVE", items: completeRows, fetchedUtc: "2026-08-11T10:00:00Z" }), 78);
assert.equal(verifiedValueHarness.api.state.crystal.value, 710_000, "A complete payload with no estimate must preserve the last verified crystal value");
const ranked = verifiedValueHarness.api.enrich();
assert.ok(ranked.some(row => row.rank !== null), "Only a complete snapshot with a trusted crystal value may rank rows");
verifiedValueHarness.api.state.rows = completeRows.slice(0, -1);
assert.ok(verifiedValueHarness.api.enrich().every(row => row.rank === null), "A partial in-memory snapshot must never be ranked");

console.log("Dehkia Fuel frontend regression checks passed.");
