import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const sourceRoot=path.resolve(process.argv[2]||"Source Code");
const read=relative=>fs.readFileSync(path.join(sourceRoot,relative),"utf8");
const dataFiles=[
  "Assets/GrindTracker/grind-spots.js",
  "Assets/GrindTracker/grind-spots-inner-edania.js",
  "Assets/GrindTracker/grind-spots-corrections.js",
  "Assets/GrindTracker/grind-guides.js",
  "Assets/GrindTracker/grind-guides-current.js"
];
const context={window:{}};
vm.createContext(context);
for(const file of dataFiles)vm.runInContext(read(file),context,{filename:file});

const spots=context.window.BDO_GRIND_SPOTS;
const bundle=context.window.BDO_GRIND_GUIDES;
const guides=bundle.guides;
assert.equal(bundle.schemaVersion,2);
assert.equal(bundle.minRecommendedAp,250);
assert.equal(bundle.guideCount,61);
assert.equal(Object.keys(guides).length,61);

const spotById=new Map(spots.map(spot=>[String(spot.id),spot]));
const eligible=spots.filter(spot=>Number(spot.ap)>=250);
assert.equal(eligible.length,61,"The corrected live catalog should expose 61 distinct 250 AP+ profiles");
assert.equal(eligible.filter(spot=>!guides[String(spot.id)]).length,0,"Every live 250 AP+ profile needs a guide");
assert.equal(Object.keys(guides).filter(id=>!spotById.has(id)).length,0,"Every guide must resolve to a live catalog profile");
assert.ok(!spotById.has("112"),"The unfinished Winter Tree TBD duplicate must be hidden");
assert.ok(!spotById.has("914"),"The obsolete pre-renewal Sycraia duplicate must be hidden");

const exactCatalog={
  4:{players:"1"},149:{ap:280,dp:350},150:{ap:250,dp:320},167:{ap:340},
  169:{name:"Orzekea",zone:"Atoraxxion"},908:{name:"Sycraia Ruins (Lower Zone)",ap:395,dp:460},
  911:{ap:370,dp:440,players:"3"},912:{ap:350,dp:427,players:"3"}
};
for(const [id,expected] of Object.entries(exactCatalog))for(const [key,value] of Object.entries(expected))assert.equal(spotById.get(id)?.[key],value,`Catalog correction ${id}.${key}`);

