"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const repoRoot = path.resolve(__dirname, "..");
const appScript = fs.readFileSync(path.join(
  repoRoot,
  "Source Code",
  "BlackSpiritHub.Resources.Black_Spirit_Hub.js"), "utf8");
const appHtml = fs.readFileSync(path.join(
  repoRoot,
  "Source Code",
  "BlackSpiritHub.Resources.Black_Spirit_Hub.html"), "utf8");
const appCss = fs.readFileSync(path.join(
  repoRoot,
  "Source Code",
  "BlackSpiritHub.Resources.Black_Spirit_Hub.css"), "utf8");

function extractFunction(name, nextName) {
  const start = appScript.indexOf(`function ${name}(`);
  const remainder = start < 0 ? "" : appScript.slice(start);
  const nextMatch = remainder.match(
    new RegExp(`\\n(?:async\\s+)?function ${nextName}\\(`));
  const end = nextMatch ? start + nextMatch.index : -1;
  if (start < 0 || end < 0) {
    throw new Error(`Could not extract ${name} from the application script.`);
  }
  return appScript.slice(start, end);
}

const extractedCode = [
  "const couponEl={detail:{innerHTML:''}};",
  "const couponState={expandedRewardsCode:''};",
  "const couponCopyFeedbackTimers=new WeakMap();",
  "const couponCopyAttempts=new WeakMap();",
  "function couponIsRedeemed(){return false}",
  "function couponExpiryText(){return 'No expiry listed'}",
  extractFunction("couponEscape", "couponCodeKey"),
  extractFunction("couponCodeKey", "couponNormalizeRedeemedMap"),
  extractFunction("couponRewardListHtml", "couponExpiryText"),
  extractFunction("showCouponCopyFeedback", "renderCouponDetail"),
  extractFunction("renderCouponDetail", "initializeCoupons"),
  "globalThis.couponTests={couponEl,couponState,couponRewardListHtml,showCouponCopyFeedback,renderCouponDetail};"
].join("\n");

let nextFeedbackTimerId = 1;
const feedbackTimers = new Map();
const context = {
  setTimeout(callback,delay) {
    const id = nextFeedbackTimerId++;
    feedbackTimers.set(id,{callback,delay});
    return id;
  },
  clearTimeout(id) { feedbackTimers.delete(id); }
};
vm.createContext(context);
vm.runInContext(extractedCode, context);
const tests = context.couponTests;

const redemptionStart = appScript.indexOf("function couponCodeKey(");
const redemptionEnd = appScript.indexOf("\nfunction couponUnreadNewCodes(", redemptionStart);
if (redemptionStart < 0 || redemptionEnd < 0) {
  throw new Error("Could not extract coupon redemption persistence from the application script.");
}

class ImmediatePromise {
  catch() { return this; }
  then(callback) {
    const result = callback();
    return result instanceof ImmediatePromise ? result : this;
  }
}

function createCouponRedemptionHarness(legacyState,pendingState=null) {
  const savedPayloads = [];
  const persisted = [];
  const flushed = [];
  let clearedNewCode = "";
  const redemptionContext = {
    Promise:{resolve:() => new ImmediatePromise()},
    readSetting:key => key === "couponRedeemed"
      ? legacyState
      : key === "couponRedemptionPending" ? pendingState : {},
    persistSetting:(key,value) => persisted.push({key,value:JSON.parse(JSON.stringify(value))}),
    flushSetting:key => flushed.push(key),
    bridgeCall:(command,payload) => {
      savedPayloads.push({command,payload:JSON.parse(JSON.stringify(payload))});
      return new ImmediatePromise();
    },
    couponClearNewCode:key => { clearedNewCode = key; },
    NotificationService:{ShowWarning() { throw new Error("A successful redemption save showed a warning."); }},
    console:{warn() {}}
  };
  vm.createContext(redemptionContext);
  vm.runInContext([
    appScript.slice(redemptionStart,redemptionEnd),
    extractFunction("setCouponRedeemed", "couponRedeemButton"),
    "globalThis.redemptionTests={couponRedeemedMap,couponRedeemedCodes,couponInitializeRedemptionState,setCouponRedeemed};"
  ].join("\n"),redemptionContext);
  return {
    ...redemptionContext.redemptionTests,
    savedPayloads,
    persisted,
    flushed,
    get clearedNewCode() { return clearedNewCode; }
  };
}

