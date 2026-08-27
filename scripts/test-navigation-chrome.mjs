import assert from "node:assert/strict";
import { createHash } from "node:crypto";
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
  "All 13 selectable interface styles must retain the shared rectangular navigation buttons.",
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

const navigationButtonSelector = String.raw`body\[data-style\]\s+\.navFrame\s+\.appNav\s*>\s*\.navButton\[data-app-view\]`;

function finalNavigationRule(suffix, description) {
  const matches = [...stylesheet.matchAll(new RegExp(
    `${navigationButtonSelector}${suffix}\\s*\\{([^}]*)\\}`,
    "g",
  ))];
  const match = matches.at(-1);
  assert.ok(match, `${description} must use the universal direct navigation-button selector.`);
  return { body: match[1], index: match.index };
}

function finalDeclaration(rule, property, expected, description) {
  const propertyPattern = property.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const matches = [...rule.body.matchAll(new RegExp(
    `(?:^|;)\\s*${propertyPattern}\\s*:\\s*([^;]+)`,
    "g",
  ))];
  const value = matches.at(-1)?.[1].trim();
  assert.ok(value, `${description} must explicitly set ${property}.`);
  assert.match(value, expected, `${description} must retain the Cartographer's Brass ${property} contract.`);
  return value;
}

const normalNavigationRule = finalNavigationRule("", "Normal navigation buttons");
for (const [property, value] of [
  ["grid-template-columns", /^40px minmax\(0,1fr\)\s*!important$/],
  ["height", /^52px\s*!important$/],
  ["border-radius", /^5px\s*!important$/],
  ["clip-path", /^none\s*!important$/],
  ["mask", /^none\s*!important$/],
  ["-webkit-mask", /^none\s*!important$/],
  ["background-image", /linear-gradient\(/],
  ["box-shadow", /inset/],
]) {
  finalDeclaration(normalNavigationRule, property, value, "Normal navigation buttons");
}
finalDeclaration(
  normalNavigationRule,
  "background-color",
  /var\(--nav-card-bottom\)/,
  "Normal navigation buttons",
);
finalDeclaration(normalNavigationRule, "border", /var\(--nav-accent-deep\)/, "Normal navigation buttons");
finalDeclaration(normalNavigationRule, "font", /700 15px\/1\.03 Georgia/, "Normal navigation buttons");
assert.match(
  normalNavigationRule.body,
  /overflow\s*:\s*hidden\s*!important/,
  "Normal navigation buttons must contain their text-safe map artwork.",
);

for (const [suffix, assetSuffix, description] of [
  [":hover", "-hover", "Hovered navigation buttons"],
  ["\\.active", "-active", "Active navigation buttons"],
]) {
  const stateRule = finalNavigationRule(suffix, description);
  finalDeclaration(stateRule, "background-image", /(?:linear|radial)-gradient\(/, description);
  finalDeclaration(
    stateRule,
    "background-color",
    /var\(--nav-(?:card-bottom|accent)\)/,
    description,
  );
  finalDeclaration(stateRule, "border-color", /var\(--nav-accent/, description);
  const previousArtwork = stylesheet.lastIndexOf(`background-image:var(--asset-nav${assetSuffix})`);
  assert.ok(
    previousArtwork < stateRule.index,
    `${description} must override the obsolete theme-specific raster plaque.`,
  );
}
assert.ok(
  stylesheet.lastIndexOf("background-image:var(--asset-nav)!") < normalNavigationRule.index,
  "Normal navigation buttons must override the obsolete theme-specific raster plaque.",
);

const insetRule = finalNavigationRule("::before", "Navigation button inset");
finalDeclaration(insetRule, "content", /^""\s*!important$/, "Navigation button inset");
finalDeclaration(insetRule, "display", /^block\s*!important$/, "Navigation button inset");
finalDeclaration(insetRule, "border", /var\(--nav-accent\)/, "Navigation button inset");
const mapRule = finalNavigationRule("::after", "Navigation cartography artwork");
finalDeclaration(mapRule, "content", /^""\s*!important$/, "Navigation cartography artwork");
finalDeclaration(mapRule, "display", /^block\s*!important$/, "Navigation cartography artwork");
finalDeclaration(mapRule, "background", /radial-gradient\(/, "Navigation cartography artwork");
finalDeclaration(mapRule, "mask-image", /linear-gradient\(90deg,transparent 0 64%/, "Navigation cartography artwork");
finalDeclaration(mapRule, "opacity", /^\.88\s*!important$/, "Navigation cartography artwork");
assert.ok(
  mapRule.index > normalNavigationRule.index,
  "Text-safe cartography must be part of the final shared navigation treatment.",
);

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
  ["eventsView", "nav-icon-events"],
  ["bracketsView", "nav-icon-brackets"],
  ["masteryBracketsView", "nav-icon-mastery-brackets"],
  ["recipeBookView", "nav-icon-recipe-book"],
  ["dehkiaFuelView", "nav-icon-dehkia-fuel"],
  ["lightstoneSetsView", "nav-icon-lightstone-sets"],
]);
assert.equal(
  [...markup.matchAll(/<span class="navRowBreak" aria-hidden="true"><\/span>/g)].length,
  2,
  "Desktop navigation must retain explicit 7/6/3 row breaks.",
);
const navigationSpritePath = path.join(path.dirname(scriptPath), "NavigationAssets", "nav-icons.svg");
assert.ok(fs.existsSync(navigationSpritePath), "The shared navigation SVG sprite must ship beside the UI resources.");
const navigationSprite = fs.readFileSync(navigationSpritePath, "utf8");
assert.equal(
  createHash("sha256").update(navigationSprite.replace(/\r\n/g, "\n")).digest("hex"),
  "873a9cb686009b4d7906e4561a0edfa6289b661e41c86560b4603b227d9df718",
  "The approved navigation glyph geometry must remain byte-for-byte identical apart from line endings.",
);
for (const [view, iconId] of expectedIcons) {
  assert.match(
    markup,
    new RegExp(`<button\\b(?=[^>]*\\bdata-app-view="${view}")[^>]*>(?:(?!<\\/button>)[\\s\\S])*?<use\\s+href="NavigationAssets/nav-icons\\.svg\\?v=cartographers-brass-20260827#${iconId}"`),
    `The ${view} button must use its immutable shared vector glyph.`,
  );
  assert.match(
    navigationSprite,
    new RegExp(`<symbol\\s+id="${iconId}"\\s+viewBox="0 0 64 64">`),
    `The shared sprite must define ${iconId} on the common 64px geometry.`,
  );
}
assert.equal(
  [...navigationSprite.matchAll(/<symbol\s+id="nav-icon-[^"]+"/g)].length,
  expectedIcons.size,
  "The shared sprite must contain exactly the 16 live navigation glyphs.",
);
assert.doesNotMatch(navigationSprite, /#[0-9a-f]{3,8}|rgb\(|hsl\(/i, "Navigation glyph geometry must not hardcode theme colors.");
assert.doesNotMatch(
  navigationSprite,
  /\b(?:fill|stroke)="(?!currentColor"|none")[^"]+"/i,
  "Navigation glyph paint must be limited to currentColor or none so themes cannot alter its inner design.",
);
assert.match(stylesheet, /\.navGlyph\{[^}]*color:inherit!important/, "Every navigation glyph must inherit the active theme palette.");
assert.match(
  stylesheet,
  /body\[data-style\] \.navFrame \.appNav>\.navButton\[data-app-view\]>\.navIcon\{[^}]*width:40px!important;[^}]*height:40px!important;/,
  "Desktop navigation medallions must use the compact 40px geometry.",
);
assert.match(
  stylesheet,
  /body\[data-style\] \.navFrame \.appNav>\.navButton\[data-app-view\] \.navGlyph\{[^}]*width:40px!important;[^}]*height:40px!important;/,
  "Desktop navigation glyphs must use the compact 40px geometry.",
);
const narrowNavigationCss = stylesheet.slice(stylesheet.lastIndexOf("@media(max-width:720px){"));
for (const expected of [
  /grid-template-columns:36px minmax\(0,1fr\)!important/,
  /height:48px!important/,
  /font-size:14px!important/,
  /\.navGlyph\{width:36px!important;height:36px!important\}/,
]) {
  assert.match(narrowNavigationCss, expected, "Narrow-window navigation must remain smaller than the compact desktop geometry.");
}
for (const style of expectedInterfaceStyles.slice(1)) {
  const rules = [...stylesheet.matchAll(new RegExp(`body\\[data-style="${style}"\\]\\s+\\.navFrame\\{([^}]*)\\}`, "g"))];
  const finalRule = rules.at(-1)?.[1] ?? "";
  assert.match(finalRule, /--nav-accent:/, `The ${style} theme must provide its Cartographer's Brass color.`);
  assert.doesNotMatch(finalRule, /(?:width|height|padding|margin|border-radius|grid-template|font)\s*:/, `The ${style} theme may change navigation colors, not geometry.`);
}

const customOrnamentRules = [...stylesheet.matchAll(
  /body\[data-style="custom"\]\s+\.windowTitleBar>\.headerCenterCrest\s*,\s*body\[data-style="custom"\]\s+\.navFrame>\.navCrest\s*\{([^}]*)\}/g,
)];
assert.ok(customOrnamentRules.length, "The Custom theme must explicitly suppress both legacy center ornaments.");
assert.match(
  customOrnamentRules.at(-1)[1],
  /(?:^|;)\s*visibility\s*:\s*hidden\s*!important\s*(?:;|$)/,
  "The Custom theme must suppress both legacy center ornaments without collapsing title-bar alignment.",
);

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

console.log("Navigation chrome and all 13 theme button styles verification passed.");
