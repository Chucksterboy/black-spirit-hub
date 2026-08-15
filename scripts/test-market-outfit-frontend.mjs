import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const sourceRoot = path.resolve(process.argv[2] || path.join(import.meta.dirname, "..", "Source Code"));
const scriptPath = path.join(sourceRoot, "BlackSpiritHub.Resources.Black_Spirit_Hub.js");
const htmlPath = path.join(sourceRoot, "BlackSpiritHub.Resources.Black_Spirit_Hub.html");
const source = fs.readFileSync(scriptPath, "utf8");
const html = fs.readFileSync(htmlPath, "utf8");
const start = source.indexOf("function formatMarketSampleTime");
const end = source.indexOf('marketEl.outfitFilter.addEventListener("input", renderOutfitReport);');
assert.ok(start >= 0 && end > start, "outfit renderer source slice is missing");

const elements = {
  outfitCoverage:{ textContent:"" },
  outfitFilter:{ value:"" },
  topOutfitCards:{ innerHTML:"" },
  outfitRows:{ innerHTML:"" }
};
const context = vm.createContext({
  console,
  Date,
  Intl,
  Number,
  Math,
  marketState:{ outfits:null },
  marketEl:elements,
  getMarketRegion:() => "eu",
  fmtInt:value => Math.round(Number(value) || 0).toLocaleString("en-US"),
  fmtSilver:value => `${Number(value || 0) / 1_000_000_000}b`,
  norm:value => String(value || "").toLowerCase(),
  escapeHtml:value => String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;")
});
vm.runInContext(source.slice(start,end), context, { filename:"market-outfit-renderer.js" });

const base = {
  price:2_020_000_000,
  sales24Hours:100,
  sales3Days:300,
  sales7Days:700,
  salesPerDay:100,
  preorderCount:250,
  estimatedQueueDays:2.5,
  sampleCount:24,
  salesDataStale:false,
  lastSalesSampleUtc:"2026-08-15T12:00:00Z",
  lastDetailedUtc:"2026-07-20T12:00:00Z",
  preorderDataFresh:false,
  recommendationEligible:false,
  salesSignalEligible:true
};
const watch = (itemId,name,extra={}) => ({ ...base,itemId,name,...extra });
const watches = [
  watch(1,"<Guardian> & Ynixtra"),
  watch(2,"Flamekissed"),
  watch(3,"Iudicium")
];

function report(topOpportunities=watches,opportunities=[...watches,watch(4,"Fourth")]) {
  return {
    catalogCount:opportunities.length,
    detailedCount:opportunities.length,
    coveragePercent:100,
    staleSalesOutfitCount:0,
    topOpportunities,
    opportunities
  };
}

