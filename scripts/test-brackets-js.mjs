import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const scriptPath = process.argv[2];
if (!scriptPath) throw new Error("Pass the Black Spirit Hub JavaScript path.");

const source = fs.readFileSync(scriptPath, "utf8");
const css = fs.readFileSync(scriptPath.replace(/\.js$/i, ".css"), "utf8");
assert.match(css, /#bracketsView \.bracketShell\{width:min\(960px,calc\(100% - 28px\)\)\}/);
const start = source.indexOf("const AP_LOWER_BRACKETS=");
const end = source.indexOf("const MASTERY_LEVELS=", start);
if (start < 0 || end <= start) throw new Error("Could not isolate the AP & DP Brackets JavaScript block.");
const bracketSource = source.slice(start, end);

class FakeClassList {
  constructor() { this.values = new Set(); }
  toggle(name, force) {
    const enabled = force === undefined ? !this.values.has(name) : Boolean(force);
    if (enabled) this.values.add(name); else this.values.delete(name);
    return enabled;
  }
}

class FakeElement {
  constructor(id) {
    this.id = id;
    this.value = "";
    this.textContent = "";
    this.innerHTML = "";
    this.dataset = {};
    this.classList = new FakeClassList();
    this.listeners = new Map();
  }
  addEventListener(type, handler) { this.listeners.set(type, handler); }
}

const ids = [
  "bracketTitle", "bracketCurrent", "bracketGoal", "bracketCurrentLabel", "bracketNextHint",
  "bracketRequiredLabel", "bracketRequired", "bracketGainLabel", "bracketGain", "bracketHead", "bracketRows",
];
const elements = Object.fromEntries(ids.map(id => [id, new FakeElement(id)]));
elements.bracketCurrent.value = "378";
elements.bracketGoal.value = "381";

const document = {
  getElementById: id => elements[id] ?? null,
  querySelectorAll: () => [],
};
const context = vm.createContext({ document, Number, Math, Array, String });
new vm.Script(bracketSource, { filename: scriptPath }).runInContext(context);

function evaluate(expression) { return vm.runInContext(expression, context); }
function evaluateJson(expression) { return JSON.parse(evaluate(`JSON.stringify(${expression})`)); }
function setType(type, current = 0, goal = current) {
  context.__bracketType = type;
  context.__bracketCurrent = String(current);
  context.__bracketGoal = String(goal);
  evaluate("bracketState.type=__bracketType;bracketEl.current.value=__bracketCurrent;bracketEl.goal.value=__bracketGoal");
}
function find(type, value) {
  setType(type, value, value);
  context.__bracketValue = value;
  return evaluateJson("findBracket(__bracketValue)");
}
function next(type, value) {
  setType(type, value, value);
  context.__bracketValue = value;
  return evaluateJson("nextBracket(__bracketValue)");
}

const apBonusBoundaries = new Map([
  [396, 242],
  [397, 245],
  [398, 245],
  [399, 247],
  [400, 247],
  [401, 249],
  [450, 297],
]);
for (const [ap, expected] of apBonusBoundaries) {
  context.__ap = ap;
  assert.equal(evaluate("bracketApBonus(__ap)"), expected, `unexpected Bonus AP at ${ap} displayed AP`);
}

const monsterApBoundaries = new Map([
  [309, 0],
  [310, 8],
  [396, 696],
  [397, 704],
  [398, 712],
  [399, 720],
  [400, 728],
  [401, 744],
  [450, 1528],
]);
for (const [ap, expected] of monsterApBoundaries) {
  context.__ap = ap;
  assert.equal(evaluate("bracketMonsterAdditionalAp(__ap)"), expected, `unexpected Monster Additional AP at ${ap} displayed AP`);
}

const drBoundaries = new Map([
  [480, 90],
  [481, 91],
  [485, 91],
  [486, 92],
  [530, 100],
  [531, 101],
]);
for (const [dp, expected] of drBoundaries) {
  context.__dp = dp;
  assert.equal(evaluate("bracketDrBonus(__dp)"), expected, `unexpected Bonus Damage Reduction at ${dp} displayed DP`);
}

const apLower = evaluateJson("AP_LOWER_BRACKETS");
const apHigh = evaluateJson("AP_HIGH_BRACKETS");
assert.deepEqual(apLower[0], [100, 139, 5]);
assert.deepEqual(apLower.at(-1), [392, 396, 242], "the final existing AP bracket must remain unchanged");
assert.deepEqual(apHigh[0], [397, 398, 245]);
assert.deepEqual(apHigh[1], [399, 400, 247]);
assert.deepEqual(apHigh.at(-1), [449, 450, 297], "the visible AP table must end at the screenshot maximum");

const drLower = evaluateJson("DR_LOWER_BRACKETS");
const drHigh = evaluateJson("DR_HIGH_BRACKETS");
assert.deepEqual(drLower.at(-1), [476, 480, 90], "the final existing DR bracket must remain unchanged");
assert.deepEqual(drHigh[0], [481, 485, 91]);
assert.deepEqual(drHigh[1], [486, 490, 92]);
assert.deepEqual(drHigh.at(-2), [526, 530, 100]);
assert.deepEqual(drHigh.at(-1), [531, 531, 101], "the visible DR table must include and end at 531 DP");

assert.deepEqual(find("ap", 451), [451, 452, 299], "AP calculation must continue above the visible table");
assert.deepEqual(next("ap", 450), [451, 452, 299], "the next AP bracket must continue above 450");
assert.deepEqual(find("dr", 531), [531, 535, 101], "DR calculation must use the complete five-point formula bracket");
assert.deepEqual(find("dr", 536), [536, 540, 102], "DR calculation must continue above the visible table");
assert.deepEqual(next("dr", 531), [536, 540, 102], "the next DR bracket must continue above 531");

assert.deepEqual(find("dp", 400), [395, 400, 29]);
assert.deepEqual(find("dp", 401), [401, 999, 30], "the Damage Reduction Rate tab must remain unchanged");

setType("ap", 400, 401);
evaluate("renderBrackets()");
assert.equal(elements.bracketGainLabel.textContent, "AP & Monster gain");
assert.equal(elements.bracketGain.textContent, "2 AP & 16 Monster AP");
assert.equal(elements.bracketNextHint.textContent, "AP for next bracket: 1 AP");
assert.match(elements.bracketHead.innerHTML, /<th>Monster Additional AP<\/th>/);
assert.match(elements.bracketRows.innerHTML, /<td>397<\/td><td>398<\/td><td>245<\/td>/);
assert.match(elements.bracketRows.innerHTML, /<td>704&ndash;712<\/td>/);
assert.match(elements.bracketRows.innerHTML, /<td>449<\/td><td>450<\/td><td>297<\/td>/);
assert.match(elements.bracketRows.innerHTML, /<td>1512&ndash;1528<\/td><td><span class="bracketBar blue"[^>]*>747<\/span><\/td>/, "Total Attack AP must remain displayed AP plus Bonus AP; Monster Additional AP stays separate");

setType("dr", 530, 531);
evaluate("renderBrackets()");
assert.equal(elements.bracketGain.textContent, "1 DP & 1 dr");
assert.equal(elements.bracketNextHint.textContent, "DP for next bracket: 1 DP");
assert.match(elements.bracketRows.innerHTML, /<td>526<\/td><td>530<\/td><td>100<\/td>/);
assert.match(elements.bracketRows.innerHTML, /<td>531<\/td><td>531<\/td><td>101<\/td>/);

console.log("AP & DP Brackets JavaScript verification passed.");