const nativeRedemptionHarness = createCouponRedemptionHarness({"STALE-LOCAL":true});
nativeRedemptionHarness.couponInitializeRedemptionState({
  redemptionStateExists:true,
  redeemedCodes:[" native-code ","NATIVE-CODE",null,42]
});
if (JSON.stringify(nativeRedemptionHarness.couponRedeemedCodes()) !== JSON.stringify(["NATIVECODE"])
  || nativeRedemptionHarness.savedPayloads.length !== 0
  || nativeRedemptionHarness.persisted.at(-1)?.key !== "couponRedeemed"
  || nativeRedemptionHarness.flushed.at(-1) !== "couponRedeemed") {
  throw new Error("Native coupon redemption state must replace stale browser-only state on startup.");
}

nativeRedemptionHarness.setCouponRedeemed("native-code",false);
nativeRedemptionHarness.setCouponRedeemed(" new-code ",true);
if (JSON.stringify(nativeRedemptionHarness.couponRedeemedCodes()) !== JSON.stringify(["NEWCODE"])
  || nativeRedemptionHarness.savedPayloads.length !== 2
  || nativeRedemptionHarness.savedPayloads.some(save => save.command !== "saveCouponRedemptions")
  || JSON.stringify(nativeRedemptionHarness.savedPayloads[0].payload.redeemedCodes) !== "[]"
  || JSON.stringify(nativeRedemptionHarness.savedPayloads[1].payload.redeemedCodes) !== JSON.stringify(["NEWCODE"])
  || nativeRedemptionHarness.clearedNewCode !== "NEWCODE") {
  throw new Error("Redeem and undo must immediately save a canonical update-safe snapshot.");
}

const legacyRedemptionHarness = createCouponRedemptionHarness({
  " legacy-code ":true,
  "LEGACYCODE":true,
  ignored:false
});
legacyRedemptionHarness.couponInitializeRedemptionState({
  redemptionStateExists:false,
  redeemedCodes:[]
});
if (JSON.stringify(legacyRedemptionHarness.couponRedeemedCodes()) !== JSON.stringify(["LEGACYCODE"])
  || legacyRedemptionHarness.savedPayloads.length !== 1
  || JSON.stringify(legacyRedemptionHarness.savedPayloads[0].payload.redeemedCodes) !== JSON.stringify(["LEGACYCODE"])) {
  throw new Error("Existing browser-only coupon redemptions must migrate once into durable app data.");
}

const interruptedUndoHarness = createCouponRedemptionHarness(
  {"NATIVE-CODE":true},
  {schemaVersion:1,redeemedCodes:[]});
interruptedUndoHarness.couponInitializeRedemptionState({
  redemptionStateExists:true,
  redeemedCodes:["NATIVE-CODE"]
});
if (interruptedUndoHarness.couponRedeemedCodes().length !== 0
  || interruptedUndoHarness.savedPayloads.length !== 1
  || JSON.stringify(interruptedUndoHarness.savedPayloads[0].payload.redeemedCodes) !== "[]") {
  throw new Error("An interrupted native save must retry the latest browser snapshot, including an empty undo state.");
}

async function verifyCouponRedemptionGenerationRace() {
  const persisted = [];
  const deferredSaves = [];
  const raceContext = {
    readSetting:key => key === "couponRedeemed" ? {} : null,
    persistSetting:(key,value) => persisted.push({key,value:JSON.parse(JSON.stringify(value))}),
    flushSetting() {},
    bridgeCall:(command,payload) => new Promise(resolve => {
      deferredSaves.push({command,payload:JSON.parse(JSON.stringify(payload)),resolve});
    }),
    couponClearNewCode() {},
    NotificationService:{ShowWarning() {}},
    console:{warn() {}}
  };
  vm.createContext(raceContext);
  vm.runInContext([
    appScript.slice(redemptionStart,redemptionEnd),
    extractFunction("setCouponRedeemed", "couponRedeemButton"),
    "globalThis.redemptionRace={couponInitializeRedemptionState,setCouponRedeemed};"
  ].join("\n"),raceContext);
  raceContext.redemptionRace.couponInitializeRedemptionState({
    redemptionStateExists:true,
    redeemedCodes:[]
  });
  raceContext.redemptionRace.setCouponRedeemed("A",true);
  for (let index = 0; index < 4; index++) await Promise.resolve();
  if (deferredSaves.length !== 1) {
    throw new Error("The first durable coupon save did not start.");
  }

  raceContext.redemptionRace.setCouponRedeemed("B",true);
  raceContext.redemptionRace.setCouponRedeemed("B",false);
  deferredSaves[0].resolve({saved:true});
  for (let index = 0; index < 6; index++) await Promise.resolve();
  if (deferredSaves.length !== 2
    || persisted.some(entry => entry.key === "couponRedemptionPending" && entry.value === null)
    || JSON.stringify(persisted.at(-1)?.value?.redeemedCodes) !== JSON.stringify(["A"])) {
    throw new Error("An older A→B→A save completion must not clear the latest pending coupon snapshot.");
  }
}