context.marketState.outfits = report();
vm.runInContext("renderOutfitReport()", context);
assert.equal((elements.topOutfitCards.innerHTML.match(/<article\b/g) || []).length,3,"three sales-watch cards must render");
assert.equal((elements.topOutfitCards.innerHTML.match(/role="listitem"/g) || []).length,3);
assert.match(elements.topOutfitCards.innerHTML,/Sales watch #1/);
assert.match(elements.topOutfitCards.innerHTML,/preorder queue not recently verified/);
assert.match(elements.topOutfitCards.innerHTML,/Older preorder snapshot/);
assert.match(elements.topOutfitCards.innerHTML,/Refresh needed/);
assert.doesNotMatch(elements.topOutfitCards.innerHTML,/Must order|Strong preorder signal|No active outfit recommendations/);
assert.doesNotMatch(elements.topOutfitCards.innerHTML,/>2\.5 days</,"stale preorder detail must not produce a numeric queue estimate");
assert.match(elements.topOutfitCards.innerHTML,/&lt;Guardian&gt; &amp; Ynixtra/,"dynamic names must remain escaped");

context.marketState.outfits = report([],watches);
vm.runInContext("renderOutfitReport()", context);
assert.equal((elements.topOutfitCards.innerHTML.match(/<article\b/g) || []).length,3,"a defensive renderer fallback must preserve three cards if a stale host omits its selected list");

context.marketState.outfits = report([watches[0]],watches);
vm.runInContext("renderOutfitReport()", context);
assert.equal((elements.topOutfitCards.innerHTML.match(/<article\b/g) || []).length,3,"a partial backend selection must be filled without duplicating its first card");
assert.equal((elements.topOutfitCards.innerHTML.match(/&lt;Guardian&gt; &amp; Ynixtra/g) || []).length,1);

elements.outfitFilter.value = "nothing-matches-this";
vm.runInContext("renderOutfitReport()", context);
assert.equal((elements.topOutfitCards.innerHTML.match(/<article\b/g) || []).length,3,"table filtering must not erase the global Top 3");
assert.match(elements.outfitRows.innerHTML,/No outfits match this filter/);

const verified = watch(8,"Verified",{
  recommendationEligible:true,
  salesSignalEligible:true,
  preorderDataFresh:true,
  lastDetailedUtc:"2026-08-15T10:00:00Z"
});
elements.outfitFilter.value = "";
context.marketState.outfits = report([verified,watches[0],watches[1]],[verified,...watches]);
vm.runInContext("renderOutfitReport()", context);
assert.equal((elements.topOutfitCards.innerHTML.match(/<article\b/g) || []).length,3);
assert.ok(elements.topOutfitCards.innerHTML.indexOf("Verified recommendation #1") < elements.topOutfitCards.innerHTML.indexOf("Sales watch #2"));
assert.match(elements.topOutfitCards.innerHTML,/Strong current preorder signal/);
assert.match(elements.topOutfitCards.innerHTML,/>250<\/strong>/);
assert.match(elements.topOutfitCards.innerHTML,/>2\.5 days<\/strong>/);

const noQueue = watch(10,"Fresh Sales Without Queue",{
  recommendationEligible:false,
  salesSignalEligible:true,
  preorderDataFresh:true,
  preorderCount:0,
  estimatedQueueDays:0.1,
  lastDetailedUtc:"2026-08-15T10:00:00Z"
});
context.marketState.outfits = report([noQueue,watches[0],watches[1]],[noQueue,...watches]);
vm.runInContext("renderOutfitReport()", context);
const noQueueCard = elements.topOutfitCards.innerHTML.split("</article>")[0];
assert.match(noQueueCard,/Strong recent sales — no active preorder queue/);
assert.match(noQueueCard,/No active queue/);
assert.doesNotMatch(noQueueCard,/preorder queue not recently verified/);

const early = watch(9,"Early",{
  recommendationEligible:false,
  salesSignalEligible:false,
  preorderDataFresh:false,
  preorderCount:null,
  lastDetailedUtc:null,
  salesDataStale:true
});
context.marketState.outfits = report([early,watches[0],watches[1]],[early,...watches]);
vm.runInContext("renderOutfitReport()", context);
assert.match(elements.topOutfitCards.innerHTML,/Early market watch #1/);
assert.match(elements.topOutfitCards.innerHTML,/cached sales refresh pending/);
assert.match(elements.topOutfitCards.innerHTML,/Not scanned yet/);

context.marketState.outfits = report([],[]);
vm.runInContext("renderOutfitReport()", context);
assert.match(elements.topOutfitCards.innerHTML,/Building the first three outfit opportunities/);
assert.doesNotMatch(elements.topOutfitCards.innerHTML,/No active outfit recommendations/);

assert.match(html,/<section class="mustOrderSection" aria-labelledby="topOutfitHeading">/);
assert.match(html,/id="topOutfitHeading">Top 3 Outfit Opportunities<\/h2>/);
assert.match(html,/id="topOutfitCards" class="mustOrderGrid" role="list" aria-live="polite"/);

console.log("Market outfit frontend regression checks passed.");
