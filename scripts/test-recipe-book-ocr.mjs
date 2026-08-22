import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "..");
const sourceRoot = process.argv[2] ? path.resolve(process.argv[2]) : path.join(repositoryRoot, "Source Code");
const scriptPath = path.join(sourceRoot, "BlackSpiritHub.Resources.Black_Spirit_Hub.js");
const htmlPath = path.join(sourceRoot, "BlackSpiritHub.Resources.Black_Spirit_Hub.html");
const cssPath = path.join(sourceRoot, "BlackSpiritHub.Resources.Black_Spirit_Hub.css");
const calculatorPath = path.join(sourceRoot, "BlackSpiritHub", "CalculatorForm.cs");
const servicePath = path.join(sourceRoot, "BlackSpiritHub", "RecipeBookScreenshotService.cs");
const recognizerPath = path.join(sourceRoot, "BlackSpiritHub", "PpOcrv5QuantityRecognizer.cs");
const fixtureRunnerPath = path.join(sourceRoot, "BlackSpiritHub", "RecipeBookOcrFixtureRunner.cs");
const programPath = path.join(sourceRoot, "BlackSpiritHub", "Program.cs");
const legacyInstallerPath = path.join(sourceRoot, "InstallerSource", "BlackSpiritHubInstaller", "Program.cs");
const projectPath = path.join(sourceRoot, "Black Spirit Hub.csproj");
const recipeDataPath = path.join(sourceRoot, "Assets", "RecipeBook", "recipes.json");
const recipeNoticePath = path.join(sourceRoot, "Assets", "RecipeBook", "NOTICE.txt");
const ocrAssetRoot = path.join(sourceRoot, "Assets", "RecipeBook", "ocr");
const releasePath = path.join(repositoryRoot, "scripts", "release.ps1");
const verifyPath = path.join(repositoryRoot, "scripts", "verify.ps1");
const nativeInstallerPath = path.join(repositoryRoot, "scripts", "build-native-installer.ps1");
const innoInstallerPath = path.join(sourceRoot, "InstallerSource", "InnoSetup", "BlackSpiritHub.iss");
const fixtureRoot = path.join(repositoryRoot, "tests", "fixtures", "recipe-book-ocr");
const fixtureManifestPath = path.join(fixtureRoot, "manifest.json");
const source = fs.readFileSync(scriptPath, "utf8");
const html = fs.readFileSync(htmlPath, "utf8");
const css = fs.readFileSync(cssPath, "utf8");

function sourceBetween(text, startMarker, endMarker) {
  const start = text.indexOf(startMarker);
  const end = text.indexOf(endMarker);
  assert.ok(start >= 0 && end > start, `Missing executable source markers ${startMarker} / ${endMarker}`);
  return text.slice(start + startMarker.length, end);
}

const recipeCore = sourceBetween(source, "/* RECIPE_BOOK_CORE_START */", "/* RECIPE_BOOK_CORE_END */");
const ocrCore = sourceBetween(source, "/* RECIPE_BOOK_OCR_CORE_START */", "/* RECIPE_BOOK_OCR_CORE_END */");
const context = vm.createContext({ console, Object, Map, Set, Number, String, Boolean, Math, JSON });
vm.runInContext(`${recipeCore}\n${ocrCore}\nglobalThis.ocrCore={
  parseQuantity:recipeBookOcrParseQuantity,
  dimensionsAreSafe:recipeBookOcrDimensionsAreSafe,
  previewBox:recipeBookOcrPreviewBox,
  sanitizeResult:recipeBookOcrSanitizeResult,
  partitionReviewRows:recipeBookOcrPartitionReviewRows,
  buildReviewRows:(analysis,data)=>recipeBookOcrPartitionReviewRows(analysis,data).rows,
  buildMaterialCatalog:recipeBookOcrBuildMaterialCatalog,
  removeReviewRow:recipeBookOcrRemoveReviewRow,
  rowIsComplete:recipeBookOcrRowIsComplete,
  buildImportPlan:recipeBookOcrBuildImportPlan,
  applyImportPlan:recipeBookOcrApplyImportPlan,
  createUndoSnapshot:recipeBookOcrCreateUndoSnapshot,
  applyUndo:recipeBookOcrApplyUndo,
  registerFingerprint:recipeBookOcrRegisterFingerprint,
  prepareData:recipeBookPrepareData
};`, context, { filename: "recipe-book-ocr-core.js" });
const core = context.ocrCore;
const clone = value => JSON.parse(JSON.stringify(value));

assert.deepEqual(clone(core.parseQuantity("1,234")), { valid:true, value:1234, approximate:false, text:"1,234" });
assert.deepEqual(clone(core.parseQuantity("139.9K")), { valid:true, value:139900, approximate:true, text:"139.9K" });
assert.deepEqual(clone(core.parseQuantity("143.0K")), { valid:true, value:143000, approximate:true, text:"143.0K" });
assert.deepEqual(clone(core.parseQuantity("174.5K")), { valid:true, value:174500, approximate:true, text:"174.5K" });
assert.deepEqual(clone(core.parseQuantity("498.8K")), { valid:true, value:498800, approximate:true, text:"498.8K" });
assert.deepEqual(clone(core.parseQuantity("1.3m")), { valid:true, value:1300000, approximate:true, text:"1.3M" });
assert.equal(core.parseQuantity("12.5").valid, false, "A decimal without a BDO K/M suffix is not an exact whole quantity");
for(const malformed of ["7455K","440K","174 5K","174.55K","3G717"]){
  assert.equal(core.parseQuantity(malformed).valid,false,`${malformed} must not be expanded into a different quantity`);
}
assert.equal(core.parseQuantity("7455K").approximate,true,"A malformed suffix read must still be presented as a suspicious rounded label");
assert.equal(core.parseQuantity("0").valid, false);
assert.equal(core.parseQuantity("1000000000000").valid, false, "Quantities above My Resources' storage cap must be rejected");
assert.equal(core.dimensionsAreSafe(625,746), true, "A tightly cropped 625×746 nine-column BDO storage screenshot must be accepted");
assert.equal(core.dimensionsAreSafe(132,80), true, "A tight two-slot material crop must be accepted");
assert.equal(core.dimensionsAreSafe(267,198), true, "A partial four-column storage crop must be accepted");
assert.equal(core.dimensionsAreSafe(1,1), true, "Intake must attempt every non-empty decoded image instead of imposing a full-grid minimum");
assert.equal(core.dimensionsAreSafe(0,80), false, "Decoded image dimensions must remain positive");
assert.equal(core.dimensionsAreSafe(7680,4320), false, "The independent edge limits must not bypass the 24-megapixel cap");
assert.deepEqual(
  clone(core.previewBox({ x:523, y:707, width:58, height:58 },673,783)),
  { x:516, y:705, width:72, height:62 },
  "The full-storage tomato preview must include enough horizontal context to show its 143.0K label"
);
assert.deepEqual(
  clone(core.previewBox({ x:0, y:0, width:58, height:58 },673,783)),
  { x:0, y:0, width:65, height:60 },
  "Preview padding must clamp safely at the left and top image edges"
);
assert.deepEqual(
  clone(core.previewBox({ x:615, y:725, width:58, height:58 },673,783)),
  { x:608, y:723, width:65, height:60 },
  "Preview padding must clamp safely at the right and bottom image edges"
);

