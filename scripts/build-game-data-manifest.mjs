import fs from "node:fs";
import path from "node:path";
import {createHash} from "node:crypto";
import {fileURLToPath} from "node:url";

// This indexes the shipped data; it is not a remote update channel. A hash is
// evidence of byte identity, never proof that a game value is correct/current.
export const MANIFEST_PATH = "Assets/game-data-manifest.json";
const UI = "BlackSpiritHub.Resources.Black_Spirit_Hub.js";
const file = value => ({path:value});
const section = (start,end) => ({path:UI, start, end});
const sha = value => createHash("sha256").update(value).digest("hex");
const patch = id => `https://www.naeu.playblackdesert.com/en-US/News/Detail?groupContentNo=${id}&countryType=en-US`;
const definitions = [
  {id:"trade-nodes-and-bonuses",region:["NA","EU"],identity:"Legacy localized node names; migrate to client node IDs before accepting external packs.",
    inputs:[section("const NODES =", "const el =")], provenance:[{kind:"bundled-legacy-data",path:UI, note:"Original node coordinate and formula provenance is not recorded per record."}],
    status:"review-required",note:"Coordinate source and trading formulas need a recorded authoritative audit."},
  {id:"grind-zones-and-loot",region:["NA","EU"],identity:"Stable application spot.id; drops use client item IDs or retained legacy aliases.",
    inputs:[file("Assets/GrindTracker/grind-spots.js"),file("Assets/GrindTracker/grind-spots-inner-edania.js"),file("Assets/GrindTracker/grind-spots-corrections.js")],
    provenance:[{kind:"installed-client-fixture",repositoryPath:"tests/fixtures/grind-loot-client-20260903.json",snapshotDate:"2026-09-03"},
      {kind:"official-patch",url:patch(10514),publishedDate:"2026-08-27"},{kind:"official-patch",url:patch(10451),publishedDate:"2026-08-13"}],
    patchDate:"2026-09-03",status:"partial",note:"23 zones' advertised obtainable items were cross-checked against the September 3 client and official removals. This does not verify all zone stats, prices or an exhaustive server loot pool.",
    related:["grind-price-identities","grind-caps-and-resistances","grind-guides"],
    checks:["Check added/removed drop IDs and any renamed or replacement trash item.","Review market aliases, fixed/vendor prices, unmarketable flags and reference fallback prices.","Review recommended stats and cap/resistance mappings for each affected stable zone ID.","Review the zone's mechanics, route and source links; unchanged values still need an explicit disposition."]},
  {id:"grind-price-identities",region:["EU"],identity:"Client item IDs plus explicit legacy alias map; runtime EU market prices are not bundled values.",
    inputs:[section("const GRIND_FIXED_ITEM_PRICES=", "function grindNormalizeItemName(")],
    provenance:[{kind:"bundled-legacy-data",path:UI,note:"Fixed prices, alias IDs and fallback prices; not a live market snapshot."}],
    status:"review-required",note:"Known legacy trash identity/value discrepancies remain. Hash regeneration must not label prices verified.",related:["grind-zones-and-loot"]},
  {id:"grind-caps-and-resistances",region:["NA","EU"],identity:"Legacy normalized zone names; not all caps have authoritative provenance.",
    inputs:[section("const grindSpotCcOverrides=", "function grindPowerText(")],
    provenance:[{kind:"bundled-legacy-data",path:UI,note:"Explicit overrides plus estimated fallback calculations."}],
    status:"review-required",note:"Estimated AP/DP fallback and name-keyed overrides require a separate factual review.",related:["grind-zones-and-loot","grind-guides"]},
  {id:"grind-guides",region:["NA","EU"],identity:"Guide spotId references the application spot.id.",
    inputs:[file("Assets/GrindTracker/grind-guides.js"),file("Assets/GrindTracker/grind-guides-current.js")],
    provenance:[{kind:"per-record-citations",path:"Assets/GrindTracker/grind-guides.js",note:"Each guide retains publisher, URL and source date; official and community references are mixed."},
      {kind:"per-record-citations",path:"Assets/GrindTracker/grind-guides-current.js"}],
    status:"partial",note:"Coverage tests check structure and routes, not independent correctness of every cited mechanic.",related:["grind-zones-and-loot","grind-caps-and-resistances"]},
  {id:"recipe-catalog",region:["NA","EU"],identity:"Client item IDs; stable recipe IDs retain recipe type and variant distinctions.",
    inputs:[file("Assets/RecipeBook/recipes.json"),file("Assets/RecipeBook/filter-report.json"),file("Assets/RecipeBook/manifest.json")],
    provenance:[{kind:"embedded-client-provenance",path:"Assets/RecipeBook/recipes.json",jsonPointer:"/source"},{kind:"official-patch",url:patch(10550),publishedDate:"2026-09-03"}],
    patchDate:"2026-09-03",status:"partial",note:"Installed-client extraction and patch filtering retain source hashes. Unresolved yields and fallback artwork are not asserted verified.",related:["recipe-substitution-groups","lightstone-sets","dehkia-fuel-rules"]},
  {id:"recipe-substitution-groups",region:["NA","EU"],identity:"Stable curated substitution group IDs; exact item ID and enhancement inventories remain distinct.",
    inputs:[section("/* RECIPE_BOOK_CORE_START */", "/* RECIPE_BOOK_CORE_END */")],
    provenance:[{kind:"curated-application-rules",path:UI,note:"Reviewed ingredient substitution groups and recipe interpretation; validated with repository fixtures."}],
    status:"partial",note:"Algorithm and fixture checks do not establish every recipe's current in-game outcome.",related:["recipe-catalog"]},
  {id:"ap-dp-brackets",region:["NA","EU"],identity:"Stat type and inclusive bracket range, with explicit high-stat formulas.",
    inputs:[section("const AP_LOWER_BRACKETS=", "const bracketState=")],
    provenance:[{kind:"bundled-application-tables",path:UI,note:"Per-value external provenance is not recorded; test-brackets-js validates known boundaries."}],
    status:"review-required",note:"Keep range/formula regression coverage; add authoritative row provenance before certifying this dataset.",related:["grind-caps-and-resistances"]},
  {id:"mastery-brackets",region:["NA","EU"],identity:"Life skill and mastery threshold; some rows are generated curves, not client-table values.",
    inputs:[section("const MASTERY_LEVELS=", "function masteryNumber(")],
    provenance:[{kind:"application-generated-curves",path:UI,note:"Current formulas are not verified client tables."}],
    status:"review-required",note:"Known Cooking values differ from the September 3 client. This foundation deliberately does not claim to fix or certify mastery values.",related:["recipe-catalog","lightstone-sets"]},
  {id:"lightstone-sets",region:["NA","EU"],identity:"Legacy set names plus type; a future external pack must introduce stable record IDs with rename migration.",
    inputs:[section("const LIGHTSTONE_SETS=", "const lightstoneState="),section("const AMPLIFIED_LIGHTSTONE_EFFECTS=", "const LIGHTSTONE_COLOR_PALETTE=")],
    provenance:[{kind:"per-record-attribution",path:UI,note:"Baseline sets name the official NA/EU Adventurer's Guide."},{kind:"official-patch",url:patch(10550),publishedDate:"2026-09-03"}],
    patchDate:"2026-09-03",status:"partial",note:"September 3 Life Skill patch overrides are recorded; not all older combat/amplified values are individually reverified.",related:["mastery-brackets","recipe-catalog"]},
  {id:"boss-schedule-fallback",region:["EU"],identity:"Server-local weekday/time and boss name; live snapshots use separate source/fetched timestamps.",
    inputs:[section("const BUNDLED_HOME_BOSS_TIMES =", "const HOME_EVENT_BOSS_COLORS =")],
    provenance:[{kind:"runtime-provider",url:"https://api.bdoalerts.net/api/boss-schedule/eu",note:"Provider configured in BossScheduleService; this does not date or certify the bundled fallback."}],
    status:"review-required",note:"Bundled fallback has no recorded last-verification date. Region/timezone and event changes require explicit review.",related:["reset-policies","weekly-activities"]},
  {id:"reset-policies",region:["NA","EU"],identity:"Reset config key and explicit time policy; server-specific exceptions require review.",
    inputs:[section("const RESET_TIMER_CONFIG =", "const RESET_TIMER_ICON_SVGS =")],
    provenance:[{kind:"curated-application-rules",path:UI,note:"Reset definitions are bundled; original per-policy source dates are not recorded."}],
    status:"review-required",note:"UTC policies and server-local schedules must be checked separately.",related:["weekly-activities","boss-schedule-fallback"]},
  {id:"weekly-activities",region:["NA","EU"],identity:"Stable curated task.id and reset policy key; completion stored against each cycle.",
    inputs:[section("const WEEKLY_RESET_POLICIES=", "const WEEKLY_CATALOG_BY_ID=")],
    provenance:[{kind:"curated-application-catalog",path:UI,note:"Activity names and reset policies from the existing planner; per-record external provenance is not yet retained."}],
    status:"review-required",note:"Reset workflow tests prevent state regressions but do not verify every current quest requirement.",related:["reset-policies","grind-guides"]},
  {id:"dehkia-fuel-rules",region:["EU"],identity:"Client accessory item ID and enhancement; EU price/stock fetched separately.",
    inputs:[section("const DEHKIA_CATALOG=", "const DEHKIA_MARKET_ROW_COUNT="),file("BlackSpiritHub/DehkiaFuelService.cs")],
    provenance:[{kind:"bundled-client-identities",path:"Assets/DehkiaFuel/manifest.json",note:"Icon source profiles and accessory IDs are recorded; icon retrieval date does not verify fuel yields."}],
    status:"review-required",note:"Native and frontend fuel yields must stay consistent and need factual rechecking when game rules change.",related:["recipe-catalog"]}
];