const fixedNow = Date.parse("2026-08-24T23:59:00.000Z");
const NativeDate = Date;
class FixedDate extends NativeDate {
  static now() { return fixedNow; }
}
const expiryBadgeCode = [
  extractFunction("couponEscape", "couponCodeKey"),
  extractFunction("couponExpiryText", "couponExpiryBadge"),
  extractFunction("couponExpiryBadge", "applyCouponDashboard"),
  "globalThis.expiryBadgeTests={couponExpiryBadge};"
].join("\n");
const expiryBadgeContext = {Date:FixedDate};
vm.createContext(expiryBadgeContext);
vm.runInContext(expiryBadgeCode, expiryBadgeContext);
const futureExpiry = "2026-08-27T23:59:00.000Z";
const exactExpiryDate = new NativeDate(futureExpiry).toLocaleDateString([], {
  year:"numeric",
  month:"short",
  day:"numeric",
  timeZone:"UTC"
});
const futureExpiryBadge = expiryBadgeContext.expiryBadgeTests.couponExpiryBadge({
  expiryUtc:futureExpiry,
  isExpired:false,
  expiryText:""
});
const unknownExpiryBadge = expiryBadgeContext.expiryBadgeTests.couponExpiryBadge({
  expiryUtc:null,
  isExpired:false,
  expiryText:"No expiry listed"
});
const couponRowIdentityMarkup = /class="couponRowCode"><span class="couponTicket" aria-hidden="true">[\s\S]*?<span class="couponCodeIdentity"><span class="couponCodeText" title="\$\{couponEscape\(c\.code\)\}">\$\{couponEscape\(c\.code\)\}<\/span>\$\{couponExpiryBadge\(c\)\}<\/span><\/div><div class="couponRedeemCell">/;
const couponRowCellOrder = /<div class="couponRedeemCell">\$\{couponRedeemButton\(c\)\}<\/div><div class="couponRewardSummary">/;
const expiryRuleBodies = [...appCss.matchAll(/#couponsView \.couponCodeExpiry(?:\.[^{]+)?\{([^}]*)\}/g)]
  .map(match => match[1]);
const couponRowGridTemplates = [...appCss.matchAll(/(?:#couponsView )?\.couponRowV2\{[^}]*grid-template-columns:([^;}]+)/g)]
  .map(match => match[1].trim().split(/\s+/));
if (/class="couponHero"|class="couponIntro"|class="couponMetric"|class="couponLiveCard"/.test(appHtml)
  || /id="coupon(?:AvailableCount|TotalCount|LastCheck|SourceBadge|RegionBadge|SyncText|LastUpdated)"/.test(appHtml)
  || /coupon(?:AvailableCount|TotalCount|LastCheck|SourceBadge|RegionBadge|SyncText|LastUpdated)/.test(appScript)
  || !/id="couponsView" class="appView" aria-label="Coupons"/.test(appHtml)
  || !/#couponsView \.couponV2\{padding-top:8px\}/.test(appCss)
  || !/#couponsView \.couponWorkspace\{min-height:calc\(100vh - 174px\)\}/.test(appCss)) {
  throw new Error("The retired coupon hero and summary cards must stay removed while the coupon workspace fills their space.");
}
if (!futureExpiryBadge.includes(`EXPIRES ${exactExpiryDate} · IN 3 DAYS`)
  || !/class="couponCodeExpiry unknown">EXPIRY NOT LISTED<\/span>/.test(unknownExpiryBadge)
  || !/timeZone:"UTC"/.test(appScript)
  || !couponRowIdentityMarkup.test(appScript)
  || !couponRowCellOrder.test(appScript)
  || /<div class="couponStatusV2">/.test(appScript)
  || /\.couponStatusV2(?:\s|\{|\.)/.test(appCss)
  || couponRowGridTemplates.length < 3
  || couponRowGridTemplates.some(tracks => tracks.length !== 4 || tracks.at(-1) !== "28px")
  || !/#couponsView \.couponListPane\{container-name:coupon-list;container-type:inline-size\}/.test(appCss)
  || !/#couponsView \.couponRowV2\{grid-template-columns:minmax\(365px,1\.65fr\) 155px minmax\(300px,1\.4fr\) 28px\}/.test(appCss)
  || !/#couponsView \.couponCodeIdentity\{[^}]*display:grid[^}]*grid-template-columns:minmax\(0,1fr\) max-content[^}]*align-items:center/.test(appCss)
  || !/#couponsView \.couponCodeExpiry\{[^}]*justify-self:end[^}]*border:1px solid rgba\(49,230,255,\.72\)[^}]*background:linear-gradient[^}]*color:#62efff/.test(appCss)
  || !/@container coupon-list \(max-width:1000px\)/.test(appCss)
  || !/#couponsView \.couponRowV2\{grid-template-columns:minmax\(275px,1\.35fr\) 120px minmax\(245px,1fr\) 28px\}/.test(appCss)
  || !/#couponsView \.couponCodeIdentity\{display:flex;flex-direction:column;align-items:flex-start;justify-content:center;gap:7px\}/.test(appCss)
  || !/#couponsView \.couponCodeExpiry\{justify-self:auto\}/.test(appCss)
  || expiryRuleBodies.some(body => /position:(?:absolute|fixed|sticky)|(?:^|;)\s*(?:inset|left|right|top|bottom):|margin-left:/i.test(body))) {
  throw new Error("Every coupon row must show a vibrant exact and relative expiry badge, including the unknown fallback.");
}

const intervalDeclaration = appScript.match(
  /const COUPON_AUTO_REFRESH_INTERVAL_MS=([^;]+);/);
if (!intervalDeclaration) {
  throw new Error("The coupon auto-refresh interval declaration is missing.");
}

const autoRefreshCode = [
  intervalDeclaration[0],
  "const couponState={autoTimer:123};",
  "let clearedTimer=null,scheduledCallback=null,scheduledDelay=null,refreshOptions=null;",
  "function clearInterval(timer){clearedTimer=timer}",
  "function setInterval(callback,delay){scheduledCallback=callback;scheduledDelay=delay;return 456}",
  "function refreshCoupons(options){refreshOptions=options}",
  extractFunction("startCouponAutoRefresh", "refreshCoupons"),
  "startCouponAutoRefresh();",
  "scheduledCallback();",
  "globalThis.autoRefreshTests={clearedTimer,scheduledDelay,refreshOptions,timer:couponState.autoTimer};"
].join("\n");
const autoRefreshContext = {};
vm.createContext(autoRefreshContext);
vm.runInContext(autoRefreshCode, autoRefreshContext);
const autoRefreshTests = autoRefreshContext.autoRefreshTests;
if (autoRefreshTests.clearedTimer !== 123
  || autoRefreshTests.timer !== 456
  || autoRefreshTests.scheduledDelay !== 2 * 60 * 60 * 1000
  || autoRefreshTests.refreshOptions?.auto !== true
  || autoRefreshTests.refreshOptions?.silent !== false) {
  throw new Error("Coupons must automatically refresh every two hours while the app is open.");
}

const couponStatusAlertMarkup = appHtml.match(
  /<button\b(?=[^>]*\bid="couponStatusAlert")[^>]*><\/button>/)?.[0] || "";
const couponStatusAlertRule = [...appCss.matchAll(
  /\.couponStatusAlert\s*\{([^}]*)\}/g)].at(-1)?.[1] || "";
const couponStatusAlertFocusRule = appCss.match(
  /\.couponStatusAlert:focus-visible\s*\{([^}]*)\}/)?.[1] || "";
const openAvailableCouponsSource = appScript.match(
  /function openAvailableCoupons\(\)\s*\{[^}]*\}/)?.[0] || "";
const couponStatusAlertClickListener = appScript.match(
  /couponEl\.statusAlert\?\.addEventListener\(\s*["']click["']\s*,\s*openAvailableCoupons\s*\)\s*;/)?.[0] || "";

if (!couponStatusAlertMarkup
  || !/\bclass="[^"]*\bcouponStatusAlert\b[^"]*"/.test(couponStatusAlertMarkup)
  || !/\btype="button"/.test(couponStatusAlertMarkup)
  || !/\baria-label="Open available coupons"/.test(couponStatusAlertMarkup)
  || !/\btitle="Open available coupons"/.test(couponStatusAlertMarkup)
  || !/(?:^|;)\s*font\s*:\s*inherit\s*(?=;|$)/.test(couponStatusAlertRule)
  || !/(?:^|;)\s*font-weight\s*:\s*900\s*(?=;|$)/.test(couponStatusAlertRule)
  || !/(?:^|;)\s*cursor\s*:\s*pointer\s*(?=;|$)/.test(couponStatusAlertRule)
  || !couponStatusAlertFocusRule.trim()
  || !openAvailableCouponsSource
  || !couponStatusAlertClickListener) {
  throw new Error("The coupon footer notification must be a keyboard-accessible button that opens available coupons.");
}

function createCouponStatusAlertNavigationHarness({activeTab="available",hasNavigation=true,hasAvailableTab=true}={}) {
  const interactions = [];
  const handlers = new Map();
  const state = {activeTab};
  const navigationButton = {dataset:{appView:"couponsView"}};
  const availableTab = {
    click() {
      interactions.push("available-tab");
      state.activeTab = "available";
    }
  };
  const statusAlert = {
    addEventListener(type,handler) { handlers.set(type,handler); }
  };
  const navigationContext = {
    couponEl:{statusAlert},
    couponState:state,
    document:{
      querySelector(selector) {
        if (selector === '[data-app-view="couponsView"]') {
          return hasNavigation ? navigationButton : null;
        }
        if (selector === '[data-coupon-tab="available"]') {
          interactions.push("find-available-tab");
          return hasAvailableTab ? availableTab : null;
        }
        throw new Error(`Unexpected coupon-navigation selector: ${selector}`);
      }
    },
    activateAppView(button) {
      if (button !== navigationButton) {
        throw new Error("Coupon footer navigation targeted the wrong application view.");
      }
      interactions.push("coupons-view");
    }
  };
  vm.createContext(navigationContext);
  vm.runInContext([
    openAvailableCouponsSource,
    couponStatusAlertClickListener
  ].join("\n"),navigationContext);

  return {handlers,interactions,state};
}

const couponNavigationFromAnotherTab = createCouponStatusAlertNavigationHarness({activeTab:"expired"});
if (couponNavigationFromAnotherTab.handlers.get("click")?.() !== true
  || couponNavigationFromAnotherTab.state.activeTab !== "available"
  || couponNavigationFromAnotherTab.interactions.join("|") !== "find-available-tab|available-tab|coupons-view") {
  throw new Error("Clicking the coupon footer notification must select Available before opening Coupons.");
}

const couponNavigationAlreadyAvailable = createCouponStatusAlertNavigationHarness();
if (couponNavigationAlreadyAvailable.handlers.get("click")?.({detail:0}) !== true
  || couponNavigationAlreadyAvailable.state.activeTab !== "available"
  || couponNavigationAlreadyAvailable.interactions.join("|") !== "find-available-tab|coupons-view") {
  throw new Error("Native keyboard or pointer activation must open Coupons without reselecting the Available tab.");
}

const couponNavigationWithoutButton = createCouponStatusAlertNavigationHarness({
  activeTab:"expired",
  hasNavigation:false
});
if (couponNavigationWithoutButton.handlers.get("click")?.() !== false
  || couponNavigationWithoutButton.state.activeTab !== "expired"
  || couponNavigationWithoutButton.interactions.length !== 0) {
  throw new Error("Coupon footer navigation must safely ignore a missing Coupons navigation button.");
}

const couponNavigationWithoutAvailableTab = createCouponStatusAlertNavigationHarness({
  activeTab:"redeemed",
  hasAvailableTab:false
});
if (couponNavigationWithoutAvailableTab.handlers.get("click")?.() !== true
  || couponNavigationWithoutAvailableTab.interactions.join("|") !== "find-available-tab|coupons-view") {
  throw new Error("Coupon footer navigation must still open Coupons if the Available tab is temporarily absent.");
}

const rewards = Array.from({ length: 8 }, (_, index) => ({
  itemName:index === 0
    ? "Choose Your Transcendent Hammer Box"
    : `Reward <${index + 1}> & more`,
  quantity:index === 0 ? 4 : index + 1,
  icon:`data:image/webp;base64,icon-${index + 1}`,
  iconSource:index === 0 ? "BDO Codex" : "",
  iconSourceUrl:index === 0
    ? "https://bdocodex.com/us/item/1000306/"
    : ""
}));
const coupon = {
  code:"TEST-COUPON",
  isExpired:false,
  expiryText:"No expiry listed",
  source:"BDO Alerts + Garmoth",
  rewards
};

tests.renderCouponDetail(coupon);
let html = tests.couponEl.detail.innerHTML;
if (!/aria-expanded="false"/.test(html)
  || !/aria-controls="couponRewardList-TESTCOUPON"/.test(html)
  || !/class="couponRewardDisclosureChevron" aria-hidden="true"><\/span>/.test(html)
  || !/id="couponRewardList-TESTCOUPON" hidden/.test(html)
  || !/8 items/.test(html)
  || !/Choose Your Transcendent Hammer Box/.test(html)
  || !/class="couponCopyLarge" type="button"[^>]*aria-label="Copy coupon code TEST-COUPON"/.test(html)
  || !/class="couponCopyLargeDefault" aria-hidden="true">Copy Code<\/span>/.test(html)
  || !/class="couponCopyLargeSuccess" aria-hidden="true">Copied to Clipboard<\/span>/.test(html)
  || !/class="couponCopyLiveStatus" role="status" aria-live="polite" aria-atomic="true"><\/span>/.test(html)
  || /couponDetailSource|>SOURCES?<|Garmoth &nearr;|<strong>BDO Alerts<\/strong>/.test(html)) {
  throw new Error("Collapsed coupon reward disclosure is malformed.");
}

tests.couponState.expandedRewardsCode = "TESTCOUPON";
tests.renderCouponDetail(coupon);
html = tests.couponEl.detail.innerHTML;
const rowCount = (html.match(/class="couponRewardListItem"/g) || []).length;
if (!/aria-expanded="true"/.test(html)
  || !/aria-controls="couponRewardList-TESTCOUPON"/.test(html)
  || !/class="couponRewardDisclosureChevron" aria-hidden="true"><\/span>/.test(html)
  || /id="couponRewardList-TESTCOUPON" hidden/.test(html)
  || rowCount !== 8
  || !/class="couponRewardListQuantity">4x/.test(html)
  || !/Reward &lt;8&gt; &amp; more/.test(html)
  || !/Item icons: BDO Codex/.test(html)) {
  throw new Error("Expanded coupon reward list does not preserve every reward safely.");
}

const rewardDisclosureRule = appCss.match(/\.couponRewardDisclosure\{([^}]*)\}/)?.[1] || "";
const rewardChevronRule = appCss.match(/\.couponRewardDisclosureChevron\{([^}]*)\}/)?.[1] || "";
const rewardChevronGlyphRule = appCss.match(/\.couponRewardDisclosureChevron::before\{([^}]*)\}/)?.[1] || "";
const expandedRewardChevronRule = appCss.match(/\.couponRewardDisclosure\[aria-expanded="true"\] \.couponRewardDisclosureChevron::before\{([^}]*)\}/)?.[1] || "";
const copyLargeRule = appCss.match(/\.couponCopyLarge\{([^}]*)\}/g)?.at(-1)?.match(/\{([^}]*)\}/)?.[1] || "";
const copyLargeSpansRule = appCss.match(/\.couponCopyLarge>span:not\(\.couponCopyLiveStatus\)\{([^}]*)\}/)?.[1] || "";