const icon = character => `icons/items/${character.repeat(64)}.webp`;
const fixture = {
  schemaVersion:1,
  items:{
    "10":{ name:"Pine Timber", grade:0, icon:icon("a") },
    "20":{ name:"Deer Meat", grade:0, icon:icon("b") },
    "21":{ name:"Beef", grade:0, icon:icon("b") },
    "22":{ name:"Lamb Meat", grade:0, icon:icon("b") },
    "23":{ name:"Fox Meat", grade:0, icon:icon("b") },
    "30":{ name:"Magic Log", grade:1, icon:icon("c") },
    "40":{ name:"Salt", grade:0, icon:icon("d") },
    "50":{ name:"Onion", grade:0, icon:icon("f") },
    "51":{ name:"High-quality Onion", grade:1, icon:icon("f") },
    "52":{ name:"Special Onion", grade:2, icon:icon("f") },
    "60":{ name:"Weapon Box", grade:2, icon:icon("1") },
    "61":{ name:"Event Coupon", grade:0, icon:icon("2") },
    "62":{ name:"Silk Drapeless Curtain", grade:2, icon:icon("3") },
    "63":{ name:"Goat Hide", grade:0, icon:icon("4") },
    "64":{ name:"Mixed-use Material", grade:0, icon:icon("5") },
    "66":{ name:"Shared-art Ingredient", grade:0, icon:icon("7") },
    "67":{ name:"Finished Shared-art Product", grade:0, icon:icon("7") },
    "68":{ name:"Cotton Fabric", grade:0, icon:icon("8") },
    "69":{ name:"Dried Beltfish", grade:0, icon:icon("9") },
    "70":{ name:"Dried Sturgeon", grade:0, icon:icon("9") },
    "71":{ name:"Clear Liquid Reagent", grade:0, icon:icon("6") },
    "100":{ name:"Test Output", grade:0, icon:icon("e") }
  },
  recipes:[
    { id:"pine", outputId:"100", type:"CRAFT", inputs:[{ itemId:"10", count:1 }] },
    { id:"deer", outputId:"100", type:"COOK", inputs:[{ itemId:"20", count:1 }] },
    { id:"beef", outputId:"100", type:"COOK", inputs:[{ itemId:"21", count:1 }] },
    { id:"lamb", outputId:"100", type:"COOK", inputs:[{ itemId:"22", count:1 }] },
    { id:"fox", outputId:"100", type:"COOK", inputs:[{ itemId:"23", count:1 }] },
    { id:"log-base", outputId:"100", type:"CRAFT", inputs:[{ itemId:"30", count:1 }] },
    { id:"log-enhanced", outputId:"100", type:"CRAFT", inputs:[{ itemId:"30", enhancement:2, count:1 }] },
    { id:"salt", outputId:"100", type:"COOK", inputs:[{ itemId:"40", count:1 }] },
    { id:"onion-one", outputId:"100", type:"COOK", inputs:[{ itemId:"50", count:1 }] },
    { id:"onion-two", outputId:"100", type:"COOK", inputs:[{ itemId:"50", count:2 }] },
    { id:"onion-three", outputId:"100", type:"COOK", inputs:[{ itemId:"50", count:3 }] },
    { id:"onion-high-quality", outputId:"100", type:"COOK", inputs:[{ itemId:"51", count:1 }] },
    { id:"onion-special", outputId:"100", type:"COOK", inputs:[{ itemId:"52", count:1 }] },
    { id:"house-curtain", outputId:"100", type:"HOUSE", inputs:[{ itemId:"62", count:1 }] },
    { id:"dry-hide", outputId:"100", type:"DRY", inputs:[{ itemId:"63", count:1 }] },
    { id:"house-mixed", outputId:"100", type:"HOUSE", inputs:[{ itemId:"64", count:1 }] },
    { id:"heat-mixed", outputId:"100", type:"HEAT", inputs:[{ itemId:"64", count:1 }] },
    { id:"shared-art-input", outputId:"100", type:"COOK", inputs:[{ itemId:"66", count:1 }] },
    { id:"cotton-input", outputId:"100", type:"HOUSE", inputs:[{ itemId:"68", count:1 }] },
    { id:"dried-beltfish-input", outputId:"100", type:"COOK", inputs:[{ itemId:"69", count:1 }] },
    { id:"clear-liquid-reagent-input", outputId:"100", type:"ALCHEMY", inputs:[{ itemId:"71", count:1 }] },
    { id:"generic-red-meat", outputId:"100", type:"COOK", inputs:[{ itemId:"7905", count:5 }] },
    { id:"generic-blood", outputId:"100", type:"ALCHEMY", inputs:[{ itemId:"6214", count:2 }] }
  ]
};
const data = core.prepareData(fixture);
const materialCatalog = core.buildMaterialCatalog(data);
assert.equal(materialCatalog.length,data.resourceItems.length,"The review fallback must expose every exact Recipe Book input identity across every recipe category");
assert.ok(materialCatalog.some(entry => entry.key === "40:0" && /Salt · Item 40$/.test(entry.label)), "A material outside the native icon shortlist must remain searchable by name and item ID");
assert.ok(materialCatalog.some(entry => entry.key === "30:2" && /^\+2 Magic Log · Item 30$/.test(entry.label)), "Full-catalog correction must preserve enhancement identity");
assert.equal(data.resourceLookup["60:0"],undefined,"A weapon box that is never used as a recipe input must not become an importable material");
assert.equal(data.resourceLookup["61:0"],undefined,"An event coupon that is never used as a recipe input must not become an importable material");
assert.equal(data.resourceLookup["100:0"],undefined,"A recipe output must not become importable unless another supported recipe actually uses it as an input");
assert.ok(!materialCatalog.some(entry=>["60:0","61:0","100:0"].includes(entry.key)),"The correction catalog must contain usable recipe materials only");
assert.ok(materialCatalog.some(entry=>entry.key==="62:0"),"A HOUSE recipe input is still a real usable material and must remain available to Screenshot Mats");
assert.ok(materialCatalog.some(entry=>entry.key==="63:0"),"A DRY processing ingredient must remain available to Screenshot Mats");
assert.ok(materialCatalog.some(entry=>entry.key==="64:0"),"An item used by multiple recipe categories must remain available to Screenshot Mats");
const fingerprint = "f".repeat(64);
const analysisPayload = {
  imageFingerprint:fingerprint,
  width:1600,
  height:900,
  grid:{ columns:9, rows:3, confidence:.97 },
  slots:[
    { id:"pine", row:0, column:0, box:{ x:10, y:10, width:60, height:60 }, iconCandidates:[{ icon:icon("a"), score:.96 }], quantityText:"500", quantityValue:500, quantityConfidence:.94 },
    { id:"meat", row:0, column:1, box:{ x:80, y:10, width:60, height:60 }, iconCandidates:[{ icon:icon("b"), score:.97 }], quantityText:"120", quantityValue:120, quantityConfidence:.95 },
    { id:"enhanced", row:0, column:2, box:{ x:150, y:10, width:60, height:60 }, iconCandidates:[{ icon:icon("c"), score:.95 }], quantityText:"7", quantityValue:7, quantityConfidence:.92 },
    { id:"rounded", row:0, column:3, box:{ x:220, y:10, width:60, height:60 }, iconCandidates:[{ icon:icon("a"), score:.96 }], quantityText:"139.9K", quantityValue:139900, quantityApproximate:true, quantityConfidence:.95 },
    { id:"suggested", row:0, column:4, box:{ x:290, y:10, width:60, height:60 }, iconCandidates:[{ icon:icon("d"), score:.70 }], quantityText:"2", quantityValue:2, quantityConfidence:.95 },
    { id:"hidden", row:0, column:5, box:{ x:360, y:10, width:60, height:60 }, iconCandidates:[{ icon:icon("a"), score:.96 }], quantityText:"", quantityValue:1, quantityAssumedOne:true, quantityConfidence:.72 },
    { id:"unsafe", row:99, column:0, box:{ x:0, y:0, width:1, height:1 }, iconCandidates:[], quantityText:"1" },
    { id:"duplicate-id", row:1, column:0, box:{ x:10, y:80, width:60, height:60 }, iconCandidates:[{ icon:"https://evil.example/item.webp", score:1 }], quantityText:"1", quantityConfidence:1 },
    { id:"duplicate-id", row:1, column:1, box:{ x:80, y:80, width:60, height:60 }, iconCandidates:[{ icon:icon("d"), score:1 }], quantityText:"2", quantityConfidence:1 },
    { id:"onion", row:1, column:2, box:{ x:150, y:80, width:60, height:60 }, iconCandidates:[{ icon:icon("f"), score:.97 }], quantityText:"2000", quantityValue:2000, quantityConfidence:.95 }
  ],
  warnings:["Review rounded totals", "", 4],
  extra:"must not survive"
};
const analysis = core.sanitizeResult(analysisPayload);
assert.ok(analysis, "A valid native OCR response must survive the frontend trust boundary");
assert.equal(analysis.imageFingerprint, fingerprint);
assert.equal(analysis.slots.length, 8, "Out-of-grid and duplicate slot IDs must be discarded without losing other valid rows");
assert.equal(analysis.slots.find(slot => slot.id === "duplicate-id").iconCandidates.length, 0, "Remote candidate artwork must be rejected");
assert.deepEqual([...analysis.warnings], ["Review rounded totals", "4"]);
assert.equal(Object.hasOwn(analysis, "extra"), false, "Unknown native response fields must not cross the sanitizer");
const candidateRetentionAnalysis=core.sanitizeResult({
  ...analysisPayload,
  imageFingerprint:"c".repeat(64),
  grid:{columns:1,rows:1,confidence:.9},
  slots:[{
    id:"twelve-candidates",row:0,column:0,box:{x:10,y:10,width:60,height:60},
    iconCandidates:[..."0123456789abcd"].map((character,index)=>({icon:icon(character),score:1-index*.01})),
    quantityText:"130",quantityValue:130,quantityConfidence:.95
  }]
});
assert.equal(candidateRetentionAnalysis.slots[0].iconCandidates.length,12,"The frontend trust boundary must preserve all twelve native icon candidates so a weak real material can survive unrelated nearest matches");
assert.deepEqual(clone(candidateRetentionAnalysis.slots[0].iconCandidates.map(candidate=>candidate.icon)),[..."0123456789ab"].map(icon),"The sanitizer must retain the native candidate order up to the reviewed twelve-candidate cap");
const missingQuantitySlot={ ...analysisPayload.slots[0], id:"missing-quantity" };
delete missingQuantitySlot.quantityValue;
const missingQuantityAnalysis=core.sanitizeResult({ ...analysisPayload, slots:[missingQuantitySlot] });
assert.equal(missingQuantityAnalysis.slots[0].quantityValue,null,"A missing native quantity must not be reconstructed from OCR display text");
const missingQuantityReviewRow=core.buildReviewRows(missingQuantityAnalysis,data)[0];
assert.equal(missingQuantityReviewRow.quantity,"","A missing native quantity must leave the editable quantity field blank");
assert.equal(missingQuantityReviewRow.suggestedQuantity,null,"Display text alone must not become an importable quantity suggestion");
assert.equal(missingQuantityReviewRow.quantityText,"500","The literal OCR text must remain visible to help with manual correction");
assert.equal(missingQuantityReviewRow.reviewRequired,true,"A missing native quantity must require manual correction");
assert.equal(Object.hasOwn(missingQuantityReviewRow,"included"),false,"Screenshot rows must not retain the removed per-row Include state");
assert.equal(Object.hasOwn(missingQuantityReviewRow,"reviewConfirmed"),false,"Screenshot rows must not retain checkmark-driven confirmation state");
assert.equal(core.rowIsComplete(missingQuantityReviewRow,data),false,"Display text alone must not complete a screenshot row");
assert.equal(core.buildImportPlan([missingQuantityReviewRow],data).valid,false,"Apply must stay blocked until the missing native quantity is entered manually");
const stringQuantityAnalysis=core.sanitizeResult({ ...analysisPayload, slots:[{ ...analysisPayload.slots[0], id:"string-quantity", quantityValue:"500" }] });
assert.equal(stringQuantityAnalysis.slots[0].quantityValue,null,"Numeric strings must not be coerced into trusted native quantities");
const stringQuantityReviewRow=core.buildReviewRows(stringQuantityAnalysis,data)[0];
assert.equal(stringQuantityReviewRow.quantity,"","A sanitized numeric-string response must leave the quantity input blank");
assert.equal(stringQuantityReviewRow.suggestedQuantity,null);
assert.equal(stringQuantityReviewRow.quantityText,"500","The rejected numeric string's display text must remain visible");
assert.equal(stringQuantityReviewRow.reviewRequired,true);
assert.equal(core.buildImportPlan([stringQuantityReviewRow],data).valid,false);
const exactLowConfidenceAnalysis=core.sanitizeResult({
  ...analysisPayload,
  imageFingerprint:"d".repeat(64),
  grid:{ columns:1, rows:1, confidence:.8 },
  slots:[{
    id:"exact-low-confidence",
    row:0,
    column:0,
    box:{ x:10, y:10, width:60, height:60 },
    iconCandidates:[{ icon:icon("a"), score:.96 }],
    quantityText:"36717",
    quantityValue:null,
    quantityConfidence:.41
  }]
});
const exactLowConfidenceRow=core.buildReviewRows(exactLowConfidenceAnalysis,data)[0];
assert.equal(exactLowConfidenceAnalysis.slots[0].quantityValue,null,"Low-confidence native null must remain untrusted after sanitizing");
assert.equal(exactLowConfidenceRow.quantity,"","A low-confidence native null must leave the editable quantity blank");
assert.equal(exactLowConfidenceRow.suggestedQuantity,null);
assert.equal(exactLowConfidenceRow.quantityText,"36717","The literal low-confidence read must remain visible for manual entry");
assert.equal(exactLowConfidenceRow.reviewRequired,true);
assert.equal(core.rowIsComplete(exactLowConfidenceRow,data),false,"A low-confidence native null must not complete the row from display text");
assert.equal(core.buildImportPlan([exactLowConfidenceRow],data).valid,false);
const tomatoAnalysis=core.sanitizeResult({
  imageFingerprint:"e".repeat(64),
  width:673,
  height:783,
  grid:{ columns:9, rows:10, confidence:.97 },
  slots:[{
    id:"tomato",
    row:9,
    column:7,
    box:{ x:523, y:707, width:58, height:58 },
    iconCandidates:[{ icon:icon("a"), score:.96 }],
    quantityText:"143.0K",
    quantityValue:null,
    quantityApproximate:true,
    quantityConfidence:.41
  }],
  warnings:[]
});
assert.ok(tomatoAnalysis,"The reviewed 673×783 full-storage tomato slot must cross the frontend trust boundary");
assert.equal(tomatoAnalysis.slots[0].quantityValue,null,"An explicit native null quantity must not be reconstructed from its display text");
assert.equal(tomatoAnalysis.slots[0].quantityText,"143.0K");
assert.equal(tomatoAnalysis.slots[0].quantityApproximate,true);
const tomatoReviewRow=core.buildReviewRows(tomatoAnalysis,data)[0];
assert.equal(tomatoReviewRow.quantity,"","A native-null 143.0K read must not prefill a numeric value");
assert.equal(tomatoReviewRow.suggestedQuantity,null,"A rounded display label cannot substitute for a missing native value");
assert.equal(tomatoReviewRow.quantityText,"143.0K","The visible rounded label must remain available for the review message");
assert.match(tomatoReviewRow.reasons.join(" "),/rounded.*(?:confirm|review)|(?:confirm|review).*rounded/i);
assert.equal(tomatoReviewRow.reviewRequired,true,"A parsed K/M label must still require explicit review because BDO abbreviates it");
assert.equal(core.buildImportPlan([tomatoReviewRow],data).valid,false,"A native-null rounded value must keep Apply blocked until manual entry");
for(const [quantityText,actual] of [["7455K","174.5K"],["440K","498.8K"]]){
  const malformedAnalysis=core.sanitizeResult({
    imageFingerprint:(quantityText.startsWith("7")?"7":"4").repeat(64),
    width:625,
    height:746,
    grid:{columns:1,rows:1,confidence:.9},
    slots:[{
      id:`malformed-${quantityText}`,
      row:0,
      column:0,
      box:{x:24,y:73,width:58,height:58},
      iconCandidates:[{icon:icon("a"),score:.96}],
      quantityText,
      quantityValue:null,
      quantityApproximate:true,
      quantityConfidence:.4
    }],
    warnings:[]
  });
  const malformedRow=core.buildReviewRows(malformedAnalysis,data)[0];
  assert.equal(malformedRow.quantity,"",`${quantityText} must remain out of the numeric input instead of pretending to be ${actual}`);
  assert.equal(malformedRow.suggestedQuantity,null,`${quantityText} must not create an importable numeric suggestion`);
  assert.equal(malformedRow.quantityText,quantityText,"The literal OCR read must remain visible for manual correction");
  assert.equal(core.buildImportPlan([malformedRow],data).valid,false,"A malformed K/M read must keep Apply disabled until corrected");
}
assert.equal(core.sanitizeResult({ ...analysisPayload, imageFingerprint:"not-a-hash" }), null);
assert.equal(core.sanitizeResult({ ...analysisPayload, width:10000, height:10000 }), null, "Oversized decoded pixel surfaces must be rejected");
assert.equal(core.sanitizeResult({ ...analysisPayload, grid:{ columns:0, rows:3, confidence:1 } }), null);
assert.ok(core.sanitizeResult({ ...analysisPayload, grid:{ columns:9, rows:0, confidence:0 }, slots:[] }), "A bounded no-grid result with warnings must remain displayable");
assert.ok(core.sanitizeResult({ ...analysisPayload, width:625, height:746 }), "The native result sanitizer must accept the reported dimensions of the cropped storage screenshot used by browse and paste intake");
assert.ok(core.sanitizeResult({ ...analysisPayload, width:267, height:198, grid:{ columns:4, rows:3, confidence:.9 }, slots:analysisPayload.slots.filter(slot => slot.column < 4 && slot.row < 3) }), "A partial storage-grid result must cross the frontend trust boundary");
assert.ok(core.sanitizeResult({ ...analysisPayload, width:80, height:80, grid:{ columns:1, rows:1, confidence:.8 }, slots:[{ ...analysisPayload.slots[0], row:0, column:0, box:{ x:10, y:10, width:58, height:58 } }] }), "A single-slot crop result must cross the frontend trust boundary");
const manySlots = Array.from({ length:193 }, (_, position) => ({
  id:`slot-${position}`, row:Math.floor(position / 9), column:position % 9,
  box:{ x:position % 9, y:Math.floor(position / 9), width:1, height:1 },
  iconCandidates:[], quantityText:"1", quantityValue:1, quantityConfidence:1
}));
assert.equal(core.sanitizeResult({ ...analysisPayload, height:900, grid:{ columns:9, rows:22, confidence:1 }, slots:manySlots }).slots.length, 192, "The result sanitizer must cap native slot volume");
assert.equal(core.sanitizeResult({ ...analysisPayload, grid:{ columns:10, rows:3, confidence:1 } }), null, "A storage result may expose at most the native nine columns");

const irrelevantAnalysis=core.sanitizeResult({
  imageFingerprint:"8".repeat(64),width:330,height:90,grid:{columns:4,rows:1,confidence:.95},
  slots:[
    {id:"output-only",row:0,column:0,box:{x:10,y:10,width:60,height:60},iconCandidates:[{icon:icon("e"),score:.99,materialEligible:false}],iconMaterialEligible:false,iconMaterialConfidence:.97,iconMaterialMargin:.18,quantityText:"10",quantityValue:10,quantityConfidence:.95},
    {id:"weapon-box",row:0,column:1,box:{x:90,y:10,width:60,height:60},iconCandidates:[{icon:icon("1"),score:.99,materialEligible:false}],iconMaterialEligible:false,iconMaterialConfidence:.96,iconMaterialMargin:.15,quantityText:"6",quantityValue:6,quantityConfidence:.95},
    {id:"event-coupon",row:0,column:2,box:{x:170,y:10,width:60,height:60},iconCandidates:[{icon:icon("2"),score:.99,materialEligible:false}],iconMaterialEligible:false,iconMaterialConfidence:.95,iconMaterialMargin:.12,quantityText:"5",quantityValue:5,quantityConfidence:.95},
    {id:"random-nearest-icon",row:0,column:3,box:{x:250,y:10,width:60,height:60},iconCandidates:[{icon:icon("a"),score:.40},{icon:icon("d"),score:.39}],quantityText:"1",quantityValue:1,quantityConfidence:.95}
  ],warnings:[]
});
const irrelevantRows=core.buildReviewRows(irrelevantAnalysis,data);
assert.deepEqual(clone(irrelevantRows.map(row=>row.slotId)),["random-nearest-icon"],"Weak nearest-icon guesses must remain visible for correction instead of hiding legitimate small materials");
assert.equal(irrelevantRows[0].selectedKey,irrelevantRows[0].options[0].key,"A visible weak match should preselect its most likely usable Recipe Book option");
const irrelevantPartition=core.partitionReviewRows(irrelevantAnalysis,data);
assert.deepEqual(clone(irrelevantPartition.ignoredRows.map(row=>row.slotId)),["output-only","weapon-box","event-coupon"],"Only strong known non-material matches should remain hidden");
assert.ok(irrelevantPartition.ignoredRows.every(row=>row.selectedKey===""),"A strongly hidden non-material slot must never carry a preselected import identity");
const irrelevantPlan=core.buildImportPlan(irrelevantRows,data);
assert.equal(irrelevantPlan.valid,true,"The final Apply action may confirm a preselected weak material after the user reviews the row");
assert.equal(irrelevantPlan.entries.length,1);

const mixedRelevanceAnalysis=core.sanitizeResult({
  imageFingerprint:"9".repeat(64),width:250,height:90,grid:{columns:3,rows:1,confidence:.95},
  slots:[
    {id:"genuine-low-confidence-material",row:0,column:0,box:{x:10,y:10,width:60,height:60},iconCandidates:[{icon:icon("d"),score:.70},{icon:icon("a"),score:.45}],quantityText:"87255",quantityValue:87255,quantityConfidence:.95},
    {id:"irrelevant-coupon",row:0,column:1,box:{x:90,y:10,width:60,height:60},iconCandidates:[{icon:icon("2"),score:.99,materialEligible:false}],iconMaterialEligible:false,iconMaterialConfidence:.96,iconMaterialMargin:.14,quantityText:"1",quantityValue:1,quantityConfidence:.95},
    {id:"ambiguous-noise",row:0,column:2,box:{x:170,y:10,width:60,height:60},iconCandidates:[{icon:icon("a"),score:.46},{icon:icon("d"),score:.455}],quantityText:"34",quantityValue:34,quantityConfidence:.95}
  ],warnings:[]
});
const mixedRelevanceRows=core.buildReviewRows(mixedRelevanceAnalysis,data);
assert.deepEqual(clone(mixedRelevanceRows.map(row=>row.slotId)),["genuine-low-confidence-material","ambiguous-noise"],"Weak ambiguous matches must remain visible while strong known clutter stays hidden");
assert.equal(mixedRelevanceRows[0].selectedKey,"40:0","The retained credible material may preselect its own top candidate");
assert.equal(mixedRelevanceRows[0].reviewRequired,true,"A retained low-confidence material must remain visibly review-derived");
assert.equal(mixedRelevanceRows[1].selectedKey,mixedRelevanceRows[1].options[0].key,"An ambiguous weak row should preselect the highest-ranked usable option for review");
assert.equal(core.buildImportPlan([mixedRelevanceRows[0]],data).valid,true,"Hidden inventory clutter must not block Apply for a complete usable material row");
assert.equal(core.buildImportPlan(mixedRelevanceRows,data).valid,true,"The final Apply action may confirm a visible preselected ambiguous row");
assert.ok(!mixedRelevanceRows.some(row=>row.slotId==="irrelevant-coupon"),"A strong irrelevant slot must not enter the normal review list");
const mixedRelevancePartition=core.partitionReviewRows(mixedRelevanceAnalysis,data);
assert.deepEqual(clone(mixedRelevancePartition.ignoredRows.map(row=>row.slotId)),["irrelevant-coupon"],"Only the strong known-negative slot should be hidden and recoverable");

