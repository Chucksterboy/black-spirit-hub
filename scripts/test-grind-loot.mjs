import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const sourceRoot = path.resolve(process.argv[2] || path.join(import.meta.dirname, "..", "Source Code"));
const fixturePath = path.join(import.meta.dirname, "..", "tests", "fixtures", "grind-loot-client-20260903.json");
const fixture = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
const read = file => fs.readFileSync(path.join(sourceRoot, file), "utf8");
const clone = value => JSON.parse(JSON.stringify(value));
const normalize = value => String(value || "").normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/g, "");
const files = [
  "Assets/GrindTracker/grind-spots.js",
  "Assets/GrindTracker/grind-spots-inner-edania.js",
  "Assets/GrindTracker/grind-spots-corrections.js"
];
const context = { window: {} };
vm.createContext(context);
for (const file of files.slice(0, 2)) vm.runInContext(read(file), context, { filename: file });
const original = clone(context.window.BDO_GRIND_SPOTS);
vm.runInContext(read(files[2]), context, { filename: files[2] });
const actual = clone(context.window.BDO_GRIND_SPOTS);
const originalById = new Map(original.map(spot => [spot.id, spot]));
const byId = new Map(actual.map(spot => [spot.id, spot]));
const auditedIds = new Set(fixture.spots.map(spot => spot.catalogId));

assert.equal(fixture.spots.length, 23, "The audited set must include current, former, and Morning Light zones");
assert.equal(auditedIds.size, 23, "Audit identities must be unique");
assert.match(fixture.source.identityWarning, /never the extracted name/i);
assert.match(fixture.source.poolBoundary, /absent here alone is not evidence/i);
for (const hash of Object.values(fixture.source.extractedFiles)) assert.match(hash, /^[0-9a-f]{64}$/);
assert.equal(byId.size, actual.length, "Catalog zone IDs must remain unique");
assert.equal(actual.length, 98, "This loot correction must not add or remove grind zones");

// The old metadata layer predates this loot audit and remains in force.
const existingMetadataCorrections = new Map([
  [4, { players: "1" }], [149, { ap: 280, dp: 350 }], [150, { ap: 250, dp: 320 }],
  [167, { ap: 340 }], [169, { name: "Orzekea", zone: "Atoraxxion", type: "normal" }],
  [908, { name: "Sycraia Ruins (Lower Zone)" }],
  [911, { ap: 370, dp: 440, players: "3" }], [912, { ap: 350, dp: 427, players: "3" }]
]);
const metadataKeys = ["id", "name", "zone", "ap", "dp", "players", "type", "spotType", "trashId", "icon", "primaryTrash"];
for (const spot of actual) {
  const before = { ...originalById.get(spot.id), ...(existingMetadataCorrections.get(spot.id) || {}) };
  for (const key of metadataKeys) assert.deepEqual(spot[key], before[key], `Loot corrections must preserve ${spot.name}'s ${key}`);
  if (!auditedIds.has(spot.id)) assert.deepEqual(spot.drops, before.drops, `${spot.name}'s unaudited loot must remain untouched`);
}
assert.ok(!byId.has(112) && !byId.has(914), "Previously retired duplicate zones must stay retired");

// Official reclassification removes this shared highest-tier set
// from Zephyros, Star's End and Sycraia, not from Gavinya or Inner Edania.
const highestTierIds = ["1178", "767293", "767294", "767296", "767337", "767338", "767353", "821341", "821342", "821343", "821459"];
const highestTierNames = new Set(highestTierIds.map(id => normalize(fixture.items[id].name)));
const formerHighestTier = new Set([905, 907, 908]);
const morningLight = new Set([165, 166, 167, 168]);
const faintOriginName = normalize("Faint Origin of Dark Hunger");

