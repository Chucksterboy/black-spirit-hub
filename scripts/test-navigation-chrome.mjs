import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const scriptPath = process.argv[2];
if (!scriptPath) {
  throw new Error("Pass the Black Spirit Hub JavaScript path.");
}

const source = fs.readFileSync(scriptPath, "utf8");
const resourceBasePath = scriptPath.replace(/\.js$/i, "");
assert.notEqual(resourceBasePath, scriptPath, "The navigation script must be a JavaScript resource.");
const stylesheet = fs.readFileSync(`${resourceBasePath}.css`, "utf8");
const markup = fs.readFileSync(`${resourceBasePath}.html`, "utf8");

const expectedInterfaceStyles = [
  "custom", "fantasy", "cyber", "cinematic", "crystal", "tactical", "retro",
  "abyssal", "royal", "paper", "foundry", "void", "caravan",
];
const interfaceStyleOptions = markup.match(
  /<select\b[^>]*\bid="interfaceStyle"[^>]*>([\s\S]*?)<\/select>/,
);
assert.ok(interfaceStyleOptions, "The interface-style selector must remain available.");
const selectableInterfaceStyles = [...interfaceStyleOptions[1].matchAll(
  /<option\b[^>]*\bvalue="([^"]+)"/g,
)].map((match) => match[1]);
assert.deepEqual(
  selectableInterfaceStyles,
  expectedInterfaceStyles,
  "All 13 selectable interface styles must remain available.",
);

const interfacePresets = source.match(/const INTERFACE_PRESETS\s*=\s*\{([\s\S]*?)\n\};/);
assert.ok(interfacePresets, "The interface preset definitions must remain available.");
const presetInterfaceStyles = [...interfacePresets[1].matchAll(
  /^\s*([a-z][a-z\d]*)\s*:/gm,
)].map((match) => match[1]);
assert.deepEqual(
  presetInterfaceStyles,
  expectedInterfaceStyles.slice(1),
  "Every selectable non-custom interface style must retain its existing appearance preset.",
);
for (const style of expectedInterfaceStyles.slice(1)) {
  assert.match(
    stylesheet,
    new RegExp(`body\\[data-style="${style}"\\]\\s*\\{`),
    `The ${style} theme must retain its existing theme-specific colors.`,
  );
}

