import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const scriptPath = process.argv[2];
if (!scriptPath) {
  throw new Error("Pass the Black Spirit Hub JavaScript path.");
}

const source = fs.readFileSync(scriptPath, "utf8");
assert.match(
  source,
  /function applyAppearance\(settings = \{\}\) \{[\s\S]*?saveAppearance\([\s\S]*?scheduleFixedChromeOffsetSync\(\);[\s\S]*?\n\}/,
  "Appearance changes must resync fixed chrome after title/navigation dimensions change.",
);
assert.match(
  source,
  /function scheduleFixedChromeOffsetSync\(\)\{[\s\S]*?requestAnimationFrame\(syncFixedChromeOffset\)/,
  "Fixed chrome resyncs must be coalesced through animation frames.",
);
const startMarker = 'const navigationFrame=document.querySelector(".navFrame");';
const endMarker = "function initializeAppView(viewId){";
const start = source.indexOf(startMarker);
const end = source.indexOf(endMarker, start);
if (start < 0 || end <= start) {
  throw new Error("Could not isolate the navigation chrome JavaScript block.");
}
const navigationSource = source.slice(start, end);

function createClassList() {
  const values = new Set();
  return {
    contains(name) {
      return values.has(name);
    },
    toggle(name, force) {
      const enabled = force === undefined ? !values.has(name) : Boolean(force);
      if (enabled) values.add(name);
      else values.delete(name);
      return enabled;
    },
  };
}

function createHarness(storedValue) {
  const bodyClassList = createClassList();
  const navHandlers = new Map();
  const buttonHandlers = new Map();
  const documentHandlers = new Map();
  const buttonAttributes = new Map([["aria-pressed", "false"]]);
  const persisted = [];
  const timers = new Map();
  let nextTimerId = 1;
  let fixedOffsetSyncs = 0;

  const button = {
    title: "Keep navigation visible",
    focusVisible: false,
    addEventListener(name, handler) {
      buttonHandlers.set(name, handler);
    },
    setAttribute(name, value) {
      buttonAttributes.set(name, String(value));
    },
    getAttribute(name) {
      return buttonAttributes.get(name) ?? null;
    },
    matches(selector) {
      return selector === ":focus-visible" && this.focusVisible;
    },
  };
  const navigationFrame = {
    addEventListener(name, handler) {
      navHandlers.set(name, handler);
    },
    contains(target) {
      return target === button;
    },
  };
  const titleBar = { getBoundingClientRect: () => ({ height: 62 }) };
  const document = {
    activeElement: null,
    body: { classList: bodyClassList },
    querySelector(selector) {
      return selector === ".navFrame" ? navigationFrame : null;
    },
    getElementById(id) {
      if (id === "navigationPinButton") return button;
      if (id === "windowTitleBar") return titleBar;
      return null;
    },
    addEventListener(name, handler) {
      documentHandlers.set(name, handler);
    },
  };
  const context = vm.createContext({
    document,
    Number,
    String,
    Boolean,
    readSetting(key, fallback) {
      assert.equal(key, "navigationPinned");
      return storedValue === undefined ? fallback : storedValue;
    },
    persistSetting(key, value) {
      persisted.push({ key, value });
    },
    syncFixedChromeOffset() {
      fixedOffsetSyncs += 1;
    },
    setTimeout(callback, delay) {
      const id = nextTimerId++;
      timers.set(id, { callback, delay });
      return id;
    },
    clearTimeout(id) {
      timers.delete(id);
    },
  });
  new vm.Script(navigationSource, { filename: scriptPath }).runInContext(context);

  return {
    button,
    navigationFrame,
    document,
    persisted,
    timers,
    navHandlers,
    buttonHandlers,
    documentHandlers,
    initialize() {
      vm.runInContext("initializeNavigationAutoHide()", context);
    },
    state() {
      return {
        pinned: vm.runInContext("navigationPinned", context),
        hidden: bodyClassList.contains("navAutoHidden"),
        pinnedClass: bodyClassList.contains("navPinned"),
        ariaPressed: button.getAttribute("aria-pressed"),
        ariaLabel: button.getAttribute("aria-label"),
        fixedOffsetSyncs,
      };
    },
    runNextTimer(delay) {
      const entry = [...timers.entries()].find(([, timer]) => delay === undefined || timer.delay === delay);
      assert.ok(entry, `Expected a${delay === undefined ? "" : ` ${delay}ms`} timer.`);
      timers.delete(entry[0]);
      entry[1].callback();
    },
  };
}

{
  const harness = createHarness(true);
  harness.initialize();
  assert.deepEqual(harness.state(), {
    pinned: true,
    hidden: false,
    pinnedClass: true,
    ariaPressed: "true",
    ariaLabel: "Keep navigation visible",
    fixedOffsetSyncs: 1,
  });
  assert.equal(harness.timers.size, 0);
}

{
  const harness = createHarness(false);
  harness.initialize();
  assert.equal(harness.timers.size, 1);
  const staleHide = [...harness.timers.values()][0].callback;
  harness.buttonHandlers.get("click")();
  assert.equal(harness.state().pinned, true);
  assert.equal(harness.state().hidden, false);
  assert.equal(harness.timers.size, 0);
  assert.deepEqual(harness.persisted.at(-1), { key: "navigationPinned", value: true });
  staleHide();
  assert.equal(harness.state().hidden, false, "A stale hide timer must not hide pinned navigation.");

  harness.buttonHandlers.get("click")();
  assert.equal(harness.state().pinned, false);
  assert.equal(harness.state().ariaPressed, "false");
  assert.deepEqual(harness.persisted.at(-1), { key: "navigationPinned", value: false });
  harness.runNextTimer(3000);
  assert.equal(harness.state().hidden, true);
}

{
  const harness = createHarness("true");
  harness.initialize();
  assert.equal(harness.state().pinned, false, "Non-Boolean saved values must not pin navigation.");
}

{
  const harness = createHarness(false);
  harness.initialize();
  harness.runNextTimer(3000);
  assert.equal(harness.state().hidden, true);
  harness.documentHandlers.get("pointerdown")({ pointerType: "touch", clientY: 70 });
  assert.equal(harness.state().hidden, false, "The strip below the title bar must reveal navigation for touch users.");
  harness.navHandlers.get("pointerenter")();
  assert.equal(harness.state().hidden, false);

  harness.document.activeElement = harness.button;
  harness.button.focusVisible = true;
  harness.navHandlers.get("pointerleave")({ clientY: 300 });
  assert.equal(harness.timers.size, 0, "Visible keyboard focus must prevent auto-hide.");

  harness.document.activeElement = null;
  harness.button.focusVisible = false;
  harness.navHandlers.get("focusout")();
  harness.runNextTimer(0);
  harness.runNextTimer(3000);
  assert.equal(harness.state().hidden, true);
}

console.log("Navigation chrome JavaScript verification passed.");
