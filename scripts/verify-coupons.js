"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const repoRoot = path.resolve(__dirname, "..");
const appScript = fs.readFileSync(path.join(
  repoRoot,
  "Source Code",
  "BlackSpiritHub.Resources.Black_Spirit_Hub.js"), "utf8");
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
  extractFunction("renderCouponDetail", "initializeCoupons"),
  "globalThis.couponTests={couponEl,couponState,couponRewardListHtml,renderCouponDetail};"
].join("\n");

const context = {};
vm.createContext(context);
vm.runInContext(extractedCode, context);
const tests = context.couponTests;
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
  rewards
};

tests.renderCouponDetail(coupon);
let html = tests.couponEl.detail.innerHTML;
if (!/aria-expanded="false"/.test(html)
  || !/id="couponRewardList-TESTCOUPON" hidden/.test(html)
  || !/8 items/.test(html)
  || !/Choose Your Transcendent Hammer Box/.test(html)) {
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

if (!/couponState\.expandedRewardsCode=couponState\.expandedRewardsCode===key\?"":key/.test(appScript)
  || !/data-coupon-rewards-toggle/.test(appScript)
  || !/\.couponRewardList\{[\s\S]*?max-height:280px;[\s\S]*?overflow-y:auto;/.test(appCss)
  || !/\.couponRewardList\[hidden\]\{display:none\}/.test(appCss)
  || !/\.couponRewardDisclosure:focus-visible/.test(appCss)) {
  throw new Error("Coupon reward disclosure lost its state, scrolling, or keyboard safeguards.");
}

console.log("Coupon JavaScript verification passed.");
