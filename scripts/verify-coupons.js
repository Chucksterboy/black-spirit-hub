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
  "function couponIsRedeemed(){return false}",
  "function couponExpiryText(){return 'No expiry listed'}",
  extractFunction("couponEscape", "couponCodeKey"),
  extractFunction("couponCodeKey", "couponRedeemedMap"),
  extractFunction("couponRewardListHtml", "couponExpiryText"),
  extractFunction("couponSourceAttribution", "applyCouponDashboard"),
  extractFunction("renderCouponDetail", "initializeCoupons"),
  "globalThis.couponTests={couponEl,couponState,couponRewardListHtml,renderCouponDetail};"
].join("\n");

const context = {};
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
  extractFunction("couponExpiryBadge", "couponSourceAttribution"),
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
  || !/id="couponRewardList-TESTCOUPON" hidden/.test(html)
  || !/8 items/.test(html)
  || !/Choose Your Transcendent Hammer Box/.test(html)
  || !/class="couponDetailSource"><span>SOURCES<\/span>/.test(html)
  || !/<strong>BDO Alerts<\/strong>/.test(html)
  || !/data-open-url="https:\/\/garmoth\.com\/coupons\/">Garmoth &nearr;<\/button>/.test(html)) {
  throw new Error("Collapsed coupon reward disclosure is malformed.");
}

tests.couponState.expandedRewardsCode = "TESTCOUPON";
tests.renderCouponDetail(coupon);
html = tests.couponEl.detail.innerHTML;
const rowCount = (html.match(/class="couponRewardListItem"/g) || []).length;
if (!/aria-expanded="true"/.test(html)
  || /id="couponRewardList-TESTCOUPON" hidden/.test(html)
  || rowCount !== 8
  || !/class="couponRewardListQuantity">4x/.test(html)
  || !/Reward &lt;8&gt; &amp; more/.test(html)
  || !/Item icons: BDO Codex/.test(html)) {
  throw new Error("Expanded coupon reward list does not preserve every reward safely.");
}

tests.renderCouponDetail({...coupon,source:"BDO Alerts"});
html = tests.couponEl.detail.innerHTML;
if (!/<span>SOURCE<\/span><strong>BDO Alerts<\/strong>/.test(html)
  || /garmoth\.com\/coupons/.test(html)) {
  throw new Error("Coupon source attribution must be data-driven and link only Garmoth observations.");
}

if (!/couponState\.expandedRewardsCode=couponState\.expandedRewardsCode===key\?"":key/.test(appScript)
  || !/data-coupon-rewards-toggle/.test(appScript)
  || !/function couponSourceAttribution\(c\)/.test(appScript)
  || !/https:\/\/garmoth\.com\/coupons\//.test(appScript)
  || !/\.couponRewardList\{[\s\S]*?max-height:280px;[\s\S]*?overflow-y:auto;/.test(appCss)
  || !/\.couponRewardList\[hidden\]\{display:none\}/.test(appCss)
  || !/\.couponDetailSource\{/.test(appCss)
  || !/\.couponRewardDisclosure:focus-visible/.test(appCss)) {
  throw new Error("Coupon reward disclosure lost its state, scrolling, or keyboard safeguards.");
}

console.log("Coupon JavaScript verification passed.");