for (const expected of fixture.spots) {
  const spot = byId.get(expected.catalogId);
  const before = originalById.get(expected.catalogId);
  assert.ok(spot, `Missing audited zone ${expected.name}`);
  assert.equal(spot.name, expected.name);
  assert.ok(expected.lootItemIds.includes(expected.primaryTrashId), `${expected.name}'s record must contain its identity anchor`);
  assert.equal(fixture.items[expected.primaryTrashId].name, expected.primaryTrashName);
  assert.equal(normalize(spot.primaryTrash), normalize(expected.primaryTrashName), `${expected.name} was mapped to the wrong client record`);
  if ([906, 909, 910].includes(spot.id)) assert.match(expected.identityCaveat, /common reward pool only/i);

  const nameMap = new Map(spot.drops.map(drop => [normalize(drop.name), drop]));
  const idSet = new Set(spot.drops.map(drop => String(drop.id)));
  const expectedNames = new Set(expected.lootItemIds.map(id => normalize(fixture.items[id].name)));
  const originalNames = new Set(before.drops.map(drop => normalize(drop.name)));
  const hasSpecificArtifacts = expected.lootItemIds.some(id => /Artifact - /i.test(fixture.items[id].name));
  assert.equal(nameMap.size, spot.drops.length, `${spot.name} has duplicate name aliases`);
  assert.equal(idSet.size, spot.drops.length, `${spot.name} has duplicate item IDs`);
  assert.equal(spot.drops.filter(drop => drop.isTrash).length, 1, `${spot.name} must retain exactly one primary trash row`);

  for (const id of expected.lootItemIds) {
    const item = fixture.items[id];
    assert.ok(item, `Fixture item ${id} is missing`);
    const matching = nameMap.get(normalize(item.name));
    assert.ok(matching, `${spot.name} must advertise ${item.name} (${id})`);
    // Existing string aliases stay stable; newly introduced rows use real IDs.
    if (!originalNames.has(normalize(item.name))) assert.equal(String(matching.id), id, `New ${item.name} must use its current numeric item ID`);
  }

  const allowedRemoval = name =>
    (formerHighestTier.has(spot.id) && highestTierNames.has(name)) ||
    (morningLight.has(spot.id) && name === faintOriginName) ||
    ([901, 902].includes(spot.id) && name === normalize("Deboreka Accessories")) ||
    (hasSpecificArtifacts && name === normalize("Any Artifact"));
  for (const oldDrop of before.drops) {
    const name = normalize(oldDrop.name);
    if (allowedRemoval(name)) {
      assert.ok(!nameMap.has(name), `${spot.name} must remove obsolete or replaced ${oldDrop.name}`);
    } else {
      assert.deepEqual(nameMap.get(name), oldDrop, `${spot.name} must preserve ${oldDrop.name}; client absence alone is not a removal proof`);
    }
  }
  for (const drop of spot.drops) {
    const name = normalize(drop.name);
    assert.ok(originalNames.has(name) || expectedNames.has(name), `${spot.name} invented an unverified drop: ${drop.name}`);
    assert.match(drop.icon, /^Assets\/GrindTracker\/icons-clean\/[a-zA-Z0-9._-]+\.(?:png|webp|svg)$/);
    assert.ok(fs.existsSync(path.join(sourceRoot, drop.icon)), `${spot.name} has missing artwork for ${drop.name}`);
    if (!originalNames.has(name)) {
      assert.match(String(drop.id), /^\d+$/, `New ${drop.name} must not introduce a custom ID alias`);
      assert.ok(Number.isInteger(drop.grade) && drop.grade >= 0 && drop.grade <= 4);
      assert.equal(typeof drop.isTrash, "boolean");
    }
    for (const key of Object.keys(drop)) assert.doesNotMatch(key, /^(?:dropRate|rate|chance|probability|quantity|quantityMin|quantityMax)$/i, "Advertised item presence must not invent server-side rates or amounts");
  }
  if (formerHighestTier.has(spot.id)) for (const name of highestTierNames) assert.ok(!nameMap.has(name), `${spot.name} retained a removed highest-tier reward`);
  if (morningLight.has(spot.id)) assert.ok(!nameMap.has(faintOriginName), `${spot.name} retained removed Faint Origin of Dark Hunger`);
}

for (const id of [916, 917]) {
  const names = new Set(byId.get(id).drops.map(drop => normalize(drop.name)));
  for (const name of highestTierNames) assert.ok(names.has(name), `${byId.get(id).name} must retain the currently available highest-tier rewards`);
}
for (const id of ["767341", "767342", "821417", "821418"]) {
  assert.ok(byId.get(916).drops.some(drop => normalize(drop.name) === normalize(fixture.items[id].name)), "Gavinya must retain its turquoise rewards");
}
for (const id of ["event-incarnation-of-corruption", "event-apostle-of-malevolence"]) {
  assert.ok(byId.get(907).drops.some(drop => drop.id === id), "Keep existing Star's End encounter markers without separate removal evidence");
}

const html = read("BlackSpiritHub.Resources.Black_Spirit_Hub.html");
const order = files.map(file => html.indexOf(file));
assert.ok(order.every(index => index >= 0) && order[0] < order[1] && order[1] < order[2], "The loot correction must run after both historical data layers");
assert.ok(order[2] < html.indexOf("BlackSpiritHub.Resources.Black_Spirit_Hub.js"), "The app must capture the corrected catalog");

const appJs = read("BlackSpiritHub.Resources.Black_Spirit_Hub.js");
const priceStart = appJs.indexOf("const GRIND_NO_VALUE_ITEM_IDS=");
const priceEnd = appJs.indexOf("function grindMarketItemIds()", priceStart);
assert.ok(priceStart >= 0 && priceEnd > priceStart, "Pricing helpers must remain testable");
const pricing = { GRIND_FIXED_ITEM_PRICES: {}, GRIND_MARKET_ITEM_ID_OVERRIDES: {} };
vm.createContext(pricing);
vm.runInContext(appJs.slice(priceStart, priceEnd), pricing);
for (const id of ["66946", "735302", "44270"]) {
  const drop = { id, name: fixture.items[id].name };
  assert.equal(pricing.grindDropHasNoValue(drop), true, `${drop.name} must not show an unavailable market price`);
  assert.equal(pricing.grindDropMarketId(drop), "", `${drop.name} must not request Central Market prices`);
}
assert.equal(pricing.grindDropMarketId({ id: "767293", name: fixture.items["767293"].name }), "767293", "New tradable rewards must still request their numeric market IDs");

vm.runInContext(read(files[2]), context, { filename: files[2] });
assert.deepEqual(clone(context.window.BDO_GRIND_SPOTS), actual, "Reapplying corrections must not duplicate or further change loot");
console.log(`Grind loot checks passed: ${fixture.spots.length} audited zones; ${actual.length} total zones; retained unrelated loot and metadata.`);