const copiedClasses = new Set();
const copiedLiveStatus = {textContent:""};
const copiedButton = {
  isConnected:true,
  classList:{
    contains:value => value === "couponCopyLarge" || copiedClasses.has(value),
    add:value => copiedClasses.add(value),
    remove:value => copiedClasses.delete(value)
  },
  querySelector:selector => selector === ".couponCopyLiveStatus" ? copiedLiveStatus : null
};
tests.showCouponCopyFeedback(copiedButton);
tests.showCouponCopyFeedback(copiedButton);
const activeFeedbackTimers = [...feedbackTimers.values()];
if (!copiedClasses.has("copied")
  || copiedLiveStatus.textContent !== "Copied to Clipboard"
  || activeFeedbackTimers.length !== 1
  || activeFeedbackTimers[0].delay !== 1800) {
  throw new Error("Coupon copy success feedback did not enter or refresh its visible state.");
}
activeFeedbackTimers[0].callback();
if (copiedClasses.has("copied")
  || copiedLiveStatus.textContent !== "") {
  throw new Error("Coupon copy success feedback did not return to its default state.");
}
if (!/couponState\.expandedRewardsCode=couponState\.expandedRewardsCode===key\?"":key/.test(appScript)
  || !/data-coupon-rewards-toggle/.test(appScript)
  || /function couponSourceAttribution\(c\)|couponDetailSource/.test(appScript)
  || !/\.couponRewardList\{[\s\S]*?max-height:280px;[\s\S]*?overflow-y:auto;/.test(appCss)
  || !/\.couponRewardList\[hidden\]\{display:none\}/.test(appCss)
  || /\.couponDetailSource(?:\s|\{|\.|>)/.test(appCss)
  || !/\.couponRewardDisclosure:focus-visible/.test(appCss)
  || !/grid-template-columns:minmax\(0,1fr\) auto 32px/.test(rewardDisclosureRule)
  || !/width:30px/.test(rewardChevronRule)
  || !/height:30px/.test(rewardChevronRule)
  || !/display:grid/.test(rewardChevronRule)
  || !/place-items:center/.test(rewardChevronRule)
  || !/justify-self:end/.test(rewardChevronRule)
  || !/align-self:center/.test(rewardChevronRule)
  || !/border:1px solid/.test(rewardChevronRule)
  || !/border-radius:6px/.test(rewardChevronRule)
  || /transform:/.test(rewardChevronRule)
  || !/content:""/.test(rewardChevronGlyphRule)
  || !/width:7px/.test(rewardChevronGlyphRule)
  || !/height:7px/.test(rewardChevronGlyphRule)
  || !/border-right:2px solid currentColor/.test(rewardChevronGlyphRule)
  || !/border-bottom:2px solid currentColor/.test(rewardChevronGlyphRule)
  || !/transform:translateY\(-2px\) rotate\(45deg\)/.test(rewardChevronGlyphRule)
  || !/transform:translateY\(2px\) rotate\(-135deg\)/.test(expandedRewardChevronRule)
  || /couponRewardDisclosureChevron" aria-hidden="true">&#8964;/.test(appScript)) {
  throw new Error("Coupon reward disclosure lost its state, scrolling, or keyboard safeguards.");
}

if (!/position:relative!important/.test(copyLargeRule)
  || !/overflow:hidden!important/.test(copyLargeRule)
  || !/transition:/.test(copyLargeRule)
  || !/position:absolute/.test(copyLargeSpansRule)
  || !/inset:0/.test(copyLargeSpansRule)
  || !/transition:opacity \.22s ease,transform \.22s/.test(copyLargeSpansRule)
  || !/\.couponCopyLargeSuccess\{[^}]*opacity:0[^}]*translateY\(9px\)/.test(appCss)
  || !/\.couponCopyLarge\.copied \.couponCopyLargeDefault\{[^}]*opacity:0[^}]*translateY\(-9px\)/.test(appCss)
  || !/\.couponCopyLarge\.copied \.couponCopyLargeSuccess\{[^}]*opacity:1[^}]*translateY\(0\)/.test(appCss)
  || !/function copyCouponCodeToClipboard\(code\)/.test(appScript)
  || !/document\.execCommand\("copy"\)===true/.test(appScript)
  || !/couponCopyAttempts\.get\(button\)!==attempt\|\|!button\.isConnected\|\|button\.dataset\.copyCoupon!==code/.test(appScript)
  || !/showCouponCopyFeedback\(button\);return;/.test(appScript)
  || !/\.couponCopyLiveStatus\{[^}]*width:1px[^}]*height:1px[^}]*overflow:hidden/.test(appCss)) {
  throw new Error("Coupon copy success feedback lost its smooth in-button transition or success-only trigger.");
}

verifyCouponRedemptionGenerationRace()
  .then(() => console.log("Coupon JavaScript verification passed."))
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  });
