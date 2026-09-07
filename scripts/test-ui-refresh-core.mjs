import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const root = process.argv[2] || path.resolve("Source Code");
const source = fs.readFileSync(path.join(root, "Assets/UiRefresh/core.js"), "utf8");
const css = fs.readFileSync(path.join(root, "Assets/UiRefresh/core.css"), "utf8");
const html = fs.readFileSync(path.join(root, "BlackSpiritHub.Resources.Black_Spirit_Hub.html"), "utf8");
class Element {
  constructor(tag = "div") { this.tagName = tag; this.children = []; this.dataset = {}; this.attrs = {}; this.events = {}; this.style = { setProperty() {} }; this.className = ""; this.value = ""; this.ownText = ""; this.hidden = false; this.classList = { add: value => { this.className += ` ${value}`; }, contains: value => this.className.split(/\s+/).includes(value) }; }
  set textContent(value) { this.ownText = String(value); this.children = []; }
  get textContent() { return this.ownText + this.children.map(node => node.textContent).join(" "); }
  detach() { if (this.parent) this.parent.children.splice(this.parent.children.indexOf(this), 1); }
  append(...nodes) { for (const node of nodes) { node.detach(); this.children.push(node); node.parent = this; } }
  prepend(...nodes) { nodes.forEach(node => node.detach()); this.children.unshift(...nodes); nodes.forEach(node => { node.parent = this; }); }
  before(node) { node.detach(); this.parent.children.splice(this.parent.children.indexOf(this), 0, node); node.parent = this.parent; }
  after(node) { node.detach(); this.parent.children.splice(this.parent.children.indexOf(this) + 1, 0, node); node.parent = this.parent; }
  setAttribute(name, value) { this.attrs[name] = value; }
  addEventListener(name, callback) { (this.events[name] ||= []).push(callback); }
  emit(name, extra = {}) { for (const callback of this.events[name] || []) callback({ target: this, preventDefault() {}, ...extra }); }
  click() { this.emit("click"); }
  focus() { this.focused = true; }
  matches(selector) { return selector.split(",").some(part => { const term = part.trim(); return term.startsWith("#") ? this.id === term.slice(1) : term.startsWith(".") ? this.classList.contains(term.slice(1)) : this.tagName === term; }); }
  querySelectorAll(selector) { return this.children.flatMap(node => [...(node.matches(selector) ? [node] : []), ...node.querySelectorAll(selector)]); }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  closest(selector) { return this.matches(selector) ? this : this.parent?.closest(selector) || null; }
}
function setup(saved = null) {
  const body = new Element("body"), documentEvents = {}, events = [], values = new Map();
  if (saved !== null) values.set("blackSpiritHub.uiRefresh", saved);
  values.set("blackSpiritHub.appearance", "preserve-existing-theme");
  const document = { body, documentElement: new Element("html"), readyState: "loading", createElement: tag => new Element(tag), createComment: () => new Element("comment"), getElementById: id => body.querySelector(`#${id}`), querySelector: selector => body.querySelector(selector), addEventListener: (name, callback) => { documentEvents[name] = callback; }, dispatchEvent: event => events.push(event) };
  const view = new Element(); view.id = "settingsView";
  const shell = new Element(); shell.className = "settingsShell"; view.append(shell); body.append(view);
  const grid = new Element(); grid.className = "settingsGrid"; shell.append(grid);
  const controls = new Element(); controls.className = "settingsControls"; grid.append(controls);
  const rowIds = ["minimizeToTrayEnabled", "openImmediatelyWhenReady", "themeModeToggle", "interfaceDensity", "cornerStyle", "reduceMotion", "backgroundStrength", "toastNotificationsEnabled", "toastDuration", "backgroundMarketUpdatesEnabled", "refreshBackgroundMarketStatus"];
  const originals = rowIds.map(id => { const row = new Element(); row.className = "settingRow"; const input = new Element("input"); input.id = id; input.textContent = id; row.append(input); controls.append(row); return { id, input, row, parent: controls }; });
  for (const id of ["themePresetControls", "backgroundPresetControls"]) { const card = new Element(); card.id = id; card.className = "settingsCard presetControlled"; shell.append(card); originals.push({ id, input: card, row: card, parent: shell }); }
  for (const id of ["interfaceStyle", "interfacePreviewGrid"]) { const node = new Element(); node.id = id; controls.append(node); originals.push({ id, input: node, row: node, parent: controls }); }
  const intro = new Element(); intro.className = "interfacePreviewIntro"; controls.append(intro);
  let failStorage = false;
  const context = { document, window: {}, localStorage: { getItem: key => values.get(key) || null, setItem: (key, value) => { if (failStorage) throw Error("full"); values.set(key, value); } }, CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options.detail; } }, setTimeout, clearTimeout };
  vm.runInNewContext(source, context);
  documentEvents.DOMContentLoaded();
  return { context, api: context.window.BshUiRefresh, document, body, originals, values, shell, events, fail: () => { failStorage = true; } };
}
const app = setup();
assert.equal(app.api.isEnabled(), true);
assert.equal(app.body.dataset.uiRefresh, "on");
assert.equal(app.shell.hidden, true);
assert.equal(app.body.querySelectorAll(".uiSettingsTab").length, 4);
for (const item of app.originals) {
  assert.equal(app.document.getElementById(item.id), item.input, `${item.id} retains identity and listeners`);
  assert.notEqual(item.row.parent, item.parent, `${item.id} moved into a category`);
  assert.equal(app.body.querySelectorAll(`#${item.id}`).length, 1, `${item.id} not duplicated`);
}
const search = app.body.querySelector(".uiSettingsSearch");
search.value = "volume"; search.emit("input");
const visibleEntries = app.body.querySelectorAll(".uiSettingsEntry").filter(node => !node.hidden);
assert.equal(visibleEntries.length, 1);
assert.match(visibleEntries[0].textContent, /Boss notifications/);
search.value = "nonexistent-setting"; search.emit("input");
assert.equal(app.body.querySelector(".uiSettingsEmpty").hidden, false);
search.emit("keydown", { key: "Escape" });
assert.equal(search.value, "");
assert.equal(app.api.save({ enabled: false, textSize: "extra-large" }), true);
assert.equal(app.body.dataset.uiRefresh, "off");
assert.equal(app.shell.hidden, false);
for (const item of app.originals) assert.equal(item.row.parent, item.parent, `${item.id} returned to its old container`);
assert.equal(app.api.settings().textSize, "extra-large");
assert.equal(app.values.get("blackSpiritHub.appearance"), "preserve-existing-theme");
app.api.save({ enabled: true }); app.api.save({ enabled: false }); app.api.save({ enabled: true });
for (const item of app.originals) assert.equal(app.body.querySelectorAll(`#${item.id}`).length, 1);
const appearance = app.body.querySelectorAll(".uiSettingsTab")[1]; appearance.click();
assert.equal(app.api.settings().settingsTab, "appearance");
assert.equal(appearance.attrs["aria-selected"], "true");
appearance.emit("keydown", { key: "ArrowRight" });
assert.equal(app.api.settings().settingsTab, "notifications");
app.fail();
assert.equal(app.api.save({ enabled: false }), false);
assert.equal(app.api.isEnabled(), true, "Failed writes must not falsely claim persistence");
assert.match(app.document.getElementById("uiRefreshStatus").textContent, /could not be saved/);
assert.equal(setup("broken-json").api.settings().textSize, "standard");
assert.equal(setup('{"enabled":false,"textSize":"__proto__"}').api.settings().textSize, "standard");
assert.equal(app.api.matches("TTS Voice Volume", "voice volume"), true);
assert.equal(app.api.matches("Text size", "TEXT"), true);
assert.ok(app.events.every(event => event.type === "bsh:ui-refresh" && typeof event.detail.enabled === "boolean"));
assert.match(css, /data-ui-refresh="on"/);
assert.match(css, /focus-visible/);
assert.match(css, /prefers-reduced-motion/);
for (const module of ["core", "navigation", "grind-market", "weeklies-recipes"]) {
  assert.ok(html.includes(`Assets/UiRefresh/${module}.js`));
  assert.ok(html.includes(`Assets/UiRefresh/${module}.css`));
}
assert.ok(html.indexOf("Assets/UiRefresh/core.js") > html.indexOf('src="BlackSpiritHub.Resources.Black_Spirit_Hub.js'));
console.log("UI refresh core: settings identity/restore, search, keyboard tabs, independent text size, failed saves, and asset integration passed.");