// Keep this dependency-free test focused on the navigation's stable contract.
// Actual CSS layout, states, XML parsing, and all theme/breakpoint combinations
// are verified by test-navigation-layout.mjs in a browser.
const expectedIcons = new Map([
  ["homeView", "nav-icon-home"],
  ["calculatorView", "nav-icon-trade-distance"],
  ["marketView", "nav-icon-market-analytics"],
  ["portraitView", "nav-icon-portrait-replacer"],
  ["fontChangerView", "nav-icon-font-changer"],
  ["couponsView", "nav-icon-coupons"],
  ["settingsView", "nav-icon-settings"],
  ["playerGuildView", "nav-icon-player-guild-search"],
  ["grindTrackerView", "nav-icon-grind-zones"],
  ["resetTimersView", "nav-icon-timers"],
  ["weekliesView", "nav-icon-weeklies"],
  ["eventsView", "nav-icon-events"],
  ["bracketsView", "nav-icon-brackets"],
  ["masteryBracketsView", "nav-icon-mastery-brackets"],
  ["recipeBookView", "nav-icon-recipe-book"],
  ["dehkiaFuelView", "nav-icon-dehkia-fuel"],
  ["lightstoneSetsView", "nav-icon-lightstone-sets"],
]);
const appNavMarkup = markup.match(/<nav\b[^>]*class="appNav"[^>]*>([\s\S]*?)<\/nav>/);
assert.ok(appNavMarkup, "The application navigation markup must remain available.");
const expectedNavigationIcons = new Map([...expectedIcons].filter(([view]) => view !== "settingsView"));
const navigationButtons = [...appNavMarkup[1].matchAll(
  /<button\b[^>]*\bdata-app-view="([^"]+)"[^>]*>([\s\S]*?)<\/button>/g,
)];
assert.deepEqual(
  navigationButtons.map((match) => match[1]),
  [...expectedNavigationIcons.keys()],
  "The 16 navigation tiles must retain their order, with Settings moved to the title bar.",
);
const settingsButton = markup.match(/<button\b(?=[^>]*\bid="windowSettings")([^>]*)>([\s\S]*?)<\/button>/);
assert.ok(settingsButton, "Settings must remain accessible through a title-bar button.");
for (const attribute of ['aria-label="Settings"', 'aria-controls="settingsView"', 'aria-pressed="false"', 'data-app-view="settingsView"']) {
  assert.ok(settingsButton[1].includes(attribute), "The Settings cog must retain " + attribute + ".");
}
assert.match(settingsButton[1], /\bclass="(?=[^"]*\bwindowControl\b)(?=[^"]*\bwindowSettingsButton\b)[^"]+"/, "The Settings cog must use the title-bar control styling.");
assert.match(markup, /<div\b[^>]*\bclass="windowControls"[^>]*>\s*<button\b[^>]*\bid="windowSettings"[^>]*>[\s\S]*?<\/button>\s*<button\b[^>]*\bid="windowMinimize"/, "The Settings cog must sit immediately left of minimize, inside the window controls.");
assert.match(markup, /<[^>]+\bid="settingsView"/, "The Settings page itself must remain available.");
assert.doesNotMatch(appNavMarkup[1], /navRowBreak/, "Navigation rows must wrap responsively without hardcoded markup breaks.");
assert.match(
  markup,
  /<div\b(?=[^>]*\bclass="navFrame")(?=[^>]*\bdata-nav-design="arcane-glass")[^>]*>/,
  "The navigation frame must select the shared Arcane Glass design.",
);
assert.match(
  markup,
  /<\/nav>\s*<button\b(?=[^>]*\bid="navigationPinButton")(?=[^>]*\baria-pressed="(?:true|false)")(?=[^>]*\baria-label="[^"]+")[^>]*>/,
  "The accessible pin control must remain outside the navigation button grid.",
);

const navigationSpritePath = path.join(path.dirname(scriptPath), "NavigationAssets", "nav-icons.svg");
assert.ok(fs.existsSync(navigationSpritePath), "The shared navigation SVG sprite must ship beside the UI resources.");
const navigationSprite = fs.readFileSync(navigationSpritePath, "utf8");
const symbolIds = [...navigationSprite.matchAll(/<symbol\b[^>]*\bid="([^"]+)"/g)].map((match) => match[1]);
assert.deepEqual(
  [...symbolIds].sort(),
  [...expectedIcons.values()].sort(),
  "The shared sprite must define exactly the 17 live navigation symbols, without duplicates.",
);
const assetVersions = new Set();
for (const [view, buttonMarkup] of navigationButtons.map((match) => [match[1], match[2]])) {
  const iconId = expectedIcons.get(view);
  const references = [...buttonMarkup.matchAll(/<use\b[^>]*\bhref="([^"]+)"/g)];
  assert.equal(references.length, 1, view + " must render exactly one shared vector glyph.");
  const reference = new URL(references[0][1], "https://navigation.test/");
  assert.equal(reference.pathname, "/NavigationAssets/nav-icons.svg", view + " must use the shared sprite.");
  assert.equal(reference.hash, "#" + iconId, view + " must retain its intended icon mapping.");
  assert.ok(reference.searchParams.get("v"), view + " must version the shared navigation asset.");
  assetVersions.add(reference.searchParams.get("v"));
  assert.match(
    navigationSprite,
    new RegExp('<symbol\\b(?=[^>]*\\bid="' + iconId + '")(?=[^>]*\\bviewBox="0 0 64 64")[^>]*>'),
    iconId + " must use the common 64px coordinate system.",
  );
  assert.match(
    markup,
    new RegExp('<[^>]+\\bid="' + view + '"'),
    view + " must still resolve to an application view.",
  );
  assert.match(
    buttonMarkup,
    /<span\b[^>]*class="navIcon"[^>]*aria-hidden="true"[\s\S]*<\/span>\s*<span\b[^>]*class="navLabel"[^>]*>\S[\s\S]*<\/span>\s*$/,
    view + " must have decorative icon markup before its readable label.",
  );
}
assert.equal(assetVersions.size, 1, "All navigation buttons must load the same version of the shared sprite.");
const settingsIcon = settingsButton[2].match(/<use\b[^>]*\bhref="([^"]+)"/);
assert.ok(settingsIcon, "The title-bar Settings cog must use the existing shared vector icon.");
const settingsIconReference = new URL(settingsIcon[1], "https://navigation.test/");
assert.equal(settingsIconReference.pathname, "/NavigationAssets/nav-icons.svg");
assert.equal(settingsIconReference.hash, "#nav-icon-settings");
assert.ok(assetVersions.has(settingsIconReference.searchParams.get("v")), "The Settings cog must load the same sprite version as the navigation tiles.");
assert.doesNotMatch(navigationSprite, /#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/i, "Navigation glyphs must not hardcode theme colors.");
assert.doesNotMatch(
  navigationSprite,
  /\b(?:fill|stroke)="(?!currentColor"|none")[^"]+"/i,
  "Every navigation glyph paint must use currentColor or none.",
);
assert.doesNotMatch(
  navigationSprite,
  /<(?:image|foreignObject|script|style)\b|\b(?:style|on\w+)=/i,
  "Shared navigation artwork must remain self-contained vector geometry.",
);

