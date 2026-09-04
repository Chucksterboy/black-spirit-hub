import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const scriptPath = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(repoRoot, "Source Code", "BlackSpiritHub.Resources.Black_Spirit_Hub.js");
const htmlPath = scriptPath.replace(/\.js$/i, ".html");
const cssPath = scriptPath.replace(/\.js$/i, ".css");
const source = fs.readFileSync(scriptPath, "utf8");
const html = fs.readFileSync(htmlPath, "utf8");
const css = fs.readFileSync(cssPath, "utf8");

const dataStart = source.indexOf("const LIGHTSTONE_SETS=");
const uiStart = source.indexOf("const lightstoneState=", dataStart);
const uiEnd = source.indexOf("// Home dashboard schedule/timer config.", uiStart);
if (dataStart < 0 || uiStart <= dataStart || uiEnd <= uiStart) {
  throw new Error("Could not isolate the Lightstone Sets JavaScript block.");
}

class FakeClassList {
  constructor() { this.values = new Set(); }
  toggle(name, force) {
    const enabled = force === undefined ? !this.values.has(name) : Boolean(force);
    if (enabled) this.values.add(name); else this.values.delete(name);
    return enabled;
  }
  add(name) { this.values.add(name); }
  remove(name) { this.values.delete(name); }
}

class FakeElement {
  constructor(id) {
    this.id = id;
    this.value = "";
    this.textContent = "";
    this.innerHTML = "";
    this.hidden = false;
    this.checked = false;
    this.disabled = false;
    this.dataset = {};
    this.classList = new FakeClassList();
    this.listeners = new Map();
  }
  addEventListener(type, handler) { this.listeners.set(type, handler); }
}

const ids = [
  "lightstoneChooser", "lightstoneStage", "lightstoneStageTitle", "lightstoneStageSubtitle",
  "lightstoneSetGrid", "lightstoneModePill", "lightstoneSearch", "lightstoneCategoryFilter",
  "lightstoneSummary", "lightstoneAmplifiedControl", "lightstoneAmplifiedToggle",
];
const elements = Object.fromEntries(ids.map(id => [id, new FakeElement(id)]));
const document = {
  getElementById: id => elements[id] ?? null,
  querySelectorAll: () => [],
};
const context = vm.createContext({
  document,
  escapeHtml: value => String(value),
  clearTimeout: () => {},
  setTimeout: () => 0,
  requestAnimationFrame: callback => callback(),
});
const lightstoneSource = `${source.slice(dataStart, uiEnd)}
globalThis.__lightstoneSets=LIGHTSTONE_SETS;
globalThis.__lightstonePatch=LIGHTSTONE_PATCH_2026_09_03;
globalThis.__lightstoneRemoved=LIGHTSTONE_REMOVED_2026_09_03;
globalThis.__lightstonePatchSource=LIGHTSTONE_PATCH_2026_09_03_SOURCE;`;
new vm.Script(lightstoneSource, { filename: scriptPath }).runInContext(context);

const sets = JSON.parse(vm.runInContext("JSON.stringify(__lightstoneSets)", context));
const patchNames = JSON.parse(vm.runInContext("JSON.stringify(Object.keys(__lightstonePatch))", context));
const removedNames = JSON.parse(vm.runInContext("JSON.stringify(__lightstoneRemoved)", context));
const patchSource = vm.runInContext("__lightstonePatchSource", context);