function readInput(root,input) {
  const absolute=path.resolve(root,input.path);
  if(!absolute.startsWith(`${path.resolve(root)}${path.sep}`))throw new Error(`Out-of-root dataset: ${input.path}`);
  const raw=fs.readFileSync(absolute);
  if(!input.start)return {bytes:raw.length,sha256:sha(raw)};
  // LF-normalize selected text so a checkout's line-ending conversion does not
  // produce a fake game-data change; full-file entries retain exact bytes.
  const text=raw.toString("utf8").replaceAll("\r\n","\n");
  const start=text.indexOf(input.start), end=text.indexOf(input.end,start+input.start.length);
  if(start<0||end<=start)throw new Error(`Missing data section in ${input.path}: ${input.start}`);
  const body=Buffer.from(text.slice(start,end),"utf8");
  return {bytes:body.length,sha256:sha(body),encoding:"utf8-lf-section"};
}

export function buildManifest(sourceRoot) {
  const datasets=definitions.map(definition => {
    const inputs=definition.inputs.map(input=>({...input,...readInput(sourceRoot,input)}));
    const revision=sha(JSON.stringify(inputs.map(({path,start,end,sha256})=>({path,start,end,sha256}))));
    return {id:definition.id,revision,region:definition.region,identity:definition.identity,inputs,
      provenance:definition.provenance,patchDate:definition.patchDate??null,
      verification:{status:definition.status,verifiedAt:null,note:definition.note},
      reviewOnChange:{relatedDatasetIds:definition.related??[],checks:definition.checks??["Recheck affected identities, values and downstream consumers against recorded authoritative sources."]}};
  });
  return {schemaVersion:1,kind:"bundled-game-data-inventory",revision:sha(JSON.stringify(datasets)),
    policy:{delivery:"bundled-only",automaticDataDownloads:false,
      trust:"Hashes detect changes; they do not establish factual correctness, freshness, publisher identity or a trusted download.",
      review:"Changed datasets require explicit source-backed review of the affected dataset and every listed dependency. Regeneration alone is not approval.",
      excluded:"User saves, live market prices, event feeds and coupon feeds are runtime data, not this bundled catalog. Images have separate asset manifests."},
    datasets};
}