const positiveNegativeAtlasAnalysis=core.sanitizeResult({
  imageFingerprint:"0".repeat(64),width:250,height:90,grid:{columns:3,rows:1,confidence:.95},
  slots:[
    {id:"known-output-negative",row:0,column:0,box:{x:10,y:10,width:60,height:60},iconCandidates:[{icon:icon("e"),score:.99,materialEligible:false},{icon:icon("4"),score:.88,materialEligible:true}],iconMaterialEligible:false,iconMaterialConfidence:.98,iconMaterialMargin:.11,quantityText:"2",quantityValue:2,quantityConfidence:.95},
    {id:"house-recipe-input",row:0,column:1,box:{x:90,y:10,width:60,height:60},iconCandidates:[{icon:icon("3"),score:.70,materialEligible:true},{icon:icon("5"),score:.40,materialEligible:true}],iconMaterialEligible:true,iconMaterialConfidence:.91,iconMaterialMargin:.12,quantityText:"117400",quantityValue:117400,quantityConfidence:.95},
    {id:"mixed-recipe-input",row:0,column:2,box:{x:170,y:10,width:60,height:60},iconCandidates:[{icon:icon("5"),score:.91,materialEligible:true}],iconMaterialEligible:true,iconMaterialConfidence:.94,iconMaterialMargin:.16,quantityText:"104",quantityValue:104,quantityConfidence:.95}
  ],warnings:[]
});
const positiveNegativeAtlasRows=core.buildReviewRows(positiveNegativeAtlasAnalysis,data);
assert.deepEqual(clone(positiveNegativeAtlasRows.map(row=>row.slotId)),["house-recipe-input","mixed-recipe-input"],"Known output-only artwork must be a negative reference while inputs from every real recipe category remain eligible");
assert.ok(!positiveNegativeAtlasRows.some(row=>row.slotId==="known-output-negative"),"A known irrelevant top atlas match must be ignored even when its second candidate is a high-scoring recipe input");
assert.equal(positiveNegativeAtlasRows.find(row=>row.slotId==="house-recipe-input")?.selectedKey,"62:0","A credible HOUSE recipe input must remain reviewable");
assert.equal(positiveNegativeAtlasRows.find(row=>row.slotId==="mixed-recipe-input")?.selectedKey,"64:0","An item used as any real recipe input must remain eligible");
assert.deepEqual(clone(core.partitionReviewRows(positiveNegativeAtlasAnalysis,data).ignoredRows.map(row=>row.slotId)),["known-output-negative"],"A finished-product winner must be preserved only in the hidden review queue");

const relevanceSafetyAnalysis=core.sanitizeResult({
  imageFingerprint:"7".repeat(64),width:250,height:90,grid:{columns:3,rows:1,confidence:.95},
  slots:[
    {id:"positive-negative-near-tie",row:0,column:0,box:{x:10,y:10,width:60,height:60},iconCandidates:[{icon:icon("a"),score:.82},{icon:icon("e"),score:.815}],quantityText:"100",quantityValue:100,quantityConfidence:.95},
    {id:"mixed-artwork",row:0,column:1,box:{x:90,y:10,width:60,height:60},iconCandidates:[{icon:icon("7"),score:.96,materialEligible:null},{icon:icon("a"),score:.70,materialEligible:true}],iconMaterialEligible:null,iconMaterialConfidence:.96,iconMaterialMargin:0,quantityText:"20",quantityValue:20,quantityConfidence:.95},
    {id:"recoverable-real-low-score",row:0,column:2,box:{x:170,y:10,width:60,height:60},iconCandidates:[{icon:icon("a"),score:.64},{icon:icon("e"),score:.60}],quantityText:"30",quantityValue:30,quantityConfidence:.95}
  ],warnings:[]
});
const relevanceSafetyPartition=core.partitionReviewRows(relevanceSafetyAnalysis,data);
assert.deepEqual(clone(relevanceSafetyPartition.rows.map(row=>row.slotId)),["positive-negative-near-tie","mixed-artwork","recoverable-real-low-score"],"Near-tie, mixed-artwork, and weak matches must remain visible for correction");
assert.deepEqual(clone(relevanceSafetyPartition.ignoredRows),[],"Uncertain matches must not be silently relegated to the hidden queue");
assert.ok(relevanceSafetyPartition.rows.every(row=>row.selectedKey===row.options[0]?.key),"Visible uncertainty should preselect the highest-ranked usable option for review");
assert.match(relevanceSafetyPartition.rows.find(row=>row.slotId==="mixed-artwork").reasons[0],/shared by usable and finished/i,"Exact artwork reused by a finished product must be explained as visually ambiguous");
assert.equal(relevanceSafetyPartition.rows.find(row=>row.slotId==="mixed-artwork").reviewRequired,true,"Mixed artwork must never become exact solely from a high icon score");

const suppliedStorageRegression=core.sanitizeResult({
  imageFingerprint:"4".repeat(64),width:508,height:596,grid:{columns:4,rows:1,confidence:1},
  slots:[
    {id:"cotton-130",row:0,column:0,box:{x:92,y:525,width:45,height:45},iconCandidates:[{icon:icon("8"),score:.9775,materialEligible:true},{icon:icon("1"),score:.5228,materialEligible:false}],iconMaterialEligible:true,iconMaterialConfidence:.97,iconMaterialMargin:.09,quantityText:"130",quantityValue:130,quantityConfidence:.951},
    {id:"dried-fish-3138",row:0,column:1,box:{x:143,y:117,width:45,height:45},iconCandidates:[{icon:icon("9"),score:.89,materialEligible:true}],iconMaterialEligible:null,iconMaterialConfidence:.95,iconMaterialMargin:.004,quantityText:"3138",quantityValue:3138,quantityConfidence:.99},
    {id:"clear-reagent-544",row:0,column:2,box:{x:296,y:219,width:45,height:45},iconCandidates:[{icon:icon("6"),score:.96,materialEligible:true}],iconMaterialEligible:true,iconMaterialConfidence:.96,iconMaterialMargin:.14,quantityText:"544",quantityValue:544,quantityConfidence:.99},
    {id:"strong-output-junk",row:0,column:3,box:{x:347,y:219,width:45,height:45},iconCandidates:[{icon:icon("e"),score:.99,materialEligible:false},{icon:icon("8"),score:.88,materialEligible:true}],iconMaterialEligible:false,iconMaterialConfidence:.99,iconMaterialMargin:.11,quantityText:"1",quantityValue:1,quantityConfidence:.99}
  ],warnings:[]
});
const suppliedStoragePartition=core.partitionReviewRows(suppliedStorageRegression,data);
assert.deepEqual(clone(suppliedStoragePartition.rows.map(row=>row.slotId)),["cotton-130","dried-fish-3138","clear-reagent-544"],"The supplied small storage materials must stay visible while a strong finished-product match is filtered");
assert.deepEqual(clone(suppliedStoragePartition.ignoredRows.map(row=>row.slotId)),["strong-output-junk"]);
const hiddenStorageJunk=suppliedStoragePartition.ignoredRows[0];
assert.equal(hiddenStorageJunk.selectedKey,"","A confirmed non-material must stay unselected while it remains hidden");
assert.ok(hiddenStorageJunk.options.some(option=>option.key==="68:0"),"Hidden rows must retain a likely usable alternative for explicit user recovery");
const cottonRow=suppliedStoragePartition.rows[0],fishRow=suppliedStoragePartition.rows[1],reagentRow=suppliedStoragePartition.rows[2];
assert.equal(cottonRow.quantity,130,"Cotton Fabric's confirmed 130 quantity must survive relevance review");
assert.equal(cottonRow.selectedKey,"68:0","A weak Cotton Fabric candidate should preselect the highest-ranked usable material");
assert.ok(cottonRow.options.some(option=>option.key==="68:0"),"Cotton Fabric must remain available among likely recipe-input choices");
assert.equal(fishRow.quantity,3138,"The supplied dried-fish quantity must survive shared-art review");
assert.equal(fishRow.selectedKey,"69:0","Shared dried-fish artwork should preselect the first likely usable item while remaining review-derived");
assert.ok(fishRow.options.some(option=>option.key==="69:0"),"A real dried-fish recipe input must remain selectable despite shared finished-product artwork");
assert.equal(reagentRow.selectedKey,"71:0","A strong unique recipe-input match should retain the prior automatic selection behavior");
const suppliedStoragePlan=core.buildImportPlan(suppliedStoragePartition.rows,data);
assert.equal(suppliedStoragePlan.valid,true,"The supplied preselected materials must be ready for the user's final Apply confirmation");
assert.deepEqual(clone(suppliedStoragePlan.entries),[{key:"68:0",quantity:130},{key:"69:0",quantity:3138},{key:"71:0",quantity:544}]);

const qualityAnalysis=core.sanitizeResult({
  imageFingerprint:"6".repeat(64),width:260,height:90,grid:{columns:3,rows:1,confidence:.97},
  slots:[0,1,2].map((borderGrade,column)=>({
    id:`onion-grade-${borderGrade}`,row:0,column,box:{x:10+column*80,y:10,width:60,height:60},
    iconCandidates:[{icon:icon("f"),score:.97},{icon:icon("c"),score:.70}],quantityText:"2000",quantityValue:2000,quantityConfidence:.95,borderGrade,borderGradeConfidence:.96
  })),warnings:[]
});
const qualityRows=core.buildReviewRows(qualityAnalysis,data);
for(const [grade,key,label] of [[0,"50:0","base"],[1,"51:0","high-quality"],[2,"52:0","special"]]){
  const slot=qualityAnalysis.slots[grade],row=qualityRows[grade];
  assert.equal(slot.borderGrade,grade,`The numeric ${label} border grade must cross the frontend trust boundary`);
  assert.equal(slot.borderGradeConfidence,.96);
  assert.deepEqual(clone(row.options.filter(option=>option.itemId>="50"&&option.itemId<="52").map(option=>option.key).sort()),["50:0","51:0","52:0"],"Border ranking must keep every Onion quality option available");
  assert.equal(row.selectedKey,key,`The ${label} border must select its unique same-family Onion identity`);
  assert.equal(row.options[0].key,key,`The selected ${label} Onion identity must be ranked first without removing correction options`);
  assert.equal(row.reviewRequired,false,`Strong icon, quantity, and ${label} border evidence must make the material exact`);
}
assert.equal(qualityRows[1].selectedKey,"51:0","A grade-1 material from the lower-ranked icon must never replace High-quality Onion from the top icon family");

const lowBorderAnalysis=core.sanitizeResult({...qualityAnalysis,imageFingerprint:"5".repeat(64),slots:[{...qualityAnalysis.slots[2],id:"low-border",column:0,borderGradeConfidence:.69}],grid:{columns:1,rows:1,confidence:.9}}),lowBorderRow=core.buildReviewRows(lowBorderAnalysis,data)[0];
assert.equal(lowBorderRow.selectedKey,"50:0","Low-confidence border evidence must not override the ordinary top-option default");
assert.equal(lowBorderRow.reviewRequired,true,"Low-confidence border evidence must not make a shared icon exact");
for(const [borderGrade,borderGradeConfidence,message] of [["2",.99,"string grade"],[1.5,.99,"fractional grade"],[3,.99,"out-of-range grade"],[2,".99","string confidence"],[2,1.1,"out-of-range confidence"]]){
  const invalid=core.sanitizeResult({...qualityAnalysis,imageFingerprint:crypto.createHash("sha256").update(message).digest("hex"),slots:[{...qualityAnalysis.slots[0],id:`invalid-${message}`,column:0,borderGrade,borderGradeConfidence}],grid:{columns:1,rows:1,confidence:.9}}).slots[0];
  if(typeof borderGrade!=="number"||!Number.isInteger(borderGrade)||borderGrade<0||borderGrade>2)assert.equal(invalid.borderGrade,null,`A ${message} must not cross as a trusted grade`);
  if(typeof borderGradeConfidence!=="number"||!Number.isFinite(borderGradeConfidence)||borderGradeConfidence<0||borderGradeConfidence>1)assert.equal(invalid.borderGradeConfidence,0,`A ${message} must not cross as trusted confidence`);
  assert.equal(core.buildReviewRows(core.sanitizeResult({...qualityAnalysis,imageFingerprint:crypto.createHash("sha256").update(`${message}-row`).digest("hex"),slots:[{...qualityAnalysis.slots[0],id:`invalid-row-${message}`,column:0,borderGrade,borderGradeConfidence}],grid:{columns:1,rows:1,confidence:.9}}),data)[0].reviewRequired,true,`A ${message} must not make a quality family exact`);
}

const magicBorderAnalysis=core.sanitizeResult({...qualityAnalysis,imageFingerprint:"3".repeat(64),slots:[{...analysisPayload.slots[2],id:"magic-grade-one",row:0,column:0,borderGrade:1,borderGradeConfidence:.99}],grid:{columns:1,rows:1,confidence:.9}}),magicBorderRow=core.buildReviewRows(magicBorderAnalysis,data)[0];
assert.deepEqual(clone(magicBorderRow.options.map(option=>option.key).sort()),["30:0","30:2"],"A non-family grade-1 item must preserve every enhancement identity");
assert.equal(magicBorderRow.selectedKey,magicBorderRow.options[0].key,"A grade-1 border must not masquerade as High-quality evidence without a verified name family");
assert.equal(magicBorderRow.reviewRequired,true,"Non-family border color must not resolve shared enhancement artwork");

const qualityConflictData=core.prepareData({...fixture,items:{...fixture.items,"53":{name:"Special Onion",grade:2,icon:icon("f")}},recipes:[...fixture.recipes,{id:"onion-special-conflict",outputId:"100",type:"COOK",inputs:[{itemId:"53",count:1}]}]}),qualityConflictAnalysis=core.sanitizeResult({...qualityAnalysis,imageFingerprint:"2".repeat(64),slots:[{...qualityAnalysis.slots[2],id:"quality-conflict",column:0}],grid:{columns:1,rows:1,confidence:.9}}),qualityConflictRow=core.buildReviewRows(qualityConflictAnalysis,qualityConflictData)[0];
assert.equal(qualityConflictRow.selectedKey,"","Two same-family Special identities must stay unresolved instead of defaulting or promoting another icon");
assert.equal(qualityConflictRow.reviewRequired,true);
assert.match(qualityConflictRow.reasons.join(" "),/detected special border.*multiple materials/i,"A quality-border conflict must explain why manual review is still required");