const expected = {
  "Delotia": [["Life EXP +17%"], ["Flora: Wildlife", "Flora: Wildlife", "Flora: Wildlife", "Iridescent Lightstone"]],
  "Hand of Manos": [["Life Skill Mastery +30"], ["Flora: Paradise", "Flora: Paradise", "Flora: Paradise", "Iridescent Lightstone"]],
  "Fortress of Nature": [["Life EXP +12%", "Life Skill Mastery +20"], ["Flora: Wildlife", "Flora: Paradise", "Flora: Wildlife", "Iridescent Lightstone"]],
  "Scurrying Weasel": [["Gathering Item Drop Rate +5%", "Gathering EXP +10%", "Gathering Mastery +20", "Gathering Speed +1"], ["Flora: Plains", "Flora: Forest", "Flora: Plains", "Iridescent Lightstone"]],
  "Yawning Hedgehog": [["Gathering Item Drop Rate +10%", "Gathering EXP +10%", "Gathering Mastery +20", "Gathering Speed +1"], ["Flora: Plains", "Flora: Forest", "Flora: Wildlife", "Iridescent Lightstone"]],
  "Choice & Focus: Gathering": [["Gathering Mastery -500", "Gathering EXP +35%"], ["Flora: Plains", "Flora: Plains", "Flora: Wildlife", "Iridescent Lightstone"]],
  "Crouching Predator": [["Hunting EXP +7%", "Hunting Mastery +15"], ["Flora: Trap", "Flora: Track", "Flora: Trap", "Flora: Trap"]],
  "Blink of an Eye": [["Matchlock Reload Speed +10%", "Hunting EXP +10%", "Hunting Mastery +20"], ["Flora: Trap", "Flora: Track", "Flora: Track", "Iridescent Lightstone"]],
  "Choice & Focus: Hunting": [["Hunting Mastery -500", "Hunting EXP +35%"], ["Flora: Trap", "Flora: Trap", "Flora: Wildlife", "Iridescent Lightstone"]],
  "Nibbles": [["Auto-fishing Time -15%", "Fishing EXP +10%", "Fishing Mastery +20", "Fishing Speed +1"], ["Flora: Bite", "Flora: Patience", "Flora: Bite", "Iridescent Lightstone"]],
  "Whaling": [["Chance to Catch High-Quality Fish +6%", "Fishing EXP +10%", "Fishing Mastery +20", "Fishing Speed +1"], ["Flora: Bite", "Flora: Patience", "Flora: Paradise", "Iridescent Lightstone"]],
  "Sharp-eyed Seagull": [["Chance to Catch Rare Fish +5%", "Fishing EXP +10%", "Fishing Mastery +20", "Fishing Speed +1"], ["Flora: Bite", "Flora: Patience", "Flora: Wildlife", "Iridescent Lightstone"]],
  "Choice & Focus: Fishing": [["Fishing Mastery -500", "Fishing EXP +35%"], ["Flora: Bite", "Flora: Bite", "Flora: Wildlife", "Iridescent Lightstone"]],
  "Fundamentals of Cooking": [["Cooking Time -2 sec", "Cooking EXP +10%", "Cooking Mastery +25"], ["Flora: Secret", "Flora: Stir", "Flora: Stir", "Iridescent Lightstone"]],
  "Choice & Focus: Cooking": [["Cooking Mastery -500", "Cooking EXP +35%"], ["Flora: Secret", "Flora: Secret", "Flora: Wildlife", "Iridescent Lightstone"]],
  "Choice & Focus: Training": [["Training Mastery -500", "Training EXP +35%"], ["Flora: Gallop", "Flora: Gallop", "Flora: Wildlife", "Iridescent Lightstone"]],
  "A Fragment of a Star, a Spoonful of the Moon": [["Alchemy Time -2 sec", "Alchemy EXP +10%", "Alchemy Mastery +25"], ["Flora: Time", "Flora: Malleable", "Flora: Malleable", "Iridescent Lightstone"]],
  "Choice & Focus: Alchemy": [["Alchemy Mastery -500", "Alchemy EXP +35%"], ["Flora: Time", "Flora: Time", "Flora: Wildlife", "Iridescent Lightstone"]],
  "Choice & Focus: Sailing": [["Sailing Mastery -500", "Sailing EXP +35%"], ["Flora: Uncharted", "Flora: Uncharted", "Flora: Wildlife", "Iridescent Lightstone"]],
  "Clang! Clang!": [["Processing Success Rate +20%", "Processing EXP +10%", "Processing Mastery +25"], ["Flora: Tool", "Flora: Deft", "Flora: Deft", "Iridescent Lightstone"]],
  "Choice & Focus: Processing": [["Processing Mastery -500", "Processing EXP +35%"], ["Flora: Tool", "Flora: Tool", "Flora: Wildlife", "Iridescent Lightstone"]],
};