// The same Arcane geometry must inherit the active appearance instead of
// supplying another fixed palette that masks custom themes or presets.
const arcaneStart = stylesheet.indexOf("/* Arcane Glass navigation.");
const arcaneEnd = stylesheet.indexOf("/* Weeklies planner:", arcaneStart);
assert.ok(arcaneStart >= 0 && arcaneEnd > arcaneStart, "The shared Arcane navigation styles must be identifiable.");
const arcaneStyles = stylesheet.slice(arcaneStart, arcaneEnd);
const arcanePalette = arcaneStyles.match(
  /body\[data-style\]\s+\.navFrame\[data-nav-design="arcane-glass"\]\s*\{([^}]+)\}/,
);
assert.ok(arcanePalette, "Arcane navigation must share one theme-derived palette.");
assert.match(arcanePalette[1], /--nav-accent\s*:\s*var\(\s*--a1\s*\)\s*;/, "Navigation accents must inherit the active theme's primary accent.");
assert.match(arcanePalette[1], /--nav-panel-top\s*:[^;]*var\(\s*--bg1\s*\)/, "The panel's upper surface must derive from the active theme background.");
assert.match(arcanePalette[1], /--nav-panel-bottom\s*:[^;]*var\(\s*--bg0\s*\)/, "The panel's lower surface must derive from the active theme background.");
assert.match(arcanePalette[1], /--nav-glyph\s*:[^;]*var\(\s*--nav-accent\s*\)/, "Navigation glyph colour must derive from the theme accent.");
const accentDeclarations = [...arcaneStyles.matchAll(/--nav-accent\s*:\s*([^;\n}]+)/g)];
assert.equal(accentDeclarations.length, 1, "Arcane presets must not override the shared accent with fixed colours.");
assert.match(
  arcaneStyles,
  />\s*\.navIcon\s*\{[^}]*\bcolor\s*:\s*var\(\s*--nav-glyph\s*\)/,
  "The icon container must expose the derived glyph colour.",
);
assert.match(arcaneStyles, /\.navGlyph\s*\{[^}]*\bcolor\s*:\s*inherit\b/, "SVG glyphs must inherit the icon container's colour.");
assert.match(navigationSprite, /\b(?:fill|stroke)="currentColor"/, "SVG artwork must consume the inherited icon colour.");

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
    add(...names) {
      for (const name of names) values.add(name);
    },
    remove(...names) {
      for (const name of names) values.delete(name);
    },
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

