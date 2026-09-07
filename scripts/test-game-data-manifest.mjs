import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import {MANIFEST_PATH,buildManifest,prepareManifest,changesRequiringReview,validateReview} from "./build-game-data-manifest.mjs";

const root=path.resolve(process.argv[2]||path.join(import.meta.dirname,"..","Source Code"));
const saved=JSON.parse(fs.readFileSync(path.join(root,MANIFEST_PATH),"utf8"));
const actual=prepareManifest(root,saved);
assert.deepEqual(saved,actual,"Bundled game-data manifest is stale: run the builder, then review any changed dataset and its dependencies.");
assert.equal(actual.pendingReviews.length,0,"Unreviewed data changes must not pass release verification.");
assert.equal(actual.schemaVersion,1);
assert.equal(actual.policy.delivery,"bundled-only");
assert.equal(actual.policy.automaticDataDownloads,false,"This groundwork must not enable an untrusted remote data channel.");
assert.equal(actual.datasets.length,14);
assert.deepEqual(buildManifest(root),buildManifest(root),"Data identity must be deterministic, without generation-time timestamps.");
const ids=new Set(actual.datasets.map(dataset=>dataset.id));
assert.equal(ids.size,actual.datasets.length,"Dataset IDs must be unique and stable.");
for(const dataset of actual.datasets) {
  assert.match(dataset.id,/^[a-z][a-z0-9-]+$/);
  assert.match(dataset.revision,/^[a-f0-9]{64}$/);
  assert.ok(dataset.identity.length>20);
  assert.ok(dataset.region.length&&dataset.region.every(region=>["NA","EU"].includes(region)));
  assert.ok(dataset.provenance.length>0);
  assert.ok(["partial","review-required"].includes(dataset.verification.status),"Indexing existing data must not silently certify it.");
  assert.equal(dataset.verification.verifiedAt,null,"No factual review date may be invented by the manifest builder.");
  for(const dependency of dataset.reviewOnChange.relatedDatasetIds)assert.ok(ids.has(dependency),`Missing dependency ${dependency}`);
  for(const input of dataset.inputs) {
    assert.equal(path.isAbsolute(input.path),false);
    assert.doesNotMatch(input.path,/(?:^|\/)\.\.(?:\/|$)/);
    assert.ok(input.bytes>0);
    assert.match(input.sha256,/^[a-f0-9]{64}$/);
  }
}
const byId=new Map(actual.datasets.map(dataset=>[dataset.id,dataset]));
assert.match(byId.get("mastery-brackets").verification.note,/Known Cooking values differ/);
assert.match(byId.get("grind-price-identities").verification.note,/discrepancies remain/);

// A synthetic prior hash exercises production review gating without touching
// any source file, private profile, local installer or external source.
const previous=structuredClone(actual);
previous.datasets.find(dataset=>dataset.id==="grind-zones-and-loot").revision="0".repeat(64);
const changes=changesRequiringReview(previous,actual);
assert.equal(changes.length,1);
const change=changes[0];
assert.deepEqual(change.requiredDatasets.map(entry=>entry.datasetId),[
  "grind-zones-and-loot","grind-price-identities","grind-caps-and-resistances","grind-guides"
],"A loot/zone change must trigger price, cap/resistance and guide review together.");
const pending=prepareManifest(root,previous);
assert.equal(pending.pendingReviews.length,1);
assert.equal(prepareManifest(root,pending).pendingReviews.length,1,"Regenerating twice cannot erase a review requirement.");
assert.equal(validateReview(change,{datasetId:change.datasetId,revision:change.revision}),false,"Hashes alone are not review evidence.");
const review={datasetId:change.datasetId,revision:change.revision,reviewer:"sandbox workflow test",
  reviewedAt:"2026-09-07",sources:["https://example.invalid/test-only-not-real-evidence"],
  dependencies:change.requiredDatasets.map(entry=>({...entry,disposition:"checked-no-change",notes:"Test fixture only: explicit source-backed disposition is required in production."}))};
assert.equal(validateReview(change,review),true);
assert.equal(validateReview(change,{...review,dependencies:review.dependencies.slice(0,-1)}),false,"Every affected dataset must have a disposition.");
assert.equal(validateReview(change,{...review,dependencies:review.dependencies.map(entry=>({...entry,revision:"f".repeat(64)}))}),false,"Evidence must refer to the current dependent revisions.");
assert.equal(prepareManifest(root,pending,[review]).pendingReviews.length,0,"Explicit matching evidence can resolve a review requirement.");
const staleDependency=structuredClone(pending);
staleDependency.pendingReviews[0].requiredDatasets[1].revision="f".repeat(64);
assert.equal(prepareManifest(root,staleDependency,[{...review,dependencies:staleDependency.pendingReviews[0].requiredDatasets.map(entry=>({...entry,disposition:"checked-no-change",notes:"Old dependency revision cannot approve newer data."}))}]).pendingReviews.length,1);

// Check real dataset identities at feature boundaries, not just file hashes.
const sandbox=vm.createContext({window:{}});
for(const input of byId.get("grind-zones-and-loot").inputs)vm.runInContext(fs.readFileSync(path.join(root,input.path),"utf8"),sandbox);
for(const input of byId.get("grind-guides").inputs)vm.runInContext(fs.readFileSync(path.join(root,input.path),"utf8"),sandbox);
const spots=sandbox.window.BDO_GRIND_SPOTS;
const zoneIds=new Set(spots.map(spot=>spot.id));
assert.equal(zoneIds.size,spots.length,"Stable zone IDs must not collide.");
for(const [id,guide] of Object.entries(sandbox.window.BDO_GRIND_GUIDES.guides)) {
  assert.ok(zoneIds.has(Number(id)),`Guide ${id} must resolve to a current zone.`);
  assert.equal(guide.spotId,Number(id));
}
const recipes=JSON.parse(fs.readFileSync(path.join(root,"Assets/RecipeBook/recipes.json"),"utf8"));
assert.equal(new Set(recipes.recipes.map(recipe=>recipe.id)).size,recipes.recipes.length,"Recipe variants require unique stable IDs.");
for(const recipe of recipes.recipes)assert.ok(recipes.items[String(recipe.outputId)],`Recipe ${recipe.id} has an unknown output identity.`);

console.log(`Game-data manifest checks passed: ${actual.datasets.length} datasets; identity links; explicit cross-feature review gates. No data was certified by hashing.`);