assert.equal(patchNames.length, 21, "the official update layer must contain exactly 21 changed combinations");
assert.deepEqual(new Set(patchNames), new Set(Object.keys(expected)), "the official update layer changed an unexpected combination");
assert.deepEqual(removedNames, ["Canine Tooth", "Blacksmith's Blessing", "Refreshing Dream"]);
assert.equal(sets.length, 169, "expected 169 combinations after the three removals");
assert.equal(sets.filter(set => set.type === "combat").length, 87, "expected 87 combat combinations");
assert.equal(sets.filter(set => set.type === "lifeskill").length, 82, "expected 82 Life Skill combinations");
assert.equal(new Set(sets.map(set => set.name)).size, sets.length, "combination names must remain unique");

for (const removedName of removedNames) {
  assert.equal(sets.some(set => set.name === removedName), false, `${removedName} must remain retired`);
}
for (const [name, [effects, lightstones]] of Object.entries(expected)) {
  const matches = sets.filter(set => set.name === name);
  assert.equal(matches.length, 1, `${name} must resolve to exactly one combination`);
  assert.deepEqual(matches[0].effects, effects, `${name} effects do not match the September 3 patch`);
  assert.deepEqual(matches[0].lightstones, lightstones, `${name} ingredients do not match the September 3 patch`);
  assert.equal(matches[0].source, patchSource, `${name} must retain the dated official source`);
}
const lifeSets = sets.filter(set => set.type === "lifeskill");
assert.ok(lifeSets.every(set => set.lightstones.every(stone => stone === "Iridescent Lightstone" || stone.startsWith("Flora: "))), "Life Skill combinations may only use Flora or Iridescent Lightstones");
assert.ok(lifeSets.every(set => set.effects.every(effect => !effect.includes("Weight Limit"))), "retired Weight Limit effects must not remain on Life Skill combinations");
assert.equal(vm.runInContext("Object.keys(__lightstonePatch).every(name=>{const set=__lightstoneSets.find(entry=>entry.name===name),patch=__lightstonePatch[name];return set.effects!==patch.effects&&set.lightstones!==patch.lightstones})", context), true, "patched combinations must own independent arrays");

assert.match(html, /id="lightstoneAmplifiedControl"[^>]*class="lightstoneAmpToggle"/);
assert.match(css, /\.lightstoneAmpToggle\[hidden\]\{display:none!important\}/);
vm.runInContext('lightstoneState.type="lifeskill";renderLightstoneSets()', context);
assert.equal(elements.lightstoneAmplifiedControl.hidden, true, "Life Skill mode must hide the Amplified control");
assert.equal(elements.lightstoneAmplifiedToggle.disabled, true, "Life Skill mode must disable the Amplified toggle");
assert.equal(elements.lightstoneStageSubtitle.hidden, false, "Life Skill update subtitle must be visible");
assert.equal(elements.lightstoneStageSubtitle.textContent, "Updated September 3, 2026 — Life Skill combinations now use only Flora or Iridescent Lightstones.");
assert.doesNotMatch(elements.lightstoneSummary.innerHTML, /Amplified mode on/);

vm.runInContext('lightstoneState.type="combat";renderLightstoneSets()', context);
assert.equal(elements.lightstoneAmplifiedControl.hidden, false, "Combat mode must expose the Amplified control");
assert.equal(elements.lightstoneAmplifiedToggle.disabled, false, "Combat mode must enable the Amplified toggle");
assert.equal(elements.lightstoneStageSubtitle.hidden, true, "the Life Skill patch subtitle must not appear in Combat mode");

console.log("Lightstone Sets September 3, 2026 regression tests passed.");