const rows = core.buildReviewRows(analysis, data);
const pine = rows.find(row => row.slotId === "pine");
const meat = rows.find(row => row.slotId === "meat");
const enhanced = rows.find(row => row.slotId === "enhanced");
const rounded = rows.find(row => row.slotId === "rounded");
const suggested = rows.find(row => row.slotId === "suggested");
const hidden = rows.find(row => row.slotId === "hidden");
const onion = rows.find(row => row.slotId === "onion");
assert.ok(rows.every(row=>!Object.hasOwn(row,"included")&&!Object.hasOwn(row,"reviewConfirmed")),"No OCR row may carry the removed checkmark state");
assert.equal(pine.selectedKey, "10:0");
assert.equal(pine.quantity, 500);
assert.equal(meat.reviewRequired, true, "A duplicate-image material remains visibly review-derived even when its top option is preselected");
assert.deepEqual(clone(meat.options.map(option => option.key).sort()), ["20:0", "21:0", "22:0", "23:0"], "Every material sharing the detected icon must appear in the review popup");
assert.equal(meat.selectedKey,meat.options[0].key,"A non-group duplicate image must preselect the same top candidate displayed by its dropdown");
assert.equal(enhanced.reviewRequired, true, "An icon shared by enhancement identities must remain visibly review-derived");
assert.deepEqual(clone(enhanced.options.map(option => option.key).sort()), ["30:0", "30:2"]);
assert.equal(enhanced.selectedKey,enhanced.options[0].key,"Non-group duplicate identities must follow the displayed top-option default consistently");
assert.deepEqual(clone(onion.options.map(option=>option.key)),["50:0","51:0","52:0"],"Onion and its quality grades must all remain available in the dropdown");
assert.equal(onion.selectedKey,onion.options[0].key,"An ordinary duplicate-image row must preselect its displayed top candidate");
assert.equal(onion.selectedKey,"50:0","The higher-use ordinary Onion candidate must be the initial dropdown value");
assert.equal(rounded.reviewRequired, true);
assert.equal(rounded.selectedKey, "10:0", "A strong unique icon remains selected while its rounded quantity is reviewed");
assert.equal(rounded.quantity, 139900, "A rounded 139.9K reading must be listed as 139900 instead of leaving the quantity field blank");
assert.equal(rounded.suggestedQuantity, 139900, "The rounded reading must remain visible while review is required");
assert.match(rounded.reasons.join(" "), /rounded.*(?:confirm|review)|(?:confirm|review).*rounded/i);
const roundedPlan = core.buildImportPlan([rounded], data);
assert.equal(roundedPlan.valid, true);
assert.deepEqual(clone(roundedPlan.entries), [{ key:"10:0", quantity:139900 }],"The readable value prefilled from 139.9K must import without a separate Include checkmark");
assert.equal(suggested.selectedKey, "40:0", "A moderate-confidence unique icon should reduce review work by preselecting its likely material");
assert.equal(suggested.reviewRequired, true);
assert.equal(core.buildImportPlan([suggested],data).valid,true,"A populated moderate-confidence row needs no redundant checkmark");
assert.equal(hidden.quantity, "", "A hidden quantity must remain blank instead of assuming a stack of one");
assert.equal(hidden.suggestedQuantity, null, "An assumed stack of one with no readable label must stay blank instead of presenting an invented suggestion");
assert.equal(core.buildImportPlan([hidden], data).valid, false, "A hidden quantity cannot be imported until the user enters an exact amount");
hidden.quantity=1;
assert.equal(core.buildImportPlan([hidden],data).valid,true,"Entering the missing quantity must complete the row without another control");

meat.selectedKey = "21:0";
meat.quantity = 120;
const plan = core.buildImportPlan([meat], data);
assert.equal(plan.valid, true);
assert.deepEqual(clone(plan.entries), [{ key:"21:0", quantity:120 }], "The exact item and enhancement identity must survive planning");

enhanced.selectedKey = "30:2";
enhanced.quantity = 7;
const enhancedPlan = core.buildImportPlan([enhanced], data);
assert.equal(enhancedPlan.valid, true);
assert.equal(enhancedPlan.entries[0].key, "30:2", "Enhanced materials must remain distinct from their base item");

const sharedGroupAnalysis=core.sanitizeResult({
  imageFingerprint:"b".repeat(64),width:180,height:80,grid:{columns:2,rows:1,confidence:.96},
  slots:[
    {id:"actual-meat-group",row:0,column:0,box:{x:10,y:10,width:60,height:60},iconCandidates:[{icon:data.items["7905"].icon,score:.97}],quantityText:"10000",quantityValue:10000,quantityConfidence:.95,borderGrade:0,borderGradeConfidence:.99},
    {id:"actual-blood-group",row:0,column:1,box:{x:90,y:10,width:60,height:60},iconCandidates:[{icon:data.items["6214"].icon,score:.97}],quantityText:"5000",quantityValue:5000,quantityConfidence:.95,borderGrade:0,borderGradeConfidence:.99}
  ],warnings:[]
});
const sharedGroupRows=core.buildReviewRows(sharedGroupAnalysis,data),actualMeat=sharedGroupRows.find(row=>row.slotId==="actual-meat-group"),actualBlood=sharedGroupRows.find(row=>row.slotId==="actual-blood-group");
assert.equal(data.substitutionGroupLookup["meat-1"].sharedIcon,true,"Prepared Meat Group metadata must retain its shared-icon safety flag");
assert.equal(data.substitutionGroupLookup["blood-1"].sharedIcon,true,"Prepared Blood Group metadata must retain its shared-icon safety flag");
assert.ok(actualMeat.options.length>1&&actualBlood.options.length>1,"Every exact shared-icon meat and blood candidate must remain selectable");
assert.equal(actualMeat.selectedKey,"","A real shared Meat Group icon must remain blank until the user chooses its exact meat");
assert.equal(actualBlood.selectedKey,"","A real shared Blood Group icon must remain blank until the user chooses its exact blood");
assert.equal(actualMeat.borderGrade,0,"A valid neutral border may cross review state without resolving same-grade Meat Group members");
assert.equal(actualBlood.borderGrade,0,"A valid neutral border may cross review state without resolving same-grade Blood Group members");
assert.equal(core.buildImportPlan(sharedGroupRows,data).valid,false,"Unresolved shared meat and blood dropdowns must block Apply");
actualMeat.selectedKey=actualMeat.options[0].key;actualBlood.selectedKey=actualBlood.options[0].key;
assert.equal(core.buildImportPlan(sharedGroupRows,data).valid,true,"Choosing each shared-group material must complete the rows without checkmarks");

const removableRows=[rounded,pine],removableSnapshot=clone(removableRows),afterIndexLikeRemoval=core.removeReviewRow(removableRows,"0");
assert.notEqual(afterIndexLikeRemoval,removableRows,"Row removal must return a new collection instead of mutating live review state in place");
assert.deepEqual(clone(afterIndexLikeRemoval),removableSnapshot,"An array index must not masquerade as a stable review-row identity");
const afterFirstRemoval=core.removeReviewRow(removableRows,pine.id);
assert.deepEqual(clone(afterFirstRemoval.map(row=>row.id)),[rounded.id],"The row × must remove exactly the matching stable row ID regardless of its array position");
assert.deepEqual(clone(removableRows),removableSnapshot,"Removing a review row must leave the caller's previous array untouched");
assert.equal(core.buildImportPlan(afterFirstRemoval,data).valid,true,"Removing one row must recompute readiness from the material rows that remain");
const afterFinalRemoval=core.removeReviewRow(afterFirstRemoval,rounded.id);
assert.deepEqual(clone(afterFinalRemoval),[],"Removing the final detected material must produce the normal zero-row state");
assert.equal(core.buildImportPlan(afterFinalRemoval,data).valid,false,"Removing the final row must disable Apply");
assert.equal(core.buildImportPlan(afterFinalRemoval,data).entries.length,0,"Removing the final row must never leave a stale import entry");

const current = { "10:0":5, "20:0":7, "40:0":99 };
const beforePlanning = JSON.stringify(current);
const updatePlan = core.buildImportPlan([{ selectedKey:"10:0", quantity:15, slotId:"pine" }], data);
assert.equal(JSON.stringify(current), beforePlanning, "Building a review/import plan must not mutate My Resources");
const updated = core.applyImportPlan(current, updatePlan, data, "update");
assert.equal(updated.ok, true);
assert.deepEqual(clone(updated.resources), { "10:0":15, "20:0":7, "40:0":99 }, "Default update must preserve every material absent from the screenshot");
assert.deepEqual(current, { "10:0":5, "20:0":7, "40:0":99 }, "My Resources may change only after the caller applies the returned result");
const added = core.applyImportPlan(current, updatePlan, data, "add");
assert.deepEqual(clone(added.resources), { "10:0":20, "20:0":7, "40:0":99 }, "Explicit add mode must add instead of replace");
const overflow = core.applyImportPlan({ "10:0":999999999999, "40:0":99 }, updatePlan, data, "add");
assert.equal(overflow.ok, false);
assert.deepEqual(clone(overflow.resources), { "10:0":999999999999, "40:0":99 }, "Overflow must reject the entire import atomically");

const duplicatePlan = core.buildImportPlan([
  { selectedKey:"10:0", quantity:1, slotId:"one" },
  { selectedKey:"10:0", quantity:2, slotId:"two" }
], data);
assert.equal(duplicatePlan.valid, true, "Multiple detected stacks of the same exact material must aggregate safely");
assert.deepEqual(clone(duplicatePlan.entries),[{key:"10:0",quantity:3}],"Duplicate exact keys must produce one summed import entry");
assert.equal(core.buildImportPlan([],data).valid,false,"A zero-row plan must never enable Apply");
const incompletePlan=core.buildImportPlan([{selectedKey:"10:0",quantity:1,slotId:"complete"},{selectedKey:"",quantity:2,slotId:"missing-material"}],data);
assert.equal(incompletePlan.valid,false,"Every detected row must have both a material and quantity");
assert.match(incompletePlan.errors.join(" "),/Choose a valid material/);
const duplicateOverflowPlan=core.buildImportPlan([{selectedKey:"10:0",quantity:600000000000,slotId:"large-one"},{selectedKey:"10:0",quantity:600000000000,slotId:"large-two"}],data);
assert.equal(duplicateOverflowPlan.valid,false,"Combined duplicate stacks must retain the maximum-quantity overflow guard");

const undo = core.createUndoSnapshot(current, updated.resources);
const restored = core.applyUndo(undo, updated.resources, data);
assert.equal(restored.ok, true);
assert.deepEqual(clone(restored.resources), current);
const externallyChanged = { ...clone(updated.resources), "40:0":100 };
const guarded = core.applyUndo(undo, externallyChanged, data);
assert.equal(guarded.ok, false, "Undo must not overwrite a resource list edited after the import");
assert.deepEqual(clone(guarded.resources), externallyChanged);

let fingerprints = core.registerFingerprint([], fingerprint);
assert.equal(fingerprints.duplicate, false);
fingerprints = core.registerFingerprint([...fingerprints.fingerprints], fingerprint);
assert.equal(fingerprints.duplicate, true);
assert.deepEqual(clone(fingerprints.fingerprints), [fingerprint], "The same screenshot must not be queued twice in one session");