const tones=new Set(["trigger","do","watch","avoid"]);
const visualKinds=new Set(["rotation-route","rotation-sites","activation-map","activation-object","encounter-layout","zone-overview"]);
const routeStatuses=new Set(["embedded","text-only","not-applicable","pending-original"]);
const referencedImages=new Set();
for(const [id,guide] of Object.entries(guides)){
  const spot=spotById.get(id);
  assert.ok(spot,"Missing spot "+id);
  assert.ok(Number(spot.ap)>=250,"Below threshold "+id);
  assert.equal(guide.spotId,Number(id));
  assert.ok(String(guide.summary||"").length>=50,"Thin summary "+id);
  assert.doesNotMatch(String(guide.summary),/has not yet|full (?:mechanic )?steps? (?:are )?(?:still )?pending|Foundry currently/i,"Placeholder summary "+id);
  assert.ok(Array.isArray(guide.steps)&&guide.steps.length>=3,"Incomplete mechanics "+id);
  assert.ok(String(guide.source?.publisher||"").trim(),"Missing publisher "+id);
  assert.match(String(guide.source?.url||""),/^https:\/\//,"Missing reference URL "+id);
  assert.ok(Array.isArray(guide.sources)&&guide.sources.length>=1,"Missing audit provenance "+id);
  for(const reference of guide.sources){assert.ok(String(reference?.publisher||"").trim());assert.match(String(reference?.url||""),/^https:\/\//)}
  if(guide.source.publisher==="Black Desert Foundry")assert.ok(guide.sources.some(reference=>reference.publisher!=="Black Desert Foundry"),"Foundry-sourced mechanics need an independent cross-check "+id);
  for(const item of guide.steps){
    assert.ok(tones.has(item.tone),`Unknown tone ${id}: ${item.tone}`);
    assert.ok(String(item.title||"").trim());
    assert.ok(String(item.text||"").trim().length>=25,`Thin mechanic ${id}: ${item.title}`);
    assert.doesNotMatch(String(item.title)+String(item.text),/[<>]/);
    assert.doesNotMatch(String(item.text),/full (?:mechanic )?steps? (?:are )?(?:still )?pending|has not yet published/i,`Placeholder mechanic ${id}`);
  }
  assert.ok(Array.isArray(guide.rotations)&&guide.rotations.length>=1,"Missing route or encounter flow "+id);
  assert.ok(guide.rotations.some(item=>!item.image),"Every profile needs usable route or flow prose "+id);
  for(const item of guide.rotations){
    assert.ok(visualKinds.has(item.visualKind),`Unknown visual kind ${id}: ${item.visualKind}`);
    assert.ok(routeStatuses.has(item.routeStatus),`Unknown route status ${id}: ${item.routeStatus}`);
    assert.ok(String(item.title||"").trim());
    assert.ok(String(item.caption||"").trim().length>=35,`Thin route guidance ${id}: ${item.title}`);
    if(!item.image){
      assert.notEqual(item.routeStatus,"embedded",`Text-only guidance cannot claim an embedded visual: ${id}`);
      assert.notEqual(item.routeStatus,"pending-original",`Usable prose should not ship as pending: ${id}`);
      continue;
    }
    assert.match(item.image,/^Assets\/GrindTracker\/guides\/[a-z0-9._-]+\.(?:png|jpe?g|webp)$/i);
    assert.equal(item.routeStatus,"embedded");
    const full=path.join(sourceRoot,...item.image.split("/"));
    assert.ok(fs.existsSync(full),"Missing "+item.image);
    assert.ok(fs.statSync(full).size>1000,"Empty image "+item.image);
    referencedImages.add(item.image);
  }
}

assert.equal(referencedImages.size,22);
const guideDir=path.join(sourceRoot,"Assets","GrindTracker","guides");
assert.deepEqual(fs.readdirSync(guideDir).sort(),[...referencedImages].map(item=>path.basename(item)).sort());

const mechanicText=id=>guides[String(id)].steps.map(item=>`${item.title} ${item.text}`).join(" ");
assert.match(mechanicText(161),/absorbs?|Divided golems?/i);
assert.doesNotMatch(mechanicText(161),/baby golems?|left-arm slam/i);
assert.match(mechanicText(162),/Gairas|deep void/i);
assert.match(mechanicText(122),/destroy.*burning|burning.*boxes/i);
assert.doesNotMatch(mechanicText(122),/protect the crates/i);
assert.match(mechanicText(120),/World-weary Soul|15% Attack/i);
assert.match(mechanicText(165),/third and sixth|3rd and 6th/i);
assert.match(mechanicText(907),/Star Debris|chain/i);
assert.match(mechanicText(908),/Sycraia Memory|Tower of Restoration/i);
assert.match(mechanicText(916),/first Golem attack|Stalagmite/i);

const html=read("BlackSpiritHub.Resources.Black_Spirit_Hub.html");
const css=read("BlackSpiritHub.Resources.Black_Spirit_Hub.css");
const js=read("BlackSpiritHub.Resources.Black_Spirit_Hub.js");
const calculator=read("BlackSpiritHub/CalculatorForm.cs");
const order=dataFiles.map(file=>html.indexOf(file));
assert.ok(order.every(value=>value>=0),"Every Grind Tracker data layer must be loaded");
assert.deepEqual([...order].sort((a,b)=>a-b),order,"Grind Tracker data layers must load in dependency order");
assert.ok(html.indexOf("grind-guides-current.js")<html.indexOf("BlackSpiritHub.Resources.Black_Spirit_Hub.js"));
assert.match(calculator,/private const string UiRevision = "[a-z0-9-]+";/);
assert.match(calculator,/AppVersion\.Current \+ "-" \+ UiRevision/);
const coreAssetTokens=[...html.matchAll(/BlackSpiritHub\.Resources\.Black_Spirit_Hub\.(?:css|js)\?v=([^"\s]+)/g)].map(match=>match[1]);
assert.equal(coreAssetTokens.length,2,"Both core UI assets need explicit cache tokens");
assert.equal(new Set(coreAssetTokens).size,1,"The core CSS and JavaScript cache tokens must stay in sync");
assert.match(html,/id="grindGuideLightbox"[^>]*hidden/);
assert.match(js,/function grindRenderGuidePanel\(spot\)/);
assert.match(js,/grindRenderResistancePanel\(spot\)\}\$\{grindRenderGuidePanel\(spot\)/);
assert.doesNotMatch(js,/grindGuideSource|Source:.*Black Desert Foundry/,"The guide panel must not expose an external Foundry link");
assert.match(js,/const grindGuideVisualLabels=\{/);
assert.match(js,/class="grindRotationNote"/);
for(const tone of tones)assert.match(css,new RegExp("\\.grindMechanicCard\\.tone-"+tone));
assert.match(css,/\.grindRotationCard>img[^}]*object-fit:contain/);
assert.match(css,/\.grindRotationNote\{/);
assert.match(css,/\.grindGuideLightbox\{[^}]*position:fixed[^}]*z-index:2100/);
assert.match(css,/#grindTrackerView\.active\{[^}]*transform:none/);
const pickerOverlayRule=[...css.matchAll(/\.grindPickerOverlay\{([^}]*)\}/g)].at(-1)?.[1]||"";
assert.match(pickerOverlayRule,/inset:var\(--fixedTopOffset,218px\) 0 var\(--bsh-status-bar-height,50px\)/);
assert.match(pickerOverlayRule,/align-items:start/);
assert.match(pickerOverlayRule,/justify-items:center/);
assert.match(pickerOverlayRule,/overflow:hidden/);
assert.doesNotMatch(pickerOverlayRule,/inset:0|place-items:center/);
const pickerModalRule=[...css.matchAll(/\.grindPickerModal\{([^}]*)\}/g)].at(-1)?.[1]||"";
assert.match(pickerModalRule,/height:min\(820px,100%\)/);
assert.match(pickerModalRule,/max-height:100%/);
assert.match(pickerModalRule,/min-height:0/);
assert.match(js,/if\(list\)list\.scrollTop=0/);
assert.match(js,/search\?\.focus\(\{preventScroll:true\}\)/);
console.log("Grind-zone mechanics and route coverage verification passed for all 61 live 250 AP+ profiles.");