export function changesRequiringReview(previous,current) {
  const old=new Map((previous?.datasets??[]).map(dataset=>[dataset.id,dataset]));
  const now=new Map(current.datasets.map(dataset=>[dataset.id,dataset]));
  return current.datasets.filter(dataset=>old.has(dataset.id)&&old.get(dataset.id).revision!==dataset.revision).map(dataset=>({
    datasetId:dataset.id,previousRevision:old.get(dataset.id).revision,revision:dataset.revision,
    requiredDatasets:[dataset.id,...dataset.reviewOnChange.relatedDatasetIds].map(id=>({datasetId:id,revision:now.get(id).revision})),
    checks:dataset.reviewOnChange.checks
  }));
}

export function validateReview(change,review) {
  if(!review||review.datasetId!==change.datasetId||review.revision!==change.revision||
    !/^\d{4}-\d{2}-\d{2}$/.test(review.reviewedAt??"")||!String(review.reviewer??"").trim()||
    !Array.isArray(review.sources)||!review.sources.length||!review.sources.every(source=>typeof source==="string"&&/^https:\/\//.test(source)))return false;
  return change.requiredDatasets.every(required=>review.dependencies?.some(entry=>
    entry.datasetId===required.datasetId&&entry.revision===required.revision&&
    ["updated","checked-no-change"].includes(entry.disposition)&&String(entry.notes??"").trim().length>=12));
}

export function prepareManifest(sourceRoot,previous=null,reviews=[]) {
  const current=buildManifest(sourceRoot);
  // Keep unapproved changes across repeated regeneration; changing the hash a
  // second time must not silently erase the original review requirement.
  const pending=new Map((previous?.pendingReviews??[]).map(review=>[review.datasetId,review]));
  for(const change of changesRequiringReview(previous,current))pending.set(change.datasetId,change);
  const currentById=new Map(current.datasets.map(dataset=>[dataset.id,dataset]));
  for(const [id,change] of pending) {
    const dataset=currentById.get(id);
    if(!dataset)throw new Error(`Pending review refers to missing dataset ${id}; review removals explicitly.`);
    pending.set(id,{...change,revision:dataset.revision,requiredDatasets:[id,...dataset.reviewOnChange.relatedDatasetIds]
      .map(datasetId=>({datasetId,revision:currentById.get(datasetId).revision}))});
  }
  const records=[...(previous?.reviewRecords??[]),...reviews];
  const approved=[], outstanding=[];
  for(const change of pending.values()) {
    const record=records.find(review=>validateReview(change,review));
    if(record)approved.push(record); else outstanding.push(change);
  }
  return {...current,pendingReviews:outstanding,reviewRecords:[...new Map([...records,...approved].map(review=>[`${review.datasetId}:${review.revision}`,review])).values()]};
}

const isMain=process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(isMain) {
  const args=process.argv.slice(2);
  const option=name=>{const index=args.indexOf(name);return index>=0?args[index+1]:null;};
  const root=path.resolve(option("--source")||path.join(import.meta.dirname,"..","Source Code"));
  const manifestPath=path.join(root,MANIFEST_PATH);
  const previous=fs.existsSync(manifestPath)?JSON.parse(fs.readFileSync(manifestPath,"utf8")):null;
  const reviews=option("--reviews")?JSON.parse(fs.readFileSync(path.resolve(option("--reviews")),"utf8")):[];
  if(!Array.isArray(reviews))throw new Error("Review input must be an array of explicit review records.");
  const result=prepareManifest(root,previous,reviews);
  if(args.includes("--write")) {
    fs.mkdirSync(path.dirname(manifestPath),{recursive:true});
    fs.writeFileSync(manifestPath,`${JSON.stringify(result,null,2)}\n`,"utf8");
    console.log(`Indexed ${result.datasets.length} bundled datasets; ${result.pendingReviews.length} change review(s) pending.`);
  }else if(args.includes("--check")) {
    if(!previous||JSON.stringify(previous)!==JSON.stringify(result)||result.pendingReviews.length) {
      console.error("Game-data manifest is stale or has pending source-backed reviews.");
      for(const review of result.pendingReviews)console.error(`${review.datasetId}: review ${review.requiredDatasets.map(entry=>entry.datasetId).join(", ")}`);
      process.exitCode=1;
    }else console.log(`Game-data manifest is current (${result.datasets.length} datasets). Factual verification remains per dataset.`);
  }else console.log(JSON.stringify(result,null,2));
}
