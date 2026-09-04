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
  ["column-gap", /^8px\s*!important$/],
  ["width", /^100%\s*!important$/],
  ["justify-self", /^stretch\s*!important$/],
  ["flex", /^0 0 160px\s*!important$/],
  ["max-width", /^160px\s*!important$/],
  ["height", /^48px\s*!important$/],
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
finalDeclaration(normalNavigationRule, "font", /700 14px\/1\.05 Georgia/, "Normal navigation buttons");
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
const navigationLayoutTokens = [...appNavMarkup[1].matchAll(
  /<button\b[^>]*\bdata-app-view="([^"]+)"[^>]*>|<span\s+class="navRowBreak"\s+aria-hidden="true"><\/span>/g,
)].map((match) => match[1] ?? "__ROW_BREAK__");
const expectedNavigationLayout = [...expectedIcons.keys()];
assert.deepEqual(
  navigationLayoutTokens,
  expectedNavigationLayout,
  "Desktop navigation must retain a balanced nine-button row above a centered eight-button row.",
);
const navigationSpritePath = path.join(path.dirname(scriptPath), "NavigationAssets", "nav-icons.svg");
assert.ok(fs.existsSync(navigationSpritePath), "The shared navigation SVG sprite must ship beside the UI resources.");
const navigationSprite = fs.readFileSync(navigationSpritePath, "utf8");
assert.equal(
  createHash("sha256").update(navigationSprite.replace(/\r\n/g, "\n")).digest("hex"),
  "50769a4e005327a4d78eacabeaf4364221996a2d1d18b8b96d9cee3a5ca1c26e",
  "The approved navigation glyph geometry must remain byte-for-byte identical apart from line endings.",
);
for (const [view, iconId] of expectedIcons) {
  assert.match(
    markup,
    new RegExp(`<button\\b(?=[^>]*\\bdata-app-view="${view}")[^>]*>(?:(?!<\\/button>)[\\s\\S])*?<use\\s+href="NavigationAssets/nav-icons\\.svg\\?v=cartographers-brass-2026(?:0827|0903)#${iconId}"`),
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
  "The shared sprite must contain exactly the 17 live navigation glyphs.",
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
const compactNavigationBreakpoint = stylesheet.lastIndexOf("@media(max-width:1291px){");
assert.ok(compactNavigationBreakpoint >= 0, "The compact navigation breakpoint must remain defined.");
const cartographerNavigationStart = stylesheet.lastIndexOf("/* Cartographer's Brass navigation.");
assert.ok(cartographerNavigationStart >= 0, "The final Cartographer navigation block must remain available.");
const desktopNavigationCss = stylesheet.slice(cartographerNavigationStart, compactNavigationBreakpoint);
const desktopCanvasRules = [...desktopNavigationCss.matchAll(
  /body\[data-style\] \.navFrame>\.appNav\{([^}]*)\}/g,
)];
const desktopCanvasRule = { body: desktopCanvasRules.at(-1)?.[1] ?? "" };
assert.ok(desktopCanvasRule.body, "Desktop navigation must retain its final capped canvas rule.");
for (const [property, value] of [
  ["display", /^grid\s*!important$/],
  ["grid-template-columns", /^repeat\(18,minmax\(0,1fr\)\)\s*!important$/],
  ["justify-content", /^center\s*!important$/],
  ["column-gap", /^8px\s*!important$/],
  ["width", /^min\(100%,1336px\)\s*!important$/],
  ["margin", /^0 auto\s*!important$/],
]) {
  finalDeclaration(desktopCanvasRule, property, value, "Desktop navigation canvas");
}
const nonCustomDesktopCanvasRules = [...desktopNavigationCss.matchAll(
  /body\[data-style\]:not\(\[data-style="custom"\]\) \.navFrame>\.appNav\{([^}]*)\}/g,
)];
const nonCustomDesktopCanvasRule = { body: nonCustomDesktopCanvasRules.at(-1)?.[1] ?? "" };
assert.ok(nonCustomDesktopCanvasRule.body, "Non-Custom themes must override the legacy fullscreen rail.");
for (const [property, value] of [
  ["display", /^grid\s*!important$/],
  ["grid-template-columns", /^repeat\(18,minmax\(0,1fr\)\)\s*!important$/],
  ["justify-content", /^center\s*!important$/],
  ["column-gap", /^8px\s*!important$/],
  ["width", /^min\(100%,1336px\)\s*!important$/],
  ["margin", /^0 auto\s*!important$/],
]) {
  finalDeclaration(nonCustomDesktopCanvasRule, property, value, "Non-Custom desktop navigation canvas");
}
const compactNavigationCss = stylesheet.slice(compactNavigationBreakpoint);
for (const expected of [
  /display:grid!important/,
  /grid-template-columns:repeat\(16,minmax\(0,1fr\)\)!important/,
  /grid-template-columns:repeat\(12,minmax\(0,1fr\)\)!important/,
  /grid-template-columns:repeat\(8,minmax\(0,1fr\)\)!important/,
  /overflow-x:clip!important/,
  /overflow-y:visible!important/,
  /\.navRowBreak\{display:none!important/,
  /max-width:160px!important/,
  /:nth-child\(10\)\{grid-column:auto\/span 2!important\}/,
  /:nth-child\(13\)\{grid-column:2\/span 2!important\}/,
  /:nth-child\(17\)\{grid-column:4\/span 2!important\}/,
]) {
  assert.match(compactNavigationCss, expected, "Compact navigation must retain its responsive wrapping-grid contract.");
}
assert.doesNotMatch(compactNavigationCss, /display:flex!important|flex-wrap:nowrap!important|overflow-x:(?:auto|scroll)!important/, "Final navigation breakpoints must wrap instead of scrolling horizontally.");
assert.equal(17 - 9, 8, "The desktop navigation must center eight buttons beneath the first nine.");
assert.equal(17 - (2 * 6), 5, "The medium navigation's centered third row must contain five buttons.");
assert.doesNotMatch(desktopNavigationCss, /--nav-button-width\s*:/, "Individual navigation tools must not override the shared width.");
assert.doesNotMatch(desktopNavigationCss, /flex-grow\s*:|flex\s*:\s*[^;]*clamp\(/, "Legacy row-expansion rules must not return.");

const desktopFrameRules = [...desktopNavigationCss.matchAll(
  /body\[data-style\] \.navFrame\{([^}]*)\}/g,
)];
const desktopFrameRule = { body: desktopFrameRules.at(-1)?.[1] ?? "" };
assert.ok(desktopFrameRule.body, "The final desktop navigation frame rule must remain available.");
finalDeclaration(desktopFrameRule, "width", /^min\(calc\(100% - 8px\),1364px\)\s*!important$/, "Desktop navigation frame");
finalDeclaration(desktopFrameRule, "margin", /^4px auto 14px\s*!important$/, "Desktop navigation frame");
finalDeclaration(desktopFrameRule, "padding", /^12px\s*!important$/, "Desktop navigation frame");
const nonCustomDesktopFrameRules = [...desktopNavigationCss.matchAll(
  /body\[data-style\]:not\(\[data-style="custom"\]\) \.navFrame\{([^}]*)\}/g,
)];
const nonCustomDesktopFrameRule = { body: nonCustomDesktopFrameRules.at(-1)?.[1] ?? "" };
assert.ok(nonCustomDesktopFrameRule.body, "Non-Custom themes must share the content-hugging frame.");
finalDeclaration(nonCustomDesktopFrameRule, "width", /^min\(calc\(100% - 8px\),1364px\)\s*!important$/, "Non-Custom navigation frame");
finalDeclaration(nonCustomDesktopFrameRule, "margin", /^4px auto 14px\s*!important$/, "Non-Custom navigation frame");
finalDeclaration(nonCustomDesktopFrameRule, "padding", /^12px\s*!important$/, "Non-Custom navigation frame");

