import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const sourceRoot = path.resolve(process.argv[2] || path.join(import.meta.dirname, "..", "Source Code"));
const appVersion = fs.readFileSync(path.join(sourceRoot, "BlackSpiritHub/AppVersion.cs"), "utf8");
const updater = fs.readFileSync(path.join(sourceRoot, "BlackSpiritHub/UpdateCheckerService.cs"), "utf8");
const form = fs.readFileSync(path.join(sourceRoot, "BlackSpiritHub/CalculatorForm.cs"), "utf8");
const preferences = fs.readFileSync(path.join(sourceRoot, "BlackSpiritHub/MicrosoftStoreMigrationPreferences.cs"), "utf8");
const preferenceExporter = fs.readFileSync(path.join(sourceRoot, "Assets/AppBehavior/store-migration-preferences.js"), "utf8");
const ui = fs.readFileSync(path.join(sourceRoot, "BlackSpiritHub.Resources.Black_Spirit_Hub.js"), "utf8");

assert.match(appVersion, /MicrosoftStoreProductId = "9PNLW455K1GN"/);
assert.match(appVersion, /ms-windows-store:\/\/pdp\/\?ProductId=/);
assert.match(appVersion, /https:\/\/apps\.microsoft\.com\/detail\//);
assert.match(updater, /StoreManaged: true/);
assert.match(updater, /MicrosoftStoreMigration: true/);
assert.match(updater, /GetAppAndOptionalStorePackageUpdatesAsync/);
assert.match(updater, /MicrosoftStorePackagePaths\.HasPackageIdentity/);
assert.match(form, /case "openMicrosoftStore":/);
assert.match(form, /OpenMicrosoftStorePage\(\)/);
assert.match(form, /saveMicrosoftStoreMigrationPreferences/);
assert.match(form, /ScheduleMicrosoftStoreHandoffClose/);
assert.match(
  form,
  /private void ScheduleMicrosoftStoreHandoffClose\(\)\s*\{\s*if \(IsDisposed\)/,
  "The Store update handoff must close a running app after opening Microsoft Store."
);
assert.doesNotMatch(
  form,
  /private void ScheduleMicrosoftStoreHandoffClose\(\)\s*\{\s*if \(DistributionChannel\.IsMicrosoftStore \|\| IsDisposed\)/,
  "Store builds must not stay open and block their own MSIX update."
);
assert.doesNotMatch(form, /DownloadAndLaunchUpdateInstallerAsync/);
assert.doesNotMatch(ui, /downloadAndInstallUpdate/);
assert.match(preferences, /blackSpiritHub\./);
assert.match(preferences, /bsh\.uiRefresh\.navigation\.v1/);
assert.match(preferences, /localStorage\.getItem\(key\) === null/);
assert.match(preferenceExporter, /bdoFontFavorites/);
assert.match(preferenceExporter, /BshStoreMigration/);

const start = ui.indexOf("function collectStoreMigrationPreferences");
const end = ui.indexOf("function couponEscape", start);
assert.ok(start >= 0 && end > start, "Store migration updater functions are missing.");

const classes = new Set();
const listeners = new Map();
const alert = {
  textContent: "",
  title: "",
  tabIndex: 0,
  attributes: new Map(),
  classList: {
    add: value => classes.add(value),
    remove: value => classes.delete(value),
    toggle: (value, enabled) => enabled ? classes.add(value) : classes.delete(value)
  },
  setAttribute: (name, value) => alert.attributes.set(name, String(value)),
  addEventListener: (type, handler) => listeners.set(type, handler)
};
const calls = [];
const notices = [];
const storageValues = new Map([
  ["blackSpiritHub.appearance", "{\"theme\":\"gold\"}"],
  ["bdoFontFavorites", "[\"font-1\"]"],
  ["bsh.uiRefresh.navigation.v1", "{\"favorites\":[\"homeView\"]}"],
  ["unrelated.preference", "do-not-copy"]
]);
const localStorage = {
  get length() { return storageValues.size; },
  key: index => [...storageValues.keys()][index] ?? null,
  getItem: key => storageValues.get(key) ?? null,
  setItem: (key, value) => storageValues.set(key, String(value))
};
const context = vm.createContext({
  updateState: {info: null, installing: false},
  updateEl: {alert},
  settingWriteTimers: new Map(),
  flushSetting: () => {},
  localStorage,
  BshStoreMigration: {
    collect: () => Object.fromEntries([...storageValues].filter(([key]) => key !== "unrelated.preference"))
  },
  NotificationService: {
    ShowInfo: (message, title) => notices.push({kind: "info", message, title}),
    ShowError: (message, title) => notices.push({kind: "error", message, title})
  },
  bridgeCall: async (command, payload) => {
    calls.push({command, payload});
    return {opened: true};
  }
});
vm.runInContext(ui.slice(start, end), context);

context.applyUpdateStatus({updateAvailable: true, microsoftStoreMigration: true});
assert.equal(alert.textContent, "New update available");
assert.equal(alert.title, "Get the new version from Microsoft Store");
assert.equal(classes.has("show"), true);
await context.installUpdateFromAlert();
assert.deepEqual(calls.map(call => call.command), ["saveMicrosoftStoreMigrationPreferences", "openMicrosoftStore"]);
assert.deepEqual(JSON.parse(JSON.stringify(calls[0].payload)), {
  "blackSpiritHub.appearance": "{\"theme\":\"gold\"}",
  "bdoFontFavorites": "[\"font-1\"]",
  "bsh.uiRefresh.navigation.v1": "{\"favorites\":[\"homeView\"]}"
});
assert.equal(alert.textContent, "New update available", "The Store call-to-action remains available after the Store opens.");
assert.equal(classes.has("busy"), false);
assert.equal(notices.at(-1)?.kind, "info");
assert.match(notices.at(-1)?.message || "", /will close/);

calls.length = 0;
context.applyUpdateStatus({updateAvailable: false, storeManaged: true, message: "Updates are managed by the Microsoft Store."});
assert.equal(classes.has("show"), false, "Store-installed builds must not show the legacy migration banner.");
await context.installUpdateFromAlert();
assert.deepEqual(calls, [], "A Store-managed update state must not launch an installer or migration action.");

context.applyUpdateStatus({updateAvailable: false, storeManaged: true, storeUpdateAnnounced: true, announcedVersion: "0.9.69.0"});
assert.equal(alert.textContent, "Version 0.9.69.0 is rolling out in Microsoft Store");
assert.equal(alert.title, "Microsoft Store is preparing this update for your device.");
assert.equal(alert.tabIndex, -1, "A Worker announcement must be passive until Microsoft Store confirms a package update.");
assert.equal(alert.attributes.get("role"), "status");
assert.equal(classes.has("passive"), true);
await context.installUpdateFromAlert();
assert.deepEqual(calls, [], "A Worker announcement alone must not open Store or close the running app.");

context.applyUpdateStatus({updateAvailable: true, storeManaged: true, message: "A new version is available in the Microsoft Store."});
assert.equal(alert.textContent, "New update available", "Store builds show the same update action when Microsoft Store reports an available package.");
assert.equal(alert.title, "Open Microsoft Store and close Black Spirit Hub to update");
assert.equal(alert.tabIndex, 0);
assert.equal(alert.attributes.get("role"), "button");
assert.equal(classes.has("passive"), false);
assert.equal(classes.has("show"), true);
await context.installUpdateFromAlert();
assert.deepEqual(calls.map(call => call.command), ["openMicrosoftStore"], "Store updates open Microsoft Store without exporting migration preferences.");
assert.equal(notices.at(-1)?.kind, "info");
assert.match(notices.at(-1)?.message || "", /is closing/);

calls.length = 0;
let prevented = false;
context.applyUpdateStatus({updateAvailable: true, microsoftStoreMigration: true});
listeners.get("keydown")({key: "Enter", preventDefault: () => { prevented = true; }});
await new Promise(resolve => setImmediate(resolve));
assert.equal(prevented, true, "The Store migration control must remain keyboard-accessible.");
assert.deepEqual(calls.map(call => call.command), ["saveMicrosoftStoreMigrationPreferences", "openMicrosoftStore"]);

console.log("Store updates: legacy direct builds migrate through the Store; Store builds show a Store-managed update action only when a package update is available; no GitHub installer command remains.");