// DOM, intake, and native trust-boundary assertions are intentionally source-level:
// their behavior is thin event wiring around the pure, executable core covered above.
for (const id of [
  "recipeBookScreenshotOpen", "recipeBookScreenshotUndo", "recipeBookScreenshotDialog", "recipeBookScreenshotClose",
  "recipeBookScreenshotDropZone", "recipeBookScreenshotFiles", "recipeBookScreenshotBrowse", "recipeBookScreenshotPaste",
  "recipeBookScreenshotStatus", "recipeBookScreenshotReviewIgnored", "recipeBookScreenshotReview", "recipeBookScreenshotRows", "recipeBookScreenshotApply",
  "recipeBookScreenshotCancel", "recipeBookScreenshotAddConfirm"
]) assert.match(html, new RegExp(`id="${id}"`), `Missing Screenshot Mats control #${id}`);
assert.match(html, /role="dialog"[^>]*aria-modal="true"[^>]*aria-labelledby="recipeBookScreenshotTitle"[^>]*aria-describedby="recipeBookScreenshotDescription"/);
assert.match(html, /id="recipeBookScreenshotFiles"[^>]*accept="image\/png,image\/jpeg,image\/bmp,[^"]+"[^>]*multiple/);
assert.match(html, /name="recipeBookScreenshotMerge" value="update" checked/, "Safe replacement mode must remain the default");
assert.match(html, /name="recipeBookScreenshotMerge" value="add"/, "Add mode must remain an explicit alternative");
assert.match(html, /id="recipeBookScreenshotAddConfirm" type="checkbox"/, "Add mode must require a separate double-count confirmation");
assert.match(html, /Apply becomes available when every detected row has a material and quantity\./, "The dialog description must explain the all-rows-required workflow");
assert.match(html, /Amber<\/b> rows contain readings worth checking before you apply them\./, "Review guidance must no longer imply a removed per-row confirmation control");
assert.doesNotMatch(source, /data-ocr-include|reviewConfirmed|row\.included/, "The removed per-row checkmark state must not remain in markup or event logic");
const reviewRowMarkupSource=sourceBetween(source,"function recipeBookOcrRowMarkup(row,index){","function recipeBookOcrRenderReview(){");
assert.match(reviewRowMarkupSource,/removeLabel=selectedName\|\|`row \$\{row\.row\+1\}, column \$\{row\.column\+1\}`/,"Each review-row × must identify the selected material or stable screenshot location");
assert.match(reviewRowMarkupSource,/class="recipeBookScreenshotRowRemove"[^>]*type="button"/,"The row removal control must use explicit button semantics");
assert.match(reviewRowMarkupSource,/data-ocr-row-remove="\$\{escapeHtml\(row\.id\)\}"/,"The row removal control must carry the stable review-row ID instead of a shifting array index");
assert.match(reviewRowMarkupSource,/aria-label="Remove \$\{escapeHtml\(removeLabel\)\} from this scan"/,"The visual × must expose its full removal action to assistive technology");
const reviewRowClickSource=sourceBetween(source,'recipeBookEl.screenshotRows?.addEventListener("click",event=>{','recipeBookEl.screenshotRows?.addEventListener("input"');
assert.match(reviewRowClickSource,/closest\("\[data-ocr-row-remove\]"\)/,"Review-row removal must use the existing delegated rows click listener");
assert.match(reviewRowClickSource,/\.rows=recipeBookOcrRemoveReviewRow\([^,]+\.rows,remove\.dataset\.ocrRowRemove\)/,"Delegated removal must resolve the stable ID through the non-mutating OCR-core helper");
assert.match(reviewRowClickSource,/recipeBookOcrRenderReview\(\)/,"Removing a row must rerender and recompute the summary and Apply readiness immediately");
assert.match(reviewRowClickSource,/querySelectorAll\("\[data-ocr-row-remove\]"\)[\s\S]*?\.focus\(\)/,"Keyboard removal must move focus to another stable control after the focused × disappears");
const selectMaterialSource=sourceBetween(source,'function recipeBookOcrSelectMaterial(article,row,key,source="candidate"){','function recipeBookOcrClearMaterialSelection(article,row){');
assert.match(selectMaterialSource,/remove\.setAttribute\("aria-label",`Remove \$\{displayName/,"Changing a material must keep the row × accessible name synchronized");
const screenshotQueueSource=sourceBetween(source,'async function recipeBookOcrQueueFiles(inputFiles,source="browse"){','async function recipeBookOcrPasteFromClipboard(){');
assert.match(screenshotQueueSource,/const partition=recipeBookOcrPartitionReviewRows\(analysis,recipeBookState\.data\),reviewRows=partition\.rows,ignoredRows=partition\.ignoredRows/,"The scan queue must partition reviewable rows from strong confirmed non-material matches");
assert.match(screenshotQueueSource,/state\.rows\.push\(\.\.\.reviewRows\);state\.ignoredRows\.push\(\.\.\.ignoredRows\)/,"Reviewable uncertainty must enter the editable list while strong non-material matches remain recoverable");
assert.match(screenshotQueueSource,/if\(!reviewRows\.length\)[^;]*every detected slot strongly matched a known non-material item/i,"An all-non-material screenshot must explain why its slots were hidden");
assert.match(screenshotQueueSource,/state\.rows\.length\} material slot[\s\S]*?to review/,"The scan summary must count every visible material-review row without calling uncertain matches confirmed inputs");
const hiddenReviewSource=sourceBetween(source,"function recipeBookOcrReviewIgnoredRows(){","function recipeBookOcrClearMaterialSelection(article,row){");
assert.match(hiddenReviewSource,/selectedKey:row\.options\[0\]\?\.key\|\|""[\s\S]*?reviewRequired:true/,"Explicitly reviewing a hidden slot must preselect its most likely usable material while keeping the row visibly review-required");
assert.match(hiddenReviewSource,/state\.rows\.push\(\.\.\.restored\);state\.ignoredRows=\[\]/,"Reviewing hidden slots must atomically move them into the editable list");
assert.match(source,/screenshotReviewIgnored\?\.addEventListener\("click",recipeBookOcrReviewIgnoredRows\)/,"The recovery control must expose conservative OCR abstentions without auto-importing them");
assert.match(css, /\.recipeBookScreenshotDialog\[hidden\]\{display:none!important\}/);
assert.match(css,/\.recipeBookScreenshotRow\{(?=[^}]*position:relative)[^}]*\}/,"Review rows must establish the positioning context for their top-right ×");
assert.match(css,/\.recipeBookScreenshotRowRemove\{(?=[^}]*position:absolute)(?=[^}]*top:)(?=[^}]*right:)(?=[^}]*width:)(?=[^}]*height:)[^}]*\}/,"The row × must remain a small top-right control instead of consuming a grid column");
assert.match(css,/\.recipeBookScreenshotRowRemove:focus-visible\{[^}]*outline:/,"The row × must have a visible keyboard focus treatment");
assert.match(css,/\.recipeBookScreenshotSessionActions\{[^}]*display:flex/,"Hidden-slot review and session clearing must remain grouped without displacing scanner status");
assert.match(css, /\.recipeBookScreenshotSurface\{[^}]*overflow:hidden/, "The modal must contain its scrolling content");
assert.match(css, /\.recipeBookScreenshotMergeMode\[hidden\],\.recipeBookScreenshotMergeMode>\.recipeBookScreenshotAddConfirm\[hidden\]\{display:none!important\}/, "No-row and non-add review controls must stay hidden despite their component display rules");
assert.match(css, /\.recipeBookScreenshotRow\{[^}]*grid-template-columns:84px minmax\(145px,\.8fr\) minmax\(230px,1\.5fr\) 150px/, "Desktop review rows must start with the preview now that the checkbox column is gone");
assert.match(css, /@media\(max-width:900px\)\{\.recipeBookScreenshotRow\{grid-template-columns:84px minmax\(0,1fr\) 130px\}/, "Tablet review rows must not reserve a removed checkbox column");
assert.match(css, /@media\(max-width:640px\)[\s\S]*?\.recipeBookScreenshotRow\{grid-template-columns:72px minmax\(0,1fr\)\}/, "Mobile review rows must devote their two columns to the preview and content");
assert.match(css, /\.recipeBookScreenshotCrop\{width:84px;height:72px/, "The preview canvas must remain wide enough to show the material and its quantity label without distortion");
assert.match(css, /body\[data-mode="light"\] \.recipeBookScreenshotDialog,[^\{]+\{--rb-review-warning:#92400e\}/, "Light themes must use a dark, readable screenshot-review warning color");
assert.match(css, /Unified complete form controls:[\s\S]*?body\[data-style\] :is\(\.appView,\.recipeBookScreenshotDialog\) :is\(/, "Screenshot Mats lives outside .appView and must still inherit the global rounded control contract");
assert.match(css, /\.recipeBookScreenshotFallback\{[^}]*width:min\(100%,420px\)[^}]*margin:0 auto!important/, "The Not listed fallback must remain centered at a bounded width");
assert.match(css, /\.recipeBookScreenshotMaterialField>small\{[^}]*color:color-mix\(in srgb,var\(--muted\) 70%,var\(--text\)\)[^}]*font-size:8\.5px[^}]*font-weight:750[^}]*text-align:center/, "The material-search helper must be larger, theme-adaptive, heavier, and centered");
assert.match(source, /hasSuggestion=Number\.isSafeInteger\(row\.suggestedQuantity\)[\s\S]*?hasSuggestion\?`Read as/, "Rounded OCR copy must never format a missing suggestion as zero");
assert.match(source, /quantityNoteId=`recipeBookOcrQuantityNote-\$\{index\}`[\s\S]*?aria-describedby="\$\{quantityNoteId\}"[\s\S]*?id="\$\{quantityNoteId\}"/, "Every quantity input must expose its read/confirmation note to assistive technology");
assert.match(css, /\.recipeBookScreenshotFallback>input\{[^}]*text-align:center!important/, "Fallback material search text must remain visually centered");
const materialPopupStyle=css.match(/\.recipeBookScreenshotMaterialMenu,\.recipeBookScreenshotMaterialResults\{[^}]*\}/)?.[0]||"";
assert.ok(materialPopupStyle,"Custom material popup styling is missing");
assert.match(materialPopupStyle, /background:linear-gradient\([^;]*(?:#1b0a32|#0d0a22|#06202b)/, "Material popups must use a dark themed surface instead of a white system menu");
assert.doesNotMatch(materialPopupStyle, /background:\s*(?:white|#fff(?:fff)?)(?:[;\s]|$)/i, "Material popups must never regress to a flashbang-white surface");
assert.match(css, /\.recipeBookScreenshotMaterialOption:hover,\.recipeBookScreenshotMaterialOption:focus-visible\{[^}]*border-color:#22d3ee[^}]*background:linear-gradient/, "Hover and keyboard focus must have a vivid cyan/purple state");
assert.match(css, /\.recipeBookScreenshotMaterialOption\[aria-selected="true"\]\{[^}]*border-color:#f0abfc[^}]*background:linear-gradient/, "The selected material must have a vivid, readable custom state");
assert.match(source, /const RECIPE_BOOK_OCR_MIN_WIDTH=1,RECIPE_BOOK_OCR_MIN_HEIGHT=1,RECIPE_BOOK_OCR_MAX_WIDTH=7680,RECIPE_BOOK_OCR_MAX_HEIGHT=4320,RECIPE_BOOK_OCR_MAX_PIXELS=24000000;/, "Screenshot intake must accept tight crops while keeping explicit edge and pixel caps");
assert.match(source, /const RECIPE_BOOK_OCR_MAX_FILES=8,RECIPE_BOOK_OCR_MAX_FILE_BYTES=16\*1024\*1024,RECIPE_BOOK_OCR_MAX_ENCODED_CHARS=24\*1024\*1024,RECIPE_BOOK_OCR_MAX_SESSION_BYTES=48\*1024\*1024;/, "Frontend image and session byte caps must stay explicit");
assert.match(source, /recipeBookOcrDimensionsAreSafe\(width,height\).*?RECIPE_BOOK_OCR_MAX_PIXELS/s, "Browse, paste, and native-result dimensions must share one safety contract");
assert.match(source, /if\(!recipeBookOcrDimensionsAreSafe\(width,height\)\)throw new Error\(`\$\{displayName\}: this image exceeds the scanner's 7,680×4,320 and 24-megapixel safety limits\.`,?\);?/, "Only oversized decoded surfaces should fail the dimension contract");
assert.match(source, /if\(!sourceMime\)throw new Error\(`\$\{displayName\}: use a PNG, JPG, or BMP image\.`,?\);?/, "Unsupported image types must be rejected before native analysis");
assert.match(source, /if\(bytes<1\|\|bytes>RECIPE_BOOK_OCR_MAX_FILE_BYTES\)/, "Empty and oversized files must be rejected before native analysis");
assert.match(source, /if\(!dataBase64\|\|dataBase64\.length>RECIPE_BOOK_OCR_MAX_ENCODED_CHARS\)/, "Encoded payloads must be capped before they cross the bridge");
assert.match(source, /screenshotFiles\?\.addEventListener\("change",\(\)=>\{[^}]*recipeBookOcrQueueFiles\(files,"browse"\)/, "The file picker must use the common screenshot queue");
assert.match(source, /screenshotDropZone\?\.addEventListener\("drop",event=>\{[^}]*recipeBookOcrQueueFiles\(event\.dataTransfer\?\.files\|\|\[\],"drop"\)/, "Drag/drop must use the common screenshot queue");
assert.match(source, /document\.addEventListener\("paste",event=>\{[^}]*recipeBookOcrQueueFiles\(files,"paste"\)/, "Ctrl+V must use the common screenshot queue");
assert.match(source, /await recipeBookOcrQueueFiles\(files,"paste"\)/, "The Paste screenshot button must use the common screenshot queue");
assert.match(source, /function recipeBookOcrCanonicalMimeType\(value\)[\s\S]*?image\/png[\s\S]*?image\/jpeg[\s\S]*?image\/bmp[\s\S]*?return""/, "Clipboard intake must explicitly allow only the native PNG, JPEG, and BMP contract");
assert.match(source, /item\.types\.map\(type=>\(\{type,mimeType:recipeBookOcrCanonicalMimeType\(type\)\}\)\)\.find\(entry=>entry\.mimeType\)/, "The explicit Clipboard API must skip unsupported image formats and use a supported alternative when offered");
assert.match(source, /function recipeBookOcrFileName\(file,mimeType\)[\s\S]*?RECIPE_BOOK_OCR_MIME_EXTENSIONS\[mimeType\]/, "Nameless and mismatched-extension clipboard files must be normalized to the declared raster type");
assert.match(source, /hasRows=state\.rows\.length>0,hasIgnored=state\.ignoredRows\.length>0,hasWarnings=state\.warnings\.length>0,showWarnings=!hasRows&&\(hasWarnings\|\|state\.images\.length>0\)/, "The review alert must remain visible when filtering or row removal leaves an accepted screenshot with zero usable rows");
assert.match(source,/displayWarnings=hasWarnings\?state\.warnings:\[hasIgnored\?"Only strong non-material matches were hidden\.[^"]*":"No usable Recipe Book materials remain in this scan\.[^"]*"\]/,"Zero-row feedback must distinguish strong hidden non-materials from a truly empty import");
assert.match(source,/screenshotReviewIgnored\.hidden=!hasIgnored[\s\S]*?Review \$\{state\.ignoredRows\.length\} hidden slot/,"The recovery control must show the exact number of hidden slots");
assert.match(source, /screenshotReview\.hidden=!hasRows&&!showWarnings/, "A zero-row scanner alert must keep the review region visible");
assert.match(source, /screenshotWarnings\.hidden=!showWarnings[\s\S]*?setAttribute\("role","alert"\)/, "Accepted-row warning pills must stay hidden while a zero-row scanner message remains an alert");
assert.match(source, /no storage material slots were detected\. Include one or more complete item slots with their quantity labels, or crop tightly around a single item\./, "Zero-result feedback must explain both partial-grid and single-item recovery");
assert.match(source, /const crop=recipeBookOcrPreviewBox\(row\.box,image\.naturalWidth,image\.naturalHeight\)/, "Preview drawing must use the padded, image-clamped crop rather than the raw slot box");
assert.match(source, /scale=Math\.min\(canvas\.width\/crop\.width,canvas\.height\/crop\.height\)[\s\S]{0,500}?drawX=Math\.floor\(\(canvas\.width-drawWidth\)\/2\),drawY=Math\.floor\(\(canvas\.height-drawHeight\)\/2\)/, "Padded previews must be aspect-fitted and centered within the canvas");
assert.match(source, /context\.drawImage\(image,crop\.x,crop\.y,crop\.width,crop\.height,drawX,drawY,drawWidth,drawHeight\)/, "Canvas drawing must use both the padded source crop and the computed aspect-fit destination bounds");
assert.match(source, /Read as “\$\{row\.quantityText\}” → \$\{recipeBookFormatCount\(row\.suggestedQuantity\)\}; rounded, review before import/, "Rounded labels such as 143.0K must explain the listed numeric value and the required review");
assert.match(source, /<canvas class="recipeBookScreenshotCrop" width="84" height="72"[^>]*aria-label="Material and quantity preview/, "Every review row must expose the wider quantity-aware preview canvas accessibly");
assert.doesNotMatch(source, /<select\b(?=[^>]*\bdata-ocr-material(?:\s|=|>))[^>]*>/, "Screenshot Mats must not regress to a native select whose system popup ignores the app theme");
assert.doesNotMatch(html, /<datalist\b[^>]*\bid="recipeBookScreenshotMaterialCatalog"/i, "Screenshot Mats must not use an unthemeable native datalist popup");
assert.doesNotMatch(source, /recipeBookScreenshotMaterialCatalog/, "The removed native material datalist must not retain a dormant frontend reference");
const materialTriggerMarkup=source.match(/<button\b(?=[^>]*\bdata-ocr-material-trigger\b)[^>]*>/)?.[0]||"";
assert.ok(materialTriggerMarkup, "Each detected material row must render a custom picker trigger");
assert.match(materialTriggerMarkup, /\baria-haspopup="listbox"/, "The material picker trigger must identify its popup as a listbox");
assert.match(materialTriggerMarkup, /\baria-expanded=/, "The material picker trigger must expose its open state");
assert.match(source, /<(?=[^>]*\bdata-ocr-material-menu\b)(?=[^>]*\brole="listbox")[^>]+>/, "Likely duplicate-icon matches must render in a custom listbox");
assert.match(source, /<button\b(?=[^>]*\bdata-ocr-material-option=)(?=[^>]*\brole="option")(?=[^>]*\baria-selected=)[^>]*>/, "Every likely material must be an accessible custom option with selection state");
assert.match(source, /options=row\.options\.map\([\s\S]{0,1200}?data-ocr-material-option/, "The picker must render every duplicate-icon candidate, not only its highest-scoring match");
const materialSearchMarkup=source.match(/<input\b(?=[^>]*\bdata-ocr-material-search\b)[^>]*>/)?.[0]||"";
assert.ok(materialSearchMarkup, "Every uncertain row must offer full-catalog correction beyond its icon matches");
assert.match(materialSearchMarkup, /\brole="combobox"/, "Full-catalog material search must expose combobox semantics");
assert.match(materialSearchMarkup, /\baria-autocomplete="list"/, "Full-catalog material search must announce list autocomplete");
assert.match(materialSearchMarkup, /\baria-expanded=/, "Full-catalog material search must expose whether its custom results are open");
assert.match(materialSearchMarkup, /\bplaceholder="Search all materials"/, "The centered fallback search must retain a clear prompt");
assert.doesNotMatch(materialSearchMarkup, /\slist=/, "Full-catalog search must use the custom themed results instead of a native datalist");
assert.match(source, /<(?=[^>]*\bdata-ocr-material-results\b)(?=[^>]*\brole="listbox")[^>]+>/, "Full-catalog correction results must render in a custom listbox");
assert.match(source, /recipeBookResourceCandidates\(recipeBookState\.data,[^,]+,\s*\d+\)/, "Full-catalog correction must search Recipe Book resources rather than only the detected icon shortlist");
assert.match(source, /data-ocr-search-option="\$\{escapeHtml\(candidate\.key\)\}"/, "Every full-catalog result must carry its exact resource key, including enhancement identity");
assert.match(source, /function recipeBookOcrSelectMaterial\(article,row,key,[^)]*\)\{[\s\S]*?resourceLookup\?\.\[key\][\s\S]*?row\.selectedKey=key/, "Custom picker choices must validate and store the exact Recipe Book resource key");
assert.match(source, /recipeBookOcrSelectMaterial\(article,row,searchResult\.dataset\.ocrSearchOption,"search"\)/, "Clicking a full-catalog result must select that result's exact key");
assert.match(source, /selectedLabel=row\?\.searchSelected&&row\.selectedKey[\s\S]*?selectedLabel&&query\.toLocaleLowerCase\(\)===selectedLabel\.toLocaleLowerCase\(\)[\s\S]*?input\.setAttribute\("aria-expanded","false"\)/, "Focusing a selected full-catalog label must keep its results popup closed");
assert.doesNotMatch(source, /recipeBookOcrSelectMaterial\(article,row,searchResult\.dataset\.ocrSearchOption,"search"\);article\.querySelector/, "The click delegate must not refocus full-catalog search outside the selection state transition");
assert.match(source, /function recipeBookOcrSelectMaterial[\s\S]*?row\.reviewRequired=true;row\.state="review";article\.dataset\.state=row\.state/, "Changing a picker choice must persist its amber review state across rerenders");
assert.match(source, /function recipeBookOcrClearMaterialSelection[\s\S]*?row\.state=row\.options\.length\?"review":"unknown";article\.dataset\.state=row\.state/, "Clearing a picker choice must persist its unresolved row state across rerenders");
assert.match(source, /const focusTarget=source==="search"\?search:trigger;recipeBookOcrCloseMaterialPopups\(\);if\(focusTarget\?\.isConnected\)requestAnimationFrame\(\(\)=>focusTarget\.focus\(\)\)/, "Selecting a custom option must restore focus to its owning trigger or search field");
assert.match(source, /state\.returnFocus=document\.activeElement/);
assert.match(source, /requestAnimationFrame\(\(\)=>\{\(recipeBookEl\.screenshotClose\|\|recipeBookEl\.screenshotSurface\)\?\.focus\(\)\}\)/, "Opening the dialog must focus a real control, with the dialog surface only as a fallback");
assert.match(source, /if\(returnFocus\?\.isConnected\)requestAnimationFrame\(\(\)=>returnFocus\.focus\(\)\)/, "Closing the dialog must restore the invoking control's focus");
assert.match(source, /event\.key==="(?:ArrowDown|ArrowUp)"|\["ArrowDown","ArrowUp"\]/, "Custom material popups must support arrow-key navigation");
const modalKeyboardStart=source.indexOf('recipeBookEl.screenshotDialog?.addEventListener("keydown"');
const modalKeyboardEnd=source.indexOf("recipeBookEl.craftableSearch?",modalKeyboardStart);
assert.ok(modalKeyboardStart>=0&&modalKeyboardEnd>modalKeyboardStart,"Screenshot Mats modal keyboard handler is missing");
const modalKeyboardSource=source.slice(modalKeyboardStart,modalKeyboardEnd);
const popupEscapeIndex=modalKeyboardSource.indexOf("recipeBookOcrCloseMaterialPopups");
const dialogEscapeIndex=modalKeyboardSource.indexOf("recipeBookOcrCloseDialog");
assert.match(modalKeyboardSource, /event\.key==="Escape"/, "The modal must handle Escape");
assert.match(modalKeyboardSource, /if\(recipeBookOcrCloseMaterialPopups\([^)]*\)\)return/, "Escape must stop after dismissing an open material popup");
assert.ok(popupEscapeIndex>=0&&dialogEscapeIndex>popupEscapeIndex,"Escape must close the active material popup before it is allowed to close the modal");
assert.match(source, /active===recipeBookEl\.screenshotSurface\|\|!recipeBookEl\.screenshotSurface\.contains\(active\)\)\{event\.preventDefault\(\);\(event\.shiftKey\?last:first\)\.focus\(\)\}/, "Tabbing from the fallback surface must enter the modal in the requested direction");
assert.match(source, /event\.shiftKey&&active===first\)\{event\.preventDefault\(\);last\.focus\(\)\}else if\(!event\.shiftKey&&active===last\)\{event\.preventDefault\(\);first\.focus\(\)\}/, "Keyboard focus must wrap at both ends of the modal");
assert.match(source, /screenshotSurface\?\.setAttribute\("aria-busy",String\(Boolean\(busy\)\)\)/, "The modal must expose native analysis as an accessible busy state");
assert.match(source, /for\(const control of \[recipeBookEl\.screenshotBrowse,recipeBookEl\.screenshotPaste,recipeBookEl\.screenshotFiles,recipeBookEl\.screenshotReviewIgnored,recipeBookEl\.screenshotClear\]\)if\(control\)control\.disabled=Boolean\(busy\)/, "Image intake and hidden-slot recovery controls must be disabled during native analysis");
assert.match(source, /screenshotApply\.disabled=state\.busy\|\|!plan\.valid\|\|!addConfirmed/, "Apply must stay disabled while analysis is busy or review is incomplete");
assert.match(source, /rawBorderGrade=raw\.borderGrade,borderGrade=typeof rawBorderGrade==="number"&&Number\.isInteger\(rawBorderGrade\)&&rawBorderGrade>=0&&rawBorderGrade<=2\?rawBorderGrade:null/, "Only numeric integer BDO border grades 0 through 2 may cross the frontend trust boundary");
assert.match(source, /rawBorderGradeConfidence=raw\.borderGradeConfidence,borderGradeConfidence=typeof rawBorderGradeConfidence==="number"&&Number\.isFinite\(rawBorderGradeConfidence\)&&rawBorderGradeConfidence>=0&&rawBorderGradeConfidence<=1\?rawBorderGradeConfidence:0/, "Border-grade confidence must remain a finite numeric probability without coercion");
assert.match(source, /materialEligible=typeof rawCandidate\.materialEligible==="boolean"\?rawCandidate\.materialEligible:null/, "Candidate material classes must cross the frontend boundary only as native booleans");
assert.match(source, /iconMaterialEligible=typeof raw\.iconMaterialEligible==="boolean"\?raw\.iconMaterialEligible:null/, "The full-catalog slot decision must reject string and numeric coercion");
assert.match(source, /iconMaterialConfidence=Number\.isFinite\(rawIconMaterialConfidence\)&&rawIconMaterialConfidence>=0&&rawIconMaterialConfidence<=1\?rawIconMaterialConfidence:0/, "Full-catalog confidence must remain a bounded finite probability");
assert.match(source, /iconMaterialMargin=Number\.isFinite\(rawIconMaterialMargin\)&&rawIconMaterialMargin>=0&&rawIconMaterialMargin<=1\?rawIconMaterialMargin:0/, "Full-catalog class margin must remain bounded telemetry");
assert.match(source, /function recipeBookOcrQualityFamilyResources[\s\S]*?item\?\.grade!==0[\s\S]*?`High-quality \$\{baseName\}`[\s\S]*?grade===1[\s\S]*?`Special \$\{baseName\}`[\s\S]*?grade===2/, "Border evidence may resolve only verified base, High-quality, and Special name families from the top icon");
assert.match(source, /RECIPE_BOOK_OCR_BORDER_GRADE_CONFIDENCE=\.70/, "Frontend quality resolution must share the native fixture gate's calibrated confidence floor");
assert.match(source, /qualityFamily=recipeBookOcrQualityFamilyResources\(topResources,data\)[\s\S]*?slot\.borderGradeConfidence>=RECIPE_BOOK_OCR_BORDER_GRADE_CONFIDENCE[\s\S]*?borderGradeMatches\.length===1/, "Only high-confidence evidence with one same-family grade match may resolve a quality identity");
assert.match(source, /for\(const iconMatch of slot\.iconCandidates\)[\s\S]*?optionMap\.set\(resource\.key[\s\S]*?Number\(right\.key===resolvedKey\)-Number\(left\.key===resolvedKey\)/, "Quality resolution must rank its exact identity while preserving all icon correction options");
assert.match(source, /defaultOption=relevance==="negative"\|\|borderGradeConflict\|\|unresolvedSharedMeatOrBloodIcon\?null:borderGradeResolved\?optionMap\.get\(resolvedKey\)/, "Reviewable uncertainty should preselect its top usable option while strong negatives, conflicts, and shared meat or blood remain blank");
assert.match(source, /nativeNegative=slot\.iconMaterialEligible===false[\s\S]*?relevance=nativeNegative\?"negative"/, "Only the native full-client catalog verifier may hide a slot as non-material");
assert.doesNotMatch(source, /confirmedNegative=Boolean\(bestNegative/, "A nearest Recipe Book output must not replace full-client non-material verification");
assert.match(source, /\(relevance==="negative"\?ignoredRows:rows\)\.push\(row\)/, "Every weak, near-tie, or mixed-art slot must remain in the visible review list");
assert.match(source, /iconExact=Boolean\(relevance==="eligible"&&matchedIcon&&matchedIcon\.score>=RECIPE_BOOK_OCR_EXACT_ICON_MIN_SCORE&&gap>=RECIPE_BOOK_OCR_EXACT_ICON_MARGIN&&materialExactResources\.length===1/, "A unique border-resolved identity may become exact only after relevance, strong score, and separation all agree");

assert.ok(fs.existsSync(servicePath), "The native Screenshot Mats service is missing");
assert.ok(fs.existsSync(recognizerPath), "The local PP-OCRv5 quantity recognizer is missing");
const calculator = fs.readFileSync(calculatorPath, "utf8");
const service = fs.readFileSync(servicePath, "utf8");
const recognizer = fs.readFileSync(recognizerPath, "utf8");
const project = fs.readFileSync(projectPath, "utf8");
assert.match(source, /bridgeCall\("analyzeRecipeBookScreenshot",\{fileName:normalized\.fileName,mimeType:normalized\.mimeType,dataBase64:normalized\.dataBase64\},\{signal:controller\.signal\}\)/, "Every screenshot intake path must send the same strict, cancellable bridge payload");
assert.match(source, /state\.controller\?\.abort\(\);state\.controller=null;state\.generation\+\+/, "Clear and close must cancel in-flight native analysis before discarding the session");
assert.match(calculator, /case\s+"analyzeRecipeBookScreenshot"\s*:/, "The OCR bridge caller must have a native handler");
assert.match(service, /internal const int MaxEncodedCharacters = 24 \* 1024 \* 1024;/);
assert.match(service, /internal const int MaxDecodedBytes = 16 \* 1024 \* 1024;/);
assert.match(service, /internal const int MinWidth = 1;/);
assert.match(service, /internal const int MinHeight = 1;/);
assert.match(service, /internal const int MaxWidth = 7680;/);
assert.match(service, /internal const int MaxHeight = 4320;/);
assert.match(service, /internal const long MaxPixels = 24_000_000;/);
assert.match(service, /internal const int ExpectedColumns = 9;/);
assert.match(service, /private const int MaximumReturnedCandidates = 12;/, "The native icon shortlist must preserve enough candidates for small, dim storage icons");
assert.match(service, /FullCatalogClassificationMinimumScore = 0\.82;/, "The full-client verifier must retain its independently benchmarked class-score floor");
assert.match(service, /FullCatalogClassificationMinimumMargin = 0\.05;/, "The full-client verifier must require a separated material/non-material winner");
assert.match(service, /FullCatalogExactNegativeMinimumScore = 0\.965;/, "Near-tie negative matches must clear the Mineral Water collision before a usable material can be hidden");
assert.match(service, /LoadIconAtlas\("client-catalog-index\.json", "client-catalog-atlas\.png", 25000\)/, "The material verifier must load the bounded full-client catalog locally");
assert.match(service, /primary\.MaterialEligible[\s\S]*?primary\.Score >= 0\.82[\s\S]*?primary\.Score - primaryOpposition >= 0\.08/, "Only a strong positive Recipe Book match may bypass full-catalog classification");
assert.match(service, /BestMaterialClassScores\(\s*feature,\s*recipeAtlas,\s*photometricCandidates\)[\s\S]*?BestMaterialClassScores\(\s*feature,\s*clientCatalogAtlas\.Value,\s*photometricCandidates\)[\s\S]*?DecideFullCatalogMaterial\(eligibleScore, negativeScore\)/, "Uncertain and negative primary matches must be decided by the same-domain full-client material catalog");
assert.match(service, /eligibleScore = Math\.Max\(eligibleScore, clientScores\.Eligible\);[\s\S]*?negativeScore = Math\.Max\(negativeScore, clientScores\.Negative\);/, "The full-client verifier must merge both current material and non-material evidence before deciding");
assert.match(service, /BestPhotometricClassScores\(\s*feature,\s*photometricCandidates\)[\s\S]*?DecideFullCatalogPhotometricNegative\(photometricEligible, photometricNegative\)/, "Structurally unresolved slots must use the independently calibrated photometric negative tie-breaker");
assert.match(service, /image\/png|"image\/png"/i);
assert.match(service, /image\/jpeg|"image\/jpeg"/i);
assert.match(source, /if\(sourceMime==="image\/bmp"\)[\s\S]*?canvas\.toDataURL\("image\/png"\)[\s\S]*?mimeType="image\/png"/, "BMP intake must be converted locally to the native service's strict PNG contract");
assert.match(service, /property\.Name is not \("fileName" or "mimeType" or "dataBase64"\)/, "The native request must reject every field outside the strict three-field contract");
assert.match(service, /if \(names\.Count != 3\)/, "The native request must require every strict payload field exactly once");
assert.match(service, /ValidateBase64Shape\(dataBase64\)/);
assert.match(service, /ReadRasterHeader\(bytes\)/);
assert.match(service, /bytes do not match the declared image type/i);
assert.match(project, /<PackageReference Include="Microsoft\.ML\.OnnxRuntime" Version="1\.29\.0" \/>/, "The local ONNX Runtime dependency must be pinned");
assert.doesNotMatch(project, /Tesseract|KeepTesseractManagedAssemblyExternal/i, "The retired Tesseract dependency must not remain in the project");
assert.match(service, /Lazy<PpOcrv5QuantityRecognizer>[\s\S]*?new PpOcrv5QuantityRecognizer\(resolvedApplicationDirectory\)/, "The screenshot service must lazily initialize the offline PP-OCRv5 recognizer");
assert.match(service, /quantityRecognizer\.Value\.Recognize\(/, "Visible quantity slots must be recognized through the PP-OCRv5 batch path");
assert.match(recognizer, /new InferenceSession\(modelPath, options\)/, "Quantity recognition must execute the bundled ONNX model");
assert.match(recognizer, /OrtEnv\.Instance\(\)\.DisableTelemetryEvents\(\)/, "The local ONNX Runtime session must disable telemetry");
assert.match(recognizer, /MainConsensusConfidenceFloor = 0\.50/, "Importable reads must keep the calibrated confidence floor");
assert.match(recognizer, /ModelSha256 = "C3461ADD59BB4323ECBA96A492AB75E06DDA42467C9E3D0C18DB5D1D21924BE8"/, "The recognizer must pin the reviewed PP-OCRv5 model");
assert.match(service, /new DetectedGrid\(columns,[\s\S]*?rowTops, confidence, false\)/, "The native result must retain the visible one-to-nine-column crop geometry");
assert.match(service, /DetectTightSingleSlot/, "Tight single-item crops must have a bounded fallback when their outer border is clipped");
assert.match(service, /GridUpscaleFactors[\s\S]*?GridDownscaleFactors[\s\S]*?MapDetectedGridToOriginal/, "Tiny and oversized screenshots must receive bounded scale-normalized detection passes mapped back to their original pixels");
assert.match(recognizer, /StrictQuantityPattern[\s\S]*?\[0-9\]\{1,5\}[\s\S]*?\[0-9\]\{1,3\}\\\.\[0-9\]\[KM\]/, "The recognizer must accept only complete bounded BDO quantity labels");
assert.match(recognizer, /SelectStrictConsensus[\s\S]*?PpOcrv5QuantityCandidate\[\] main[\s\S]*?string\? token = main\[0\]\.NormalizedToken;[\s\S]*?main\.All\(candidate => string\.Equals/, "The three unpadded reads must agree before a quantity becomes importable");
assert.match(recognizer, /SingleGlyphConsensusConfidenceFloor = 0\.90[\s\S]*?if \(!anyValid\)[\s\S]*?rightToken is \{ Length: 1 \}[\s\S]*?rightToken\[0\] is >= '0' and <= '9'[\s\S]*?rightConsensus[\s\S]*?rightMinimum >= SingleGlyphConsensusConfidenceFloor[\s\S]*?"right-3of3"/, "Single-digit rescue must require exactly one ASCII digit from three unanimous right-side views after every normal view rejects");
assert.doesNotMatch(service, /Where\(character => char\.IsDigit\(character\)/, "Native OCR must not collapse malformed text such as 174 5K into 1745K");
assert.doesNotMatch(service + recognizer, /using Tesseract|TesseractEngine|TesseractEnviornment|tessdataPath/i, "The retired Tesseract engine must not remain in production OCR code");
assert.doesNotMatch(service, /visible quantity label\(s\).*could not be read confidently.*not guessed/i, "Accepted scans must not surface the removed unreadable-quantity warning pill copy");
const programSource = fs.readFileSync(programPath, "utf8");
assert.match(programSource, /unsafeTruncatedRescueCandidates[\s\S]*?"665"[\s\S]*?Status == PpOcrv5QuantityReadStatus\.Confirmed/, "Offline smoke must reject a truncated multi-digit right-side rescue such as 5665 becoming 665");
assert.ok(fs.existsSync(fixtureRunnerPath), "The executable real-image OCR fixture runner is missing");
assert.ok(fs.existsSync(fixtureManifestPath), "The real-image OCR fixture manifest is missing");
const fixtureRunner = fs.readFileSync(fixtureRunnerPath, "utf8");
const verifySource = fs.readFileSync(verifyPath, "utf8");
assert.match(programSource, /args\[0\][\s\S]*?--recipe-book-ocr-fixture-test[\s\S]*?RecipeBookOcrFixtureRunner\.Run\(AppContext\.BaseDirectory, args\[1\]\)/, "The app must expose a bounded repository-only OCR fixture-test route");
assert.match(fixtureRunner, /service\.AnalyzeAsync\(request, cancellationToken\)/, "Real-image fixtures must execute the normal native screenshot analyzer");
assert.match(fixtureRunner, /slot\.QuantityValue is long quantityValue[\s\S]*?quantityValue != expected\.Value[\s\S]*?unsafe importable/, "Every importable native quantity must exactly match ground truth");
assert.match(fixtureRunner, /else[\s\S]*?string\.IsNullOrWhiteSpace\(slot\.QuantityText\)[\s\S]*?abstained without[\s\S]*?abstainedLabels\+\+/, "Safe abstentions must preserve raw OCR text for manual review");
assert.match(fixtureRunner, /if \(slot\.QuantityAssumedOne\)[\s\S]*?visible label[\s\S]*?must never be treated as an assumed quantity of one/, "A visible quantity label must never silently become an assumed-one import");
assert.match(fixtureRunner, /requiredResolved\.Contains\(\(row, column\)\)[\s\S]*?must resolve the pinned/, "Known recoverable OCR regressions must remain pinned to importable values");
assert.match(fixtureRunner, /resolvedLabels < fixtureCase\.MinimumResolved/, "Each fixture must enforce its independently calibrated minimum safe resolution count");
assert.match(fixtureRunner, /slot\.QuantityAssumedOne[\s\S]*?slot\.QuantityValue != 1[\s\S]*?string\.IsNullOrWhiteSpace\(slot\.QuantityText\)/, "The two visibly unlabeled stacks must remain explicit assumed-one results");
assert.match(fixtureRunner, /private const int SupportedSchemaVersion = 4;/, "The native fixture runner must consume the material-class and grade-aware schema");
assert.match(fixtureRunner, /expectation\.MaterialClass is not \("material" or "nonMaterial" or "uncertain"\)[\s\S]*?!requiredMaterialClasses\.Add\(\(expectation\.Row, expectation\.Column\)\)/, "Fixture material classes must use strict unique in-grid material, non-material, or uncertain expectations");
assert.match(fixtureRunner, /expectation\.MaterialClass switch[\s\S]*?"material" => true[\s\S]*?"nonMaterial" => false[\s\S]*?"uncertain" => null[\s\S]*?slot\.IconMaterialEligible != expectedMaterialEligible/, "Real-image fixtures must assert the native three-state material decision exactly");
assert.match(fixtureRunner, /MinimumRequiredBorderGradeConfidence = 0\.70/, "Pinned border-grade fixtures must use the same high-confidence floor as frontend quality resolution");
assert.match(fixtureRunner, /foreach \(FixtureBorderGradeExpectation expectation in fixtureCase\.RequiredBorderGrades!\)[\s\S]*?slot\.BorderGrade != expectation\.Grade[\s\S]*?slot\.BorderGradeConfidence < MinimumRequiredBorderGradeConfidence[\s\S]*?slot\.BorderGradeConfidence > 1/, "Real-image fixtures must verify both the exact border grade and a bounded high confidence");
assert.match(fixtureRunner, /expectation\.Grade is < 0 or > 2[\s\S]*?!requiredBorderGrades\.Add\(\(expectation\.Row, expectation\.Column\)\)/, "Fixture border grades must be limited to unique base, high-quality, or special coordinates");
assert.match(verifySource, /\$dotnet \$appDll --recipe-book-ocr-fixture-test \$recipeBookOcrFixtureManifestPath/, "Verification must execute the real-image OCR suite against the built app");
const fixtureManifest = JSON.parse(fs.readFileSync(fixtureManifestPath, "utf8"));
assert.equal(fixtureManifest.schemaVersion, 4);
assert.deepEqual(fixtureManifest.cases.map(testCase => testCase.id), ["full-45", "full-58", "full-68", "partial-58-4x3", "tight-58-2x1"]);
const storageTruth = fixtureManifest.truthSets["storage-88"];
assert.equal(storageTruth.rows.length, 10);
assert.ok(storageTruth.rows.every(row => row.length === 9), "The storage fixture truth must remain a complete 9x10 grid");
const truthCells = storageTruth.rows.flat();
assert.equal(truthCells.filter(cell => cell.display).length, 88);
assert.equal(truthCells.filter(cell => cell.assumedOne).length, 2);
assert.equal(storageTruth.visibleLabelCount, 88);
assert.equal(storageTruth.rows[4][1].value, 12103, "The reported 12103/12703 regression must stay locked into real-image truth");
assert.equal(storageTruth.rows[4][3].value, 5665, "The reported 5665/665 regression must stay locked into real-image truth");
assert.equal(storageTruth.rows[4][5].value, 455100, "The reported 455.1K/45516 regression must stay locked into real-image truth");
assert.equal(storageTruth.rows[5][0].value, 645000, "The reported 645.0K/643.0K regression must stay locked into real-image truth");
assert.equal(storageTruth.rows[5][2].value, 290000, "The reported blank or malformed 290.0K regression must stay locked into real-image truth");
const expectedPinnedRegressions = [
  { row:5, column:2 },
  { row:5, column:4 },
  { row:5, column:6 },
  { row:6, column:1 },
  { row:6, column:3 }
];
assert.deepEqual(fixtureManifest.cases[0].requiredResolved, expectedPinnedRegressions, "All five recoverable labels must resolve at the 45px source scale");
assert.deepEqual(fixtureManifest.cases[1].requiredResolved, expectedPinnedRegressions.slice(0, 4), "The contaminated 290.0K read must be allowed to abstain at the 58px source scale");
assert.deepEqual(fixtureManifest.cases[2].requiredResolved, expectedPinnedRegressions, "All five recoverable labels must resolve at the 68px source scale");
const expectedFullBorderGrades = [
  { row:1, column:1, grade:2 },
  { row:1, column:2, grade:2 },
  { row:1, column:3, grade:2 },
  { row:1, column:4, grade:2 },
  { row:1, column:5, grade:2 },
  { row:1, column:6, grade:2 },
  { row:1, column:8, grade:0 },
  { row:1, column:9, grade:0 },
  { row:2, column:9, grade:0 },
  { row:3, column:2, grade:0 },
  { row:4, column:5, grade:1 }
];
assert.deepEqual(fixtureManifest.cases[0].requiredMaterialClasses,[
  {row:1,column:1,materialClass:"material"},
  {row:2,column:1,materialClass:"material"},
  {row:3,column:6,materialClass:"nonMaterial"},
  {row:3,column:7,materialClass:"nonMaterial"},
  {row:3,column:8,materialClass:"nonMaterial"}
],"The 45px fixture must pin known materials and finished products");
assert.deepEqual(fixtureManifest.cases[1].requiredMaterialClasses,[
  {row:1,column:1,materialClass:"material"},
  {row:2,column:1,materialClass:"material"}
],"The 58px fixture must pin stable material controls without forcing conservative near-ties");
assert.deepEqual(fixtureManifest.cases[2].requiredMaterialClasses,[
  {row:1,column:1,materialClass:"material"},
  {row:1,column:7,materialClass:"uncertain"},
  {row:2,column:1,materialClass:"material"},
  {row:3,column:6,materialClass:"nonMaterial"},
  {row:3,column:7,materialClass:"nonMaterial"}
],"The 68px fixture must keep Mineral Water visible as uncertain while hiding verified finished products");
for (const testCase of fixtureManifest.cases.slice(0, 3)) {
  assert.deepEqual(testCase.requiredBorderGrades, expectedFullBorderGrades, `Fixture ${testCase.id} must pin identical base, high-quality, and special borders across source scales`);
}
assert.deepEqual(fixtureManifest.cases[3].requiredBorderGrades, [
  { row:1, column:1, grade:2 },
  { row:1, column:2, grade:2 },
  { row:1, column:3, grade:2 },
  { row:1, column:4, grade:2 },
  { row:3, column:2, grade:0 }
], "The partial crop must retain pinned special and base border evidence");
assert.deepEqual(fixtureManifest.cases[4].requiredBorderGrades, [
  { row:1, column:1, grade:0 },
  { row:1, column:2, grade:0 }
], "The tight crop must retain base-border evidence even when outer geometry is clipped");
for (const testCase of fixtureManifest.cases) {
  assert.ok(Number.isInteger(testCase.minimumResolved) && testCase.minimumResolved >= testCase.requiredResolved.length, `Fixture ${testCase.id} must declare a valid minimumResolved safety floor`);
  assert.ok(Array.isArray(testCase.requiredMaterialClasses), `Fixture ${testCase.id} must declare its material-class assertion list`);
  const materialCoordinates = new Set();
  for (const expectation of testCase.requiredMaterialClasses) {
    assert.ok(Number.isInteger(expectation.row) && expectation.row >= 1 && expectation.row <= testCase.grid.rows, `Fixture ${testCase.id} material-class row must stay inside the detected grid`);
    assert.ok(Number.isInteger(expectation.column) && expectation.column >= 1 && expectation.column <= testCase.grid.columns, `Fixture ${testCase.id} material-class column must stay inside the detected grid`);
    assert.ok(["material","nonMaterial","uncertain"].includes(expectation.materialClass), `Fixture ${testCase.id} material class must be strict`);
    assert.ok(!materialCoordinates.has(`${expectation.row}:${expectation.column}`), `Fixture ${testCase.id} material-class coordinates must be unique`);
    materialCoordinates.add(`${expectation.row}:${expectation.column}`);
  }
  assert.ok(Array.isArray(testCase.requiredBorderGrades) && testCase.requiredBorderGrades.length > 0, `Fixture ${testCase.id} must declare pinned border grades`);
  const gradeCoordinates = new Set();
  for (const expectation of testCase.requiredBorderGrades) {
    assert.ok(Number.isInteger(expectation.row) && expectation.row >= 1 && expectation.row <= testCase.grid.rows, `Fixture ${testCase.id} border-grade row must stay inside the detected grid`);
    assert.ok(Number.isInteger(expectation.column) && expectation.column >= 1 && expectation.column <= testCase.grid.columns, `Fixture ${testCase.id} border-grade column must stay inside the detected grid`);
    assert.ok(Number.isInteger(expectation.grade) && expectation.grade >= 0 && expectation.grade <= 2, `Fixture ${testCase.id} border grade must be 0, 1, or 2`);
    assert.ok(!gradeCoordinates.has(`${expectation.row}:${expectation.column}`), `Fixture ${testCase.id} border-grade coordinates must be unique`);
    gradeCoordinates.add(`${expectation.row}:${expectation.column}`);
  }
}
assert.deepEqual([...new Set(fixtureManifest.cases.flatMap(testCase => testCase.requiredBorderGrades.map(expectation => expectation.grade)))].sort(), [0,1,2], "Real-image fixtures must cover base, high-quality, and special border grades");
assert.deepEqual(fixtureManifest.cases.map(testCase=>testCase.minimumResolved), [84,79,85,11,1], "The calibrated safe-resolution floors must not silently regress");
for (const testCase of fixtureManifest.cases) {
  const imagePath = path.join(fixtureRoot, testCase.file);
  assert.equal(path.dirname(imagePath), fixtureRoot, `Fixture ${testCase.id} must remain directly inside the test-only fixture directory`);
  const image = fs.readFileSync(imagePath);
  assert.equal(image.length, testCase.bytes, `Fixture ${testCase.id} byte count changed`);
  assert.equal(crypto.createHash("sha256").update(image).digest("hex"), testCase.sha256, `Fixture ${testCase.id} digest changed`);
}
assert.match(programSource, /TryParseQuantity\("174\.5K"[\s\S]*?TryParseQuantity\("498\.8K"[\s\S]*?"7455K"[\s\S]*?"440K"/, "Offline smoke must lock in the two reported rounded-number regressions and reject their malformed OCR forms");
assert.match(programSource, /partialGrid\.Columns != 4[\s\S]*?singleGrid\.Columns != 1/, "Offline smoke must exercise partial-grid and single-slot geometry");
assert.match(programSource, /tinyGrid\.Columns != 4[\s\S]*?oversizedGrid\.Columns != 1[\s\S]*?wideGrid\.Columns != 1/, "Offline smoke must execute tiny multi-slot, oversized single-slot, and wide tight-crop recovery");
assert.doesNotMatch(service + recognizer, /HttpClient|WebClient|HttpWebRequest|WebRequest\.Create|https?:\/\//i, "OCR must remain fully local and may not upload screenshots");

const atlasPath = path.join(ocrAssetRoot, "icon-atlas.png");
const indexPath = path.join(ocrAssetRoot, "icon-index.json");
const clientCatalogAtlasPath = path.join(ocrAssetRoot, "client-catalog-atlas.png");
const clientCatalogIndexPath = path.join(ocrAssetRoot, "client-catalog-index.json");
const modelPath = path.join(ocrAssetRoot, "ppocrv5", "en_PP-OCRv5_mobile_rec.onnx");
const paddleLicensePath = path.join(ocrAssetRoot, "LICENSE-PADDLEOCR.txt");
const modelNoticePath = path.join(ocrAssetRoot, "MODEL-NOTICE-PPOCRV5.txt");
const onnxRuntimeLicensePath = path.join(ocrAssetRoot, "LICENSE-ONNXRUNTIME.txt");
const onnxRuntimeNoticesPath = path.join(ocrAssetRoot, "THIRD-PARTY-NOTICES-ONNXRUNTIME.txt");
for (const requiredPath of [atlasPath, indexPath, clientCatalogAtlasPath, clientCatalogIndexPath, modelPath, paddleLicensePath, modelNoticePath, onnxRuntimeLicensePath, onnxRuntimeNoticesPath]) assert.ok(fs.statSync(requiredPath).isFile(), `Missing local OCR asset ${requiredPath}`);
assert.equal(fs.statSync(modelPath).size, 7_872_351, "The reviewed PP-OCRv5 model size changed unexpectedly");
assert.equal(crypto.createHash("sha256").update(fs.readFileSync(modelPath)).digest("hex"), "c3461add59bb4323ecba96a492ab75e06dda42467c9e3d0c18db5d1d21924be8", "The reviewed PP-OCRv5 model changed unexpectedly");
assert.match(fs.readFileSync(paddleLicensePath, "utf8"), /Apache License\s+Version 2\.0, January 2004/);
assert.match(fs.readFileSync(modelNoticePath, "utf8"), /RapidOCR 3\.9\.2[\s\S]*?C3461ADD59BB4323ECBA96A492AB75E06DDA42467C9E3D0C18DB5D1D21924BE8/);
assert.match(fs.readFileSync(onnxRuntimeLicensePath, "utf8"), /Copyright \(c\) Microsoft Corporation[\s\S]*?Permission is hereby granted, free of charge/);
assert.match(fs.readFileSync(onnxRuntimeNoticesPath, "utf8"), /THIRD PARTY SOFTWARE NOTICES AND INFORMATION/);
const recipeNotice = fs.readFileSync(recipeNoticePath, "utf8");
assert.match(recipeNotice, /RapidOCR 3\.9\.2 English PP-OCRv5 mobile ONNX model entirely locally and offline/);
assert.doesNotMatch(recipeNotice, /Tesseract|Leptonica|eng\.traineddata/i, "The Recipe Book notice must not describe the retired OCR stack");
for (const retiredPath of [
  path.join(ocrAssetRoot, "tessdata", "eng.traineddata"),
  path.join(ocrAssetRoot, "LICENSE-TESSERACT.txt"),
  path.join(ocrAssetRoot, "LICENSE-LEPTONICA.txt"),
  path.join(ocrAssetRoot, "ppocrv5", "en_PP-OCRv5_mobile_rec.yml")
]) assert.equal(fs.existsSync(retiredPath), false, `Retired OCR payload must not be shipped: ${retiredPath}`);
const index = JSON.parse(fs.readFileSync(indexPath, "utf8"));
const clientCatalogIndex = JSON.parse(fs.readFileSync(clientCatalogIndexPath, "utf8"));
assert.equal(index.schemaVersion, 2);
assert.equal(clientCatalogIndex.schemaVersion, 2);
assert.equal(index.tileSize, 20);
assert.equal(index.columns, 64);
assert.deepEqual(index.background, [22,23,27]);
assert.deepEqual(index.icons.map(entry => entry.index), Array.from({ length:index.icons.length }, (_, position) => position), "Atlas indexes must be dense and deterministic");
assert.ok(index.icons.every(entry=>Object.hasOwn(entry,"materialEligible")&&(typeof entry.materialEligible==="boolean"||entry.materialEligible===null)),"Every primary atlas icon must carry a material, non-material, or mixed class");
assert.ok(index.icons.some(entry=>entry.materialEligible===true)&&index.icons.some(entry=>entry.materialEligible===false)&&index.icons.some(entry=>entry.materialEligible===null),"The primary atlas must preserve materials, finished products, and artwork shared by both");
assert.equal(clientCatalogIndex.tileSize,index.tileSize);
assert.equal(clientCatalogIndex.columns,index.columns);
assert.deepEqual(clientCatalogIndex.background,index.background);
assert.deepEqual(clientCatalogIndex.icons.map(entry=>entry.index),Array.from({length:clientCatalogIndex.icons.length},(_,position)=>position),"The full-client catalog indexes must be dense and deterministic");
assert.ok(clientCatalogIndex.icons.length>18_000,"The full-client verifier must cover the broad current BDO catalog rather than a handful of screenshot-specific negatives");
assert.ok(clientCatalogIndex.icons.every(entry=>Object.hasOwn(entry,"materialEligible")&&(typeof entry.materialEligible==="boolean"||entry.materialEligible===null)),"Every full-client icon must preserve its material class");
assert.ok(clientCatalogIndex.icons.some(entry=>entry.materialEligible===true)&&clientCatalogIndex.icons.some(entry=>entry.materialEligible===false)&&clientCatalogIndex.icons.some(entry=>entry.materialEligible===null),"The current-client atlas must contain materials, non-materials, and shared artwork from one visual domain");
assert.equal(new Set(clientCatalogIndex.icons.map(entry=>entry.icon)).size,clientCatalogIndex.icons.length,"Full-client catalog icons must be unique");
const recipePayload = JSON.parse(fs.readFileSync(recipeDataPath, "utf8"));
const bundledOcrData=core.prepareData(recipePayload),driedClownfishIcon=recipePayload.items["8602"].icon,carrotConfitIcon=recipePayload.items["9321"].icon;
const windElixirIcon=recipePayload.items["688"].icon;
assert.equal(windElixirIcon,recipePayload.items["625"].icon,"The input and finished party elixir control must share exact artwork");
assert.equal(clientCatalogIndex.icons.find(entry=>entry.icon===windElixirIcon)?.materialEligible,null,"Current-client artwork shared by a usable input and finished product must remain semantically mixed");
const driedFishEligibilityAnalysis=core.sanitizeResult({
  imageFingerprint:"1".repeat(64),width:120,height:60,grid:{columns:2,rows:1,confidence:1},
  slots:[
    {id:"supplied-dried-fish-89",row:0,column:0,box:{x:2,y:2,width:45,height:45},iconCandidates:[{icon:driedClownfishIcon,score:.8236,materialEligible:true}],iconMaterialEligible:true,iconMaterialConfidence:.94,iconMaterialMargin:.31,quantityText:"89",quantityValue:89,quantityConfidence:.99},
    {id:"finished-carrot-confit",row:0,column:1,box:{x:52,y:2,width:45,height:45},iconCandidates:[{icon:carrotConfitIcon,score:.8207,materialEligible:false},{icon:driedClownfishIcon,score:.70,materialEligible:true}],iconMaterialEligible:false,iconMaterialConfidence:.95,iconMaterialMargin:.09,quantityText:"178",quantityValue:178,quantityConfidence:.99}
  ],warnings:[]
});
const driedFishEligibilityPartition=core.partitionReviewRows(driedFishEligibilityAnalysis,bundledOcrData);
assert.deepEqual(clone(driedFishEligibilityPartition.rows.map(row=>row.slotId)),["supplied-dried-fish-89"],"The supplied qty-89 dried-fish icon must enter material review through verified Fish substitution semantics");
assert.deepEqual(clone(driedFishEligibilityPartition.ignoredRows.map(row=>row.slotId)),["finished-carrot-confit"],"The similarly scored finished Carrot Confit must remain a strong hidden non-input");
const driedFishEligibilityRow=driedFishEligibilityPartition.rows[0];
assert.equal(driedFishEligibilityRow.quantity,89,"The supplied dried-fish quantity must remain exact");
assert.deepEqual(clone(driedFishEligibilityRow.options.map(option=>option.key).sort()),["8602:0","8635:0"],"Shared dried-fish artwork must offer both exact bundled species");
assert.equal(driedFishEligibilityRow.selectedKey,"8602:0","Fish rows may follow the application's first-likely-option review behavior");
assert.equal(bundledOcrData.resourceLookup["9321:0"],undefined,"Finished Carrot Confit must not become selectable merely because it is itself cooked");
const expectedIcons = [...new Set(Object.values(recipePayload.items).map(item=>item?.icon).filter(iconPath=>iconPath&&iconPath!=="icons/item-fallback.svg"))].sort();
assert.equal(index.icons.length,expectedIcons.length,"The OCR atlas must contain one reference for every unique bundled Recipe Book item icon");
assert.deepEqual(index.icons.map(entry => entry.icon), expectedIcons, "The OCR atlas must include both recipe-input positives and known non-input negatives in deterministic order");
assert.equal(index.icons.find(entry=>entry.icon===driedClownfishIcon)?.materialEligible,true,"Verified dried-fish substitutions must be classified as usable materials");
assert.equal(index.icons.find(entry=>entry.icon===carrotConfitIcon)?.materialEligible,false,"Finished Carrot Confit must be a known non-material reference");
const primaryIcons=new Set(index.icons.map(entry=>entry.icon));
assert.ok(clientCatalogIndex.icons.some(entry=>primaryIcons.has(entry.icon)&&entry.materialEligible===true),"The current-client atlas must include material positives in the same visual domain as its negatives");
assert.ok(!index.icons.some(entry=>entry.icon==="icons/item-fallback.svg"),"The generic manual-search fallback must never participate in visual OCR matching");
const atlasBytes = fs.readFileSync(atlasPath);
assert.ok(atlasBytes.subarray(0, 8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a])), "The OCR atlas must be a PNG");
assert.equal(atlasBytes.readUInt32BE(16),index.columns*index.tileSize,"Atlas width must match its declared tile grid");
assert.equal(atlasBytes.readUInt32BE(20),Math.ceil(expectedIcons.length/index.columns)*index.tileSize,"Atlas height must contain every positive and negative reference without an unused row");
assert.equal(atlasBytes.readUInt32BE(16),1280);
assert.equal(atlasBytes.readUInt32BE(20),1220);
const clientCatalogAtlasBytes=fs.readFileSync(clientCatalogAtlasPath);
assert.ok(clientCatalogAtlasBytes.subarray(0,8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a])),"The full-client catalog atlas must be a PNG");
assert.equal(clientCatalogAtlasBytes.readUInt32BE(16),clientCatalogIndex.columns*clientCatalogIndex.tileSize);
assert.equal(clientCatalogAtlasBytes.readUInt32BE(20),Math.ceil(clientCatalogIndex.icons.length/clientCatalogIndex.columns)*clientCatalogIndex.tileSize);
assert.match(project, /<None Update="Assets\\\*\*\\\*" CopyToOutputDirectory="PreserveNewest" CopyToPublishDirectory="PreserveNewest" \/>/, "The OCR atlas, index, model, and notices must be copied into build and publish payloads");

const release = fs.readFileSync(releasePath, "utf8");
const nativeInstaller = fs.readFileSync(nativeInstallerPath, "utf8");
const legacyInstaller = fs.readFileSync(legacyInstallerPath, "utf8");
const program = fs.readFileSync(programPath, "utf8");
for (const relativePath of [
  "Assets\\RecipeBook\\ocr\\icon-atlas.png", "Assets\\RecipeBook\\ocr\\icon-index.json",
  "Assets\\RecipeBook\\ocr\\client-catalog-atlas.png", "Assets\\RecipeBook\\ocr\\client-catalog-index.json",
  "Assets\\RecipeBook\\ocr\\ppocrv5\\en_PP-OCRv5_mobile_rec.onnx",
  "Assets\\RecipeBook\\ocr\\LICENSE-PADDLEOCR.txt", "Assets\\RecipeBook\\ocr\\MODEL-NOTICE-PPOCRV5.txt",
  "Assets\\RecipeBook\\ocr\\LICENSE-ONNXRUNTIME.txt", "Assets\\RecipeBook\\ocr\\THIRD-PARTY-NOTICES-ONNXRUNTIME.txt",
  "onnxruntime.dll", "onnxruntime_providers_shared.dll"
]) {
  assert.ok(release.includes(`"${relativePath}"`), `Release validation must explicitly require ${relativePath}`);
  assert.ok(nativeInstaller.includes(`"${relativePath}"`), `Native installer validation must explicitly require ${relativePath}`);
  assert.ok(legacyInstaller.includes(`"${relativePath.replaceAll("\\", "/")}"`), `Legacy installer validation must explicitly require ${relativePath}`);
}
for (const fileName of ["icon-atlas.png", "icon-index.json", "client-catalog-atlas.png", "client-catalog-index.json", "en_PP-OCRv5_mobile_rec.onnx", "LICENSE-PADDLEOCR.txt", "MODEL-NOTICE-PPOCRV5.txt", "LICENSE-ONNXRUNTIME.txt", "THIRD-PARTY-NOTICES-ONNXRUNTIME.txt", "onnxruntime.dll", "onnxruntime_providers_shared.dll"])
  assert.ok(program.includes(`"${fileName}"`), `Offline smoke must explicitly require ${fileName}`);
for (const retiredName of ["Tesseract.dll", "tesseract50.dll", "leptonica-1.82.0.dll", "eng.traineddata", "LICENSE-TESSERACT.txt", "LICENSE-LEPTONICA.txt"]) {
  assert.equal(release.includes(`"${retiredName}"`), false, `Release validation must not require retired payload ${retiredName}`);
  assert.equal(nativeInstaller.includes(`"${retiredName}"`), false, `Native installer validation must not require retired payload ${retiredName}`);
  assert.equal(legacyInstaller.includes(`"${retiredName}"`), false, `Legacy installer validation must not require retired payload ${retiredName}`);
}
const innoInstaller = fs.readFileSync(innoInstallerPath, "utf8");
for (const retiredInstallPath of ["{app}\\Tesseract.dll", "{app}\\x64\\leptonica-1.82.0.dll", "{app}\\x64\\tesseract50.dll", "{app}\\x86\\leptonica-1.82.0.dll", "{app}\\x86\\tesseract50.dll", "{app}\\Assets\\RecipeBook\\ocr\\tessdata\\eng.traineddata", "{app}\\Assets\\RecipeBook\\ocr\\LICENSE-TESSERACT.txt", "{app}\\Assets\\RecipeBook\\ocr\\LICENSE-LEPTONICA.txt"])
  assert.ok(innoInstaller.includes(`Name: "${retiredInstallPath}"`), `Native upgrades must remove stale OCR payload ${retiredInstallPath}`);

console.log("Recipe Book Screenshot Mats OCR regression checks passed.");