const navigationLabelRules = [...desktopNavigationCss.matchAll(new RegExp(
  `${navigationButtonSelector}>\\.navLabel\\s*\\{([^}]*)\\}`,
  "g",
))];
const navigationLabelRule = { body: navigationLabelRules.at(-1)?.[1] ?? "" };
assert.ok(navigationLabelRule.body, "The final desktop navigation-label rule must remain available.");
for (const [property, value] of [
  ["justify-content", /^center\s*!important$/],
  ["text-align", /^center\s*!important$/],
  ["width", /^100%\s*!important$/],
]) {
  finalDeclaration(navigationLabelRule, property, value, "Navigation labels");
}
const navigationIconRule = finalNavigationRule(">\\.navIcon", "Navigation medallions");
finalDeclaration(navigationIconRule, "justify-self", /^center\s*!important$/, "Navigation medallions");

const navigationLockRules = [...desktopNavigationCss.matchAll(
  /body\[data-style\] \.navFrame>\.navPinButton\{([^}]*)\}/g,
)];
const navigationLockRule = { body: navigationLockRules.at(-1)?.[1] ?? "" };
assert.ok(navigationLockRule.body, "The final navigation lock geometry must remain available.");
finalDeclaration(navigationLockRule, "width", /^26px\s*!important$/, "Navigation lock");
finalDeclaration(navigationLockRule, "height", /^26px\s*!important$/, "Navigation lock");
finalDeclaration(navigationLockRule, "right", /^4px\s*!important$/, "Navigation lock");
finalDeclaration(navigationLockRule, "bottom", /^-30px\s*!important$/, "Navigation lock");
const navigationLockGlyphRules = [...desktopNavigationCss.matchAll(
  /body\[data-style\] \.navFrame>\.navPinButton::before\{([^}]*)\}/g,
)];
const navigationLockGlyphRule = { body: navigationLockGlyphRules.at(-1)?.[1] ?? "" };
assert.ok(navigationLockGlyphRule.body, "The final navigation lock glyph geometry must remain available.");
finalDeclaration(navigationLockGlyphRule, "width", /^16px\s*!important$/, "Navigation lock glyph");
finalDeclaration(navigationLockGlyphRule, "height", /^16px\s*!important$/, "Navigation lock glyph");