// Exercise the actual shared click router without a browser or native host.
// A title-bar control must open the same Settings view as the former tile,
// preserve page fades, and clear its pressed state after another view opens.
{
  const activationStart = source.indexOf("function activateAppView(button){");
  const activationEnd = source.indexOf('window.addEventListener("resize", syncFixedChromeOffset);', activationStart);
  assert.ok(activationStart >= 0 && activationEnd > activationStart, "The shared app-view activation block must remain available.");
  const activationSource = source.slice(activationStart, activationEnd);
  const buttons = [...expectedIcons.keys()].map((view) => {
    const attributes = new Map(view === "settingsView" ? [["aria-pressed", "false"]] : []);
    const handlers = new Map();
    return {
      id: view === "settingsView" ? "windowSettings" : "",
      dataset: { appView: view }, classList: createClassList(), handlers,
      addEventListener(name, handler) { handlers.set(name, handler); },
      hasAttribute(name) { return attributes.has(name); },
      getAttribute(name) { return attributes.get(name) ?? null; },
      setAttribute(name, value) { attributes.set(name, String(value)); },
    };
  });
  const views = new Map([...expectedIcons.keys()].map((id) => [id, { id, classList: createClassList() }]));
  const homeButton = buttons.find((button) => button.dataset.appView === "homeView");
  const settingsControl = buttons.find((button) => button.id === "windowSettings");
  homeButton.classList.add("active");
  views.get("homeView").classList.add("active");
  const initialized = [];
  const timers = new Map();
  let nextTimerId = 1;
  let chromeSyncs = 0;
  const context = vm.createContext({
    document: {
      querySelector(selector) {
        assert.equal(selector, ".appView.active");
        return [...views.values()].find((view) => view.classList.contains("active")) ?? null;
      },
      querySelectorAll(selector) {
        assert.equal(selector, "[data-app-view]");
        return buttons;
      },
      getElementById(id) { return id === "windowSettings" ? settingsControl : views.get(id) ?? null; },
    },
    appViewTransitionTimer: 0,
    initializeAppView(id) { initialized.push(id); },
    syncFixedChromeOffset() { chromeSyncs += 1; },
    requestAnimationFrame(callback) { callback(); },
    setTimeout(callback, delay) { const id = nextTimerId++; timers.set(id, { callback, delay }); return id; },
    clearTimeout(id) { timers.delete(id); },
    playerGuildCancelActiveRequest() { throw new Error("Unrelated Player & Guild requests must not be touched."); },
  });
  new vm.Script(activationSource, { filename: scriptPath }).runInContext(context);
  const finishTransition = () => {
    assert.equal(timers.size, 1, "Changing pages must retain exactly one pending fade.");
    const [id, timer] = [...timers.entries()][0];
    assert.equal(timer.delay, 180, "Title-bar Settings must retain the existing page fade duration.");
    timers.delete(id);
    timer.callback();
  };
  settingsControl.handlers.get("click")();
  assert.equal(settingsControl.getAttribute("aria-pressed"), "true", "Opening Settings must mark its cog as pressed.");
  assert.equal(settingsControl.classList.contains("active"), true);
  assert.equal(homeButton.classList.contains("active"), false);
  finishTransition();
  assert.equal(views.get("settingsView").classList.contains("active"), true);
  assert.equal(views.get("homeView").classList.contains("active"), false);
  assert.deepEqual(initialized, ["settingsView"]);
  settingsControl.handlers.get("click")();
  assert.equal(timers.size, 0, "Clicking the already-open Settings page must not restart its fade.");
  homeButton.handlers.get("click")();
  assert.equal(settingsControl.getAttribute("aria-pressed"), "false", "Leaving Settings must clear the cog's pressed state.");
  assert.equal(settingsControl.classList.contains("active"), false);
  finishTransition();
  assert.equal(views.get("homeView").classList.contains("active"), true);
  assert.deepEqual(initialized, ["settingsView", "homeView"]);
  assert.equal(chromeSyncs, 2, "Both title-bar and navigation-tile transitions must refresh chrome offsets.");
}

console.log("Navigation routes, title-bar Settings clicks, shared glyphs, theme-derived colours, 13 styles, and pin/auto-hide behavior verification passed.");
