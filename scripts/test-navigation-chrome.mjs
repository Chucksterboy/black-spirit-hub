import assert from "node:assert/strict";
import fs from "node:fs";
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

const navigationButtonSelector = String.raw`body\[data-style\]\s+\.navFrame\s+\.appNav\s*>\s*\.navButton`;

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
  assert.match(value, expected, `${description} must keep ${property} free of chevrons and decorative lines.`);
  return value;
}

const normalNavigationRule = finalNavigationRule("", "Normal navigation buttons");
for (const [property, value] of [
  ["border-radius", /^8px\s*!important$/],
  ["clip-path", /^none\s*!important$/],
  ["mask", /^none\s*!important$/],
  ["-webkit-mask", /^none\s*!important$/],
  ["background-image", /^none\s*!important$/],
  ["box-shadow", /^none\s*!important$/],
]) {
  finalDeclaration(normalNavigationRule, property, value, "Normal navigation buttons");
}
finalDeclaration(
  normalNavigationRule,
  "background-color",
  /var\(--(?:surface2|surface|field-bg|bg0|a1)\)/,
  "Normal navigation buttons",
);
finalDeclaration(normalNavigationRule, "border", /var\(--(?:a1|border)\)/, "Normal navigation buttons");
assert.doesNotMatch(
  normalNavigationRule.body,
  /(?:repeating-)?(?:linear|radial|conic)-gradient\s*\(|--asset-nav(?:-hover|-active)?/,
  "Normal navigation buttons must not reintroduce striped artwork or decorative gradients.",
);

for (const [suffix, assetSuffix, description] of [
  [":hover", "-hover", "Hovered navigation buttons"],
  ["\\.active", "-active", "Active navigation buttons"],
]) {
  const stateRule = finalNavigationRule(suffix, description);
  finalDeclaration(stateRule, "background-image", /^none\s*!important$/, description);
  finalDeclaration(
    stateRule,
    "background-color",
    /var\(--(?:surface2|surface|field-bg|bg0|a1)\)/,
    description,
  );
  finalDeclaration(stateRule, "border-color", /var\(--(?:a1|border)\)/, description);
  assert.doesNotMatch(
    stateRule.body,
    /(?:repeating-)?(?:linear|radial|conic)-gradient\s*\(|--asset-nav(?:-hover|-active)?/,
    `${description} must not reintroduce internal decorative lines.`,
  );
  const previousArtwork = stylesheet.lastIndexOf(`background-image:var(--asset-nav${assetSuffix})`);
  assert.ok(
    previousArtwork < stateRule.index,
    `${description} must override the earlier chevron-shaped theme artwork.`,
  );
}
assert.ok(
  stylesheet.lastIndexOf("background-image:var(--asset-nav)!") < normalNavigationRule.index,
  "Normal navigation buttons must override the earlier chevron-shaped theme artwork.",
);

const pseudoElementRules = [...stylesheet.matchAll(new RegExp(
  `${navigationButtonSelector}::before\\s*,\\s*${navigationButtonSelector}::after\\s*\\{([^}]*)\\}`,
  "g",
))];
const pseudoElementRule = pseudoElementRules.at(-1);
assert.ok(pseudoElementRule, "Decorative pseudo-elements on navigation buttons must be disabled universally.");
const navigationDecorationRule = { body: pseudoElementRule[1], index: pseudoElementRule.index };
finalDeclaration(navigationDecorationRule, "content", /^none\s*!important$/, "Navigation button decorations");
finalDeclaration(navigationDecorationRule, "display", /^none\s*!important$/, "Navigation button decorations");
assert.ok(
  navigationDecorationRule.index > normalNavigationRule.index,
  "Decorative navigation-button pseudo-elements must remain disabled by the final theme override.",
);

for (const view of ["marketView", "couponsView", "playerGuildView", "recipeBookView"]) {
  const iconRules = [...stylesheet.matchAll(new RegExp(
    `\\.navButton\\[data-app-view="${view}"\\]\\s+\\.navIcon::before\\s*\\{([^}]*)\\}`,
    "g",
  ))];
  assert.ok(
    iconRules.some((rule) => /(?:^|;)\s*(?:-webkit-)?mask\s*:\s*url\(/.test(rule[1])),
    `The ${view} navigation icon must retain its existing masked glyph.`,
  );
}

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
