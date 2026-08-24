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
  extractFunction("couponCodeKey", "couponRedeemedMap"),
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

console.log("Coupon JavaScript verification passed.");
