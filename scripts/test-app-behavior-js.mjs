import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const scriptPath = process.argv[2];
if (!scriptPath) {
  throw new Error("Pass the Black Spirit Hub JavaScript path.");
}

const source = fs.readFileSync(scriptPath, "utf8");
const startMarker = "let appBehaviorSettingsLoaded=false;";
const endMarker = "appearanceEl.backgroundStrength?.addEventListener";
const start = source.indexOf(startMarker);
const end = source.indexOf(endMarker, start);
if (start < 0 || end <= start) {
  throw new Error("Could not isolate the app-behavior JavaScript block.");
}
const appBehaviorSource = source.slice(start, end);

function createDeferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function createHarness(initialBridge) {
  let bridge = initialBridge;
  const handlers = new Map();
  const notifications = [];
  const warnings = [];
  const label = {
    title: "",
    setAttribute(name, value) {
      if (name === "title") this.title = value;
    },
  };
  const toggle = {
    checked: false,
    disabled: true,
    closest(selector) {
      return selector === ".switch" ? label : null;
    },
    addEventListener(name, handler) {
      handlers.set(name, handler);
    },
  };
  const context = vm.createContext({
    appearanceEl: { minimizeToTray: toggle },
    bridgeCall(command, payload) {
      return Promise.resolve().then(() => bridge(command, payload));
    },
    NotificationService: {
      ShowInfo(message, title) {
        notifications.push({ kind: "info", message, title });
      },
      ShowError(message, title) {
        notifications.push({ kind: "error", message, title });
      },
    },
    console: {
      warn(...args) {
        warnings.push(args);
      },
    },
    Error,
    Promise,
  });
  new vm.Script(appBehaviorSource, { filename: scriptPath }).runInContext(context);

  return {
    toggle,
    label,
    handlers,
    notifications,
    warnings,
    setBridge(nextBridge) {
      bridge = nextBridge;
    },
    initialize(options = {}) {
      context.__appBehaviorOptions = options;
      return vm.runInContext("initializeAppBehaviorSettings(__appBehaviorOptions)", context);
    },
    state() {
      return vm.runInContext(
        "({ loaded: appBehaviorSettingsLoaded, savedValue: appBehaviorSavedValue, saving: appBehaviorSaveInFlight })",
        context,
      );
    },
  };
}

{
  const harness = createHarness(async command => {
    assert.equal(command, "getAppBehaviorSettings");
    return { minimizeToTray: false };
  });
  assert.equal(await harness.initialize(), true);
  assert.equal(harness.toggle.checked, false);
  assert.equal(harness.toggle.disabled, false);
  assert.equal(harness.state().loaded, true);
}

{
  const harness = createHarness(async () => ({ minimizeToTray: false }));
  await harness.initialize();
  harness.setBridge(async (command, payload) => {
    assert.equal(command, "saveAppBehaviorSettings");
    assert.equal(payload.minimizeToTray, true);
    return { minimizeToTray: true };
  });
  harness.toggle.checked = true;
  await harness.handlers.get("change")();
  assert.equal(harness.toggle.checked, true);
  assert.equal(harness.toggle.disabled, false);
  assert.equal(harness.state().savedValue, true);
}

{
  const harness = createHarness(async () => ({ minimizeToTray: false }));
  await harness.initialize();
  harness.setBridge(async command => {
    if (command === "saveAppBehaviorSettings") throw new Error("save failed");
    if (command === "getAppBehaviorSettings") return { minimizeToTray: true };
    throw new Error(`Unexpected command: ${command}`);
  });
  harness.toggle.checked = true;
  await harness.handlers.get("change")();
  assert.equal(harness.toggle.checked, true);
  assert.equal(harness.toggle.disabled, false);
  assert.equal(harness.state().loaded, true);
  assert.equal(harness.notifications.at(-1)?.kind, "error");
}

{
  const harness = createHarness(async () => ({ minimizeToTray: false }));
  await harness.initialize();
  harness.setBridge(async () => {
    throw new Error("bridge unavailable");
  });
  harness.toggle.checked = true;
  await harness.handlers.get("change")();
  assert.equal(harness.toggle.checked, false);
  assert.equal(harness.toggle.disabled, true);
  assert.equal(harness.state().loaded, false);
}

{
  const pending = createDeferred();
  const harness = createHarness(async command => {
    assert.equal(command, "getAppBehaviorSettings");
    return pending.promise;
  });
  const silentLoad = harness.initialize();
  const visibleLoad = harness.initialize({ showError: true });
  pending.reject(new Error("load failed"));
  assert.equal(await silentLoad, false);
  assert.equal(await visibleLoad, false);
  assert.equal(harness.toggle.disabled, true);
  assert.equal(harness.notifications.filter(item => item.kind === "error").length, 1);
}

console.log("App behavior JavaScript verification passed.");
