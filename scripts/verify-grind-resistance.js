const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const sourceRoot = path.resolve(process.argv[2] || path.join(__dirname, "..", "Source Code"));
const appSource = fs.readFileSync(
  path.join(sourceRoot, "BlackSpiritHub.Resources.Black_Spirit_Hub.js"),
  "utf8"
);
const catalogSource = fs.readFileSync(
  path.join(sourceRoot, "Assets", "GrindTracker", "grind-spots.js"),
  "utf8"
);
const innerEdaniaCatalogSource = fs.readFileSync(
  path.join(sourceRoot, "Assets", "GrindTracker", "grind-spots-inner-edania.js"),
  "utf8"
);
const catalogCorrectionsSource = fs.readFileSync(
  path.join(sourceRoot, "Assets", "GrindTracker", "grind-spots-corrections.js"),
  "utf8"
);

function extractExpression(pattern, label) {
  const match = appSource.match(pattern);
  assert(match, `Could not extract ${label}.`);
  return vm.runInNewContext(`(${match[1]})`, Object.create(null));
}

const crystalGroups = extractExpression(
  /const grindResistanceCrystalGroups=(\[.*?\]);\r?\nconst grindSpotCcOverrides=/s,
  "resistance crystal groups"
);
const ccOverrides = extractExpression(
  /const grindSpotCcOverrides=(\{.*?\});\r?\nconst grindMaxCapOverrides=/s,
  "grind-zone CC overrides"
);
const maxCapOverrides = extractExpression(
  /const grindMaxCapOverrides=(\{.*?\});\r?\ngrindSpotCcOverrides\[/s,
  "grind-zone maximum-stat overrides"
);
const innerEdaniaCcOverrides = extractExpression(
  /Object\.assign\(grindSpotCcOverrides,(\{[^\r\n]*"aphrodon temple"[^\r\n]*\})\);/,
  "Inner Edania CC overrides"
);
const innerEdaniaMaxCapOverrides = extractExpression(
  /Object\.assign\(grindMaxCapOverrides,(\{[^\r\n]*"aphrodon temple"[^\r\n]*\})\);/,
  "Inner Edania maximum-stat overrides"
);
Object.assign(ccOverrides, innerEdaniaCcOverrides);
Object.assign(maxCapOverrides, innerEdaniaMaxCapOverrides);
assert(
  appSource.includes('grindSpotCcOverrides["dehkia thornwood forest"]=["knockback","float"];'),
  "The current Dehkia Thornwood Knockback/Floating correction is missing."
);
ccOverrides["dehkia thornwood forest"] = ["knockback", "float"];
for (const [name, ccs, caps] of [
  ["sycraia ruins lower zone", ["knockback", "float"], [1935, 800]],
  ["orzekea", ["knockback", "float"], [1595, 700]]
]) {
  assert(appSource.includes(`grindSpotCcOverrides["${name}"]=`), `Missing current-name CC override for ${name}.`);
  assert(appSource.includes(`grindMaxCapOverrides["${name}"]=`), `Missing current-name stat cap for ${name}.`);
  ccOverrides[name] = ccs;
  maxCapOverrides[name] = caps;
}

const catalogContext = { window: {} };
vm.createContext(catalogContext);
vm.runInContext(catalogSource, catalogContext);
vm.runInContext(innerEdaniaCatalogSource, catalogContext);
vm.runInContext(catalogCorrectionsSource, catalogContext);
const spots = catalogContext.window.BDO_GRIND_SPOTS;
assert(Array.isArray(spots) && spots.length >= 90, "The grind-zone catalog did not load.");

const expectedGroups = [
  {
    ccs: ["knockdown", "bound"],
    primary: ["Sycraia Crystal - Adamantine", "bdfoundry-15742.png"],
    fallback: ["Ancient Magic Crystal of Nature - Adamantine", "bdfoundry-ancient-nature.webp"]
  },
  {
    ccs: ["knockback", "float"],
    primary: ["Sycraia Crystal - Fighting Spirit", "bdfoundry-15743.png"],
    fallback: ["Ancient Magic Crystal of Nature - Fighting Spirit", "bdfoundry-ancient-nature.webp"]
  },
  {
    ccs: ["stun", "stiffness", "freeze"],
    primary: ["Sycraia Crystal - Giant", "bdfoundry-15744.png"],
    fallback: ["Ancient Magic Crystal of Nature - Giant", "bdfoundry-ancient-nature.webp"]
  }
];

assert.strictEqual(crystalGroups.length, expectedGroups.length, "Expected exactly three resistance families.");
expectedGroups.forEach((expected, index) => {
  const actual = crystalGroups[index];
  assert.deepStrictEqual(Array.from(actual.ccs), expected.ccs, `CC family ${index + 1} changed.`);
  assert.strictEqual(actual.primary.name, expected.primary[0]);
  assert(actual.primary.icon.endsWith(expected.primary[1]));
  assert.strictEqual(actual.fallback.name, expected.fallback[0]);
  assert(actual.fallback.icon.endsWith(expected.fallback[1]));
  assert(actual.effect.endsWith("Resistance +25%"));
});

function normalizeName(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[\[\]'()]/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function spotCcs(spot) {
  const key = normalizeName(spot && spot.name);
  if (Object.prototype.hasOwnProperty.call(ccOverrides, key)) return ccOverrides[key];
  const type = String((spot && spot.type) || "normal").toLowerCase();
  if (type === "human") return ["stun", "stiffness", "freeze"];
  if (type === "kama" || type === "demi" || type === "edania") return ["knockdown", "bound"];
  return ["knockback", "float"];
}

function recommendations(spot) {
  const ccs = new Set(spotCcs(spot));
  return crystalGroups.filter(group => group.ccs.some(cc => ccs.has(cc)));
}

const knownCcs = new Set(crystalGroups.flatMap(group => Array.from(group.ccs)));
for (const spot of spots) {
  const ccs = spotCcs(spot);
  const cards = recommendations(spot);
  assert.strictEqual(new Set(cards.map(card => card.primary.name)).size, cards.length, `${spot.name} has duplicate cards.`);
  for (const cc of ccs) {
    assert(knownCcs.has(cc), `${spot.name} has an unmapped CC token: ${cc}`);
    assert(cards.some(card => card.ccs.includes(cc)), `${spot.name} does not recommend resistance for ${cc}.`);
  }
  assert(ccs.length > 0 || cards.length === 0, `${spot.name} should render the neutral resistance state.`);
}

function spot(name) {
  const result = spots.find(item => item.name === name);
  assert(result, `Missing fixture zone: ${name}`);
  return result;
}

assert.deepStrictEqual(Array.from(recommendations(spot("Orbita Castle")), group => group.primary.name), ["Sycraia Crystal - Adamantine"]);
for (const name of ["Sycraia Ruins (Lower Zone)", "Sycraia Abyssal Ruins (Upper)"]) {
  assert.deepStrictEqual(Array.from(recommendations(spot(name)), group => group.primary.name), ["Sycraia Crystal - Fighting Spirit"]);
}
assert(!spots.some(item => item.id === 112 || item.id === 914), "Obsolete duplicate profiles must not reach resistance verification.");
assert.deepStrictEqual(Array.from(maxCapOverrides[normalizeName("Orzekea")]), [1595, 700]);
assert.deepStrictEqual(Array.from(recommendations(spot("Star's End")), group => group.primary.name), ["Sycraia Crystal - Giant"]);
assert.deepStrictEqual(Array.from(recommendations(spot("[Dehkia] Thornwood Forest")), group => group.primary.name), ["Sycraia Crystal - Fighting Spirit"]);
const innerEdaniaFixtures = [
  ["Aphrodon Temple", 917, 400, 470, "1", 14, [2090, 810], ["knockdown", "bound"], "Sycraia Crystal - Adamantine"],
  ["Hermesia Inner Castle", 918, 405, 485, "1", 16, [2220, 830], ["knockback", "float"], "Sycraia Crystal - Fighting Spirit"],
  ["Magaia Temple", 919, 410, 490, "1", 17, [2340, 840], ["stun", "stiffness", "freeze"], "Sycraia Crystal - Giant"],
  ["Aresion Temple", 920, 415, 495, "1", 24, [2455, 850], ["knockdown", "bound"], "Sycraia Crystal - Adamantine"],
  ["Scales of Judgment", 921, 415, 500, "3", 24, [2455, 860], ["stun", "stiffness", "freeze"], "Sycraia Crystal - Giant"],
  ["Event Horizon", 922, 420, 505, "1", 27, [2570, 870], ["stun", "stiffness", "freeze"], "Sycraia Crystal - Giant"]
];
for (const [name, id, ap, dp, players, expectedDropCount, maxCaps, expectedCcs, expectedCrystal] of innerEdaniaFixtures) {
  const zone = spot(name);
  assert.strictEqual(zone.id, id, `${name} has the wrong catalog id.`);
  assert.strictEqual(zone.zone, "Edania", `${name} must be grouped under Edania.`);
  assert.strictEqual(zone.ap, ap, `${name} has the wrong displayed AP recommendation.`);
  assert.strictEqual(zone.dp, dp, `${name} has the wrong displayed DP recommendation.`);
  assert.strictEqual(zone.players, players, `${name} has the wrong party size.`);
  assert.strictEqual(zone.drops.length, expectedDropCount, `${name} does not contain the complete official loot table.`);
  assert.deepStrictEqual(Array.from(spotCcs(zone)), expectedCcs, `${name} has the wrong live-client resistance family.`);
  assert.deepStrictEqual(Array.from(maxCapOverrides[normalizeName(name)]), maxCaps, `${name} has the wrong total AP/DP cap.`);
  assert.deepStrictEqual(Array.from(recommendations(zone), group => group.primary.name), [expectedCrystal], `${name} recommends the wrong resistance crystal.`);
}
for (const name of ["Bashim Base", "Desert Naga Temple", "Traitor's Graveyard"]) {
  assert.strictEqual(recommendations(spot(name)).length, 0, `${name} should use the neutral state.`);
}

ccOverrides["mixed resistance fixture"] = ["knockback", "knockdown"];
assert.deepStrictEqual(
  Array.from(recommendations({ name: "Mixed Resistance Fixture", type: "normal" }), group => group.primary.name),
  ["Sycraia Crystal - Adamantine", "Sycraia Crystal - Fighting Spirit"]
);

const detailStart = appSource.indexOf("function grindRenderSpotDetail()");
const detailEnd = appSource.indexOf("function grindRender(){", detailStart);
const lootIndex = appSource.indexOf('<div class="grindLootGrid">', detailStart);
const panelIndex = appSource.indexOf("${grindRenderResistancePanel(spot)}", lootIndex);
assert(detailStart >= 0 && detailEnd > detailStart && lootIndex > detailStart && panelIndex > lootIndex && panelIndex < detailEnd,
  "The resistance panel must render directly after the loot grid for every zone.");
assert(appSource.includes('data-grind-fallback-icon="${escapeHtml(group.fallback.icon)}"'));
assert(appSource.includes('view.addEventListener("error",event=>'));
assert(appSource.includes("Extra AP Against Monsters +4"));
assert(!appSource.includes("+ Monster AP +4"));

console.log(`Grind resistance verification passed for ${spots.length} zones.`);