const narrowNavigationBreakpoint = compactNavigationCss.indexOf("@media(max-width:720px){");
assert.ok(narrowNavigationBreakpoint >= 0, "The narrow navigation breakpoint must remain defined.");
const narrowNavigationCss = compactNavigationCss.slice(narrowNavigationBreakpoint);
for (const expected of [
  /grid-template-columns:repeat\(8,minmax\(0,1fr\)\)!important/,
  /grid-template-columns:32px minmax\(0,1fr\)!important/,
  /height:44px!important/,
  /font-size:12px!important/,
  /\.navGlyph\{width:32px!important;height:32px!important\}/,
]) {
  assert.match(narrowNavigationCss, expected, "Narrow-window navigation must remain smaller than the compact desktop geometry.");
}
for (const style of expectedInterfaceStyles.slice(1)) {
  const rules = [...stylesheet.matchAll(new RegExp(`body\\[data-style="${style}"\\]\\s+\\.navFrame\\{([^}]*)\\}`, "g"))];
  const finalRule = rules.at(-1)?.[1] ?? "";
  assert.match(finalRule, /--nav-accent:/, `The ${style} theme must provide its Cartographer's Brass color.`);
  assert.doesNotMatch(finalRule, /(?:width|height|padding|margin|border-radius|grid-template|font)\s*:/, `The ${style} theme may change navigation colors, not geometry.`);
}
const customNavigationRules = [...stylesheet.matchAll(/body\[data-mode="light"\]\[data-style="custom"\]\s+\.navFrame\{([^}]*)\}/g)];
assert.match(
  customNavigationRules.at(-1)?.[1] ?? "",
  /(?:^|;)\s*--nav-label\s*:\s*#f4e5c0\s*(?:;|$)/,
  "Custom light mode must keep bright, readable navigation labels on the dark plaques.",
);

const customOrnamentRules = [...stylesheet.matchAll(
  /body\[data-style="custom"\]\s+\.windowTitleBar>\.headerCenterCrest\s*,\s*body\[data-style="custom"\]\s+\.navFrame>\.navCrest\s*\{([^}]*)\}/g,
)];
assert.ok(customOrnamentRules.length, "The Custom theme must explicitly suppress both legacy center ornaments.");
assert.match(
  customOrnamentRules.at(-1)[1],
  /(?:^|;)\s*visibility\s*:\s*hidden\s*!important\s*(?:;|$)/,
  "The Custom theme must suppress both legacy center ornaments without collapsing title-bar alignment.",
);
const customFramePseudoRules = [...stylesheet.matchAll(
  /body\[data-style="custom"\]\s+\.navFrame::before\s*,\s*body\[data-style="custom"\]\s+\.navFrame::after\s*\{([^}]*)\}/g,
)];
assert.ok(customFramePseudoRules.length, "The Custom theme must explicitly reset its full-frame navigation pseudos.");
assert.match(
  customFramePseudoRules.at(-1)[1],
  /(?:^|;)\s*transform\s*:\s*none\s*!important\s*(?:;|$)/,
  "Custom navigation frame artwork must not inherit the legacy fullscreen diamond rotation.",
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
