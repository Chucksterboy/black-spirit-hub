import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const scriptDirectory=path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot=path.resolve(scriptDirectory,"..");
const sourceDirectory=path.join(repositoryRoot,"Source Code");
const jsPath=path.join(sourceDirectory,"BlackSpiritHub.Resources.Black_Spirit_Hub.js");
const htmlPath=path.join(sourceDirectory,"BlackSpiritHub.Resources.Black_Spirit_Hub.html");
const cssPath=path.join(sourceDirectory,"BlackSpiritHub.Resources.Black_Spirit_Hub.css");
const builderPath=path.join(scriptDirectory,"build-recipe-book-data.mjs");
const js=fs.readFileSync(jsPath,"utf8");
const html=fs.readFileSync(htmlPath,"utf8");
const css=fs.readFileSync(cssPath,"utf8");
const builder=fs.readFileSync(builderPath,"utf8");
const navigationSpritePath=path.join(sourceDirectory,"NavigationAssets","nav-icons.svg");
const navigationSprite=fs.readFileSync(navigationSpritePath,"utf8");

const officialPatchUrl="https://www.naeu.playblackdesert.com/en-US/News/Detail?groupContentNo=10550&countryType=en-US";
const officialPatchRetiredIds=[
  4924,5303,5304,5305,5306,12318,12319,12320,12329,15276,15277,15278,
  44332,45122,45123,45297,45299,45301,45333,45335,45336,45337,45338,45339,
  45341,45342,45343,45344,45345,768154,768155,1000462
];
const retiredSetBody=builder.match(/const OFFICIAL_PATCH_RETIRED_ITEM_IDS = new Set\(\[([\s\S]*?)\]\);/)?.[1]||"";
const builderOfficialPatchRetiredIds=[...retiredSetBody.matchAll(/\b\d+\b/g)].map(match=>Number(match[0]));
assert.deepEqual(builderOfficialPatchRetiredIds,officialPatchRetiredIds,"the official patch retired-item filter must match the reviewed September 3 removal list exactly");
assert.ok(!builderOfficialPatchRetiredIds.includes(45334)&&!builderOfficialPatchRetiredIds.includes(45340),"active base Sharp Spirit Stone client identities must not be over-filtered");

const startMarker="/* RECIPE_BOOK_CORE_START */";
const endMarker="/* RECIPE_BOOK_CORE_END */";
const start=js.indexOf(startMarker);
const end=js.indexOf(endMarker);
assert.ok(start>=0&&end>start,"Recipe Book testable core markers must exist");
const coreSource=js.slice(start+startMarker.length,end);
const context=vm.createContext({console});
vm.runInContext(`${coreSource}\nglobalThis.recipeBookCore={RECIPE_BOOK_PAGE_SIZE,RECIPE_BOOK_ASSET_ROOT,RECIPE_BOOK_SUBSTITUTION_GROUP_DEFINITIONS,recipeBookSearchNorm,recipeBookSearchTokens,recipeBookTypeLabel,recipeBookSafeIconPath,recipeBookPrepareData,recipeBookFilterRecipes,recipeBookIconDisplaySize,recipeBookIngredientKey,recipeBookResourceAmount,recipeBookSanitizeResources,recipeBookResourceCandidates,recipeBookResourceInventoryRows,recipeBookRecipeRequirements,recipeBookRecipeCraftCount,recipeBookClampCraftAmount,recipeBookSanitizeCraftPlans,recipeBookCraftMaterialUsage,recipeBookItemUsage,recipeBookCraftableRecipes};`,context,{filename:"recipe-book-core.js"});
const core=context.recipeBookCore;

assert.equal(core.RECIPE_BOOK_PAGE_SIZE,24,"Recipe pages must contain 24 cards");
assert.equal(core.RECIPE_BOOK_ASSET_ROOT,"https://recipebook.bdo.local/","Recipe Book must use its installed offline virtual host");
assert.equal(core.recipeBookSearchNorm("Wolf's Blood"),"wolf blood","ASCII possessives should match canonical item names");
assert.equal(core.recipeBookSearchNorm("Wolf\u2019s Blood"),"wolf blood","curly-apostrophe possessives should match canonical item names");
assert.equal(core.recipeBookSearchNorm("  R\u00e9sidence\u2014Tea!  "),"residence tea","accents and punctuation should not affect search");
assert.equal([...core.recipeBookSearchTokens("wolf, wolf BLOOD")].join("|"),"wolf|blood","search tokens should be normalized and unique");
assert.equal(core.recipeBookTypeLabel("SIMPLE_COOK"),"Simple Cooking");
assert.equal(core.recipeBookTypeLabel("ROYALGIFT_ALCHEMY"),"Imperial Alchemy");
assert.equal(core.recipeBookTypeLabel("custom_action"),"Custom Action");
const sampleIcon=`icons/items/${"a".repeat(64)}.webp`;
assert.equal(core.recipeBookSafeIconPath(sampleIcon),`https://recipebook.bdo.local/${sampleIcon}`);
assert.equal(core.recipeBookSafeIconPath("RecipeBook/icons/item-fallback.svg"),"https://recipebook.bdo.local/icons/item-fallback.svg");
assert.equal(core.recipeBookSafeIconPath("icons/2.png"),"","only content-addressed WebPs or the fixed fallback may be loaded");
assert.equal(core.recipeBookSafeIconPath("https://example.com/item.png"),"","remote icons must be rejected");
assert.equal(core.recipeBookSafeIconPath("icons/../secret.png"),"","traversal paths must be rejected");
assert.deepEqual({...core.recipeBookIconDisplaySize(44,44,"output",1)},{width:44,height:44},"44px outputs should render at native size at 100% scaling");
assert.deepEqual({...core.recipeBookIconDisplaySize(44,44,"output",1.25)},{width:44,height:44},"display scaling must not make identical icons visually inconsistent");
assert.deepEqual({...core.recipeBookIconDisplaySize(44,44,"ingredient",1)},{width:34,height:34},"ingredient icons should be downscaled inside their frame");
assert.deepEqual({...core.recipeBookIconDisplaySize(92,92,"ingredient",1.5)},{width:34,height:34},"high-resolution ingredients should remain capped consistently");
assert.equal(core.recipeBookIngredientKey("2",0),"2:0");
assert.equal(core.recipeBookIngredientKey("2",2),"2:2","enhanced ingredients must remain separate resource identities");
assert.equal(core.recipeBookResourceAmount(39000),39000,"large whole resource quantities must remain exact");
assert.equal(core.recipeBookResourceAmount(39000.9),0,"fractional resource quantities must be rejected");
assert.equal(core.recipeBookResourceAmount(-1),0);
assert.equal(core.recipeBookResourceAmount(Number.POSITIVE_INFINITY),0);
assert.equal(core.recipeBookClampCraftAmount(undefined,100),100,"new craft planners should default to the maximum craftable amount");
assert.equal(core.recipeBookClampCraftAmount(0,100),1,"craft plans must never fall below one batch");
assert.equal(core.recipeBookClampCraftAmount(101,100),100,"craft plans must never exceed available materials");
assert.equal(core.recipeBookClampCraftAmount(25,100),25,"valid saved craft plans must be retained");
assert.equal(core.recipeBookClampCraftAmount(1,0),0,"recipes with no craftable batches cannot have a plan");
assert.deepEqual({...core.recipeBookSanitizeCraftPlans({"cook-beer":25,empty:0,fractional:1.5})},{"cook-beer":25},"saved craft plans must contain positive whole batches only");
assert.deepEqual({...core.recipeBookCraftMaterialUsage(5,25,500)},{used:125,remaining:375},"craft planners must show exact material use and remaining stock");
assert.deepEqual({...core.recipeBookCraftMaterialUsage(7,2,14)},{used:14,remaining:0},"maximum craft plans must consume no more than owned stock");

const fixture={
  schemaVersion:1,
  source:{kind:"test fixture"},
  counts:{recipes:3,items:6},
  items:{
    "1":{name:"Beer",grade:0,icon:"icons/1.webp"},
    "2":{name:"Wolf Blood",description:"A natural resource used in Alchemy.",grade:1,icon:"icons/2.webp"},
    "3":{name:"Salt",grade:0,icon:"icons/3.webp"},
    "4":{name:"Savage Draught",grade:3,icon:"icons/4.webp"},
    "5":{name:"Wheat",grade:0,icon:"icons/5.webp"},
    "6":{name:"Sinner's Blood",grade:2,icon:"icons/6.webp"}
  },
  recipes:[
    {id:"cook-beer",outputId:"1",type:"COOK",station:"Cooking Utensil",inputs:[{itemId:"5",count:5},{itemId:"3",count:1}]},
    {id:"alchemy-draught",outputId:"4",type:"ALCHEMY",station:"Alchemy Tool",inputs:[{itemId:"2",count:7},{itemId:"3",count:2}]},
    {id:"alchemy-sinners",outputId:"6",outputEnhancement:0,type:"ALCHEMY",inputs:[{itemId:"2",count:2}]}
  ]
};
const prepared=core.recipeBookPrepareData(fixture);
assert.equal(prepared.recipes.length,3);
assert.equal(prepared.types.length,2);
assert.equal(prepared.source.kind,"test fixture");
assert.ok(Object.isFrozen(prepared.recipes),"normalized recipes should be immutable");
assert.ok(Object.isFrozen(prepared.items["2"]),"normalized items should be immutable");
assert.equal(prepared.items["2"].description,"A natural resource used in Alchemy.","client item descriptions must remain available offline");
assert.ok(prepared.resourceLookup["2:0"],"ingredient identities must be indexed for My Resources");
assert.equal(core.recipeBookResourceCandidates(prepared,"wolf",10)[0].key,"2:0","resource search must find recipe ingredients by name");

const cleanResources=core.recipeBookSanitizeResources({"2:0":10,"3:0":2,"404:0":99,"5:0":-1},prepared);
assert.deepEqual({...cleanResources},{"2:0":10,"3:0":2},"stored resources must discard invalid or unavailable identities safely");
assert.equal(core.recipeBookRecipeCraftCount(prepared.recipes.find(recipe=>recipe.id==="alchemy-draught"),cleanResources),1,"craft count must use the limiting ingredient");
assert.equal(core.recipeBookRecipeCraftCount(prepared.recipes.find(recipe=>recipe.id==="cook-beer"),{"5:0":10,"3:0":2}),2,"complete resources must yield the exact number of craft batches");
assert.equal(core.recipeBookRecipeCraftCount({inputs:[{key:"2:0",count:2},{key:"2:0",count:3}]},{"2:0":10}),2,"repeated ingredient requirements must be aggregated before division");
assert.equal(core.recipeBookRecipeCraftCount({inputs:[{key:"2:2",count:1}]},{"2:1":99}),0,"one enhancement level must never satisfy another");
assert.deepEqual(Array.from(core.recipeBookCraftableRecipes(prepared,{"2:0":14,"3:0":4}),entry=>[entry.recipe.id,entry.maxCrafts]),[["alchemy-sinners",7],["alchemy-draught",2]],"Craftables must retain recipe variants and calculate each independently");

assert.ok(Array.isArray(core.RECIPE_BOOK_SUBSTITUTION_GROUP_DEFINITIONS),"BDO substitution groups must be declared as reviewed core data");
assert.ok(Object.isFrozen(core.RECIPE_BOOK_SUBSTITUTION_GROUP_DEFINITIONS),"Substitution definitions must be immutable at runtime");
for(const groupId of ["meat-1","meat-reptile","meat-bird","blood-1","blood-2","blood-3","blood-4","blood-5","grain","flour","dough","fruit","vegetable","flower","herb-juice"]){
  assert.ok(core.RECIPE_BOOK_SUBSTITUTION_GROUP_DEFINITIONS.some(group=>group.id===groupId),`Missing reviewed BDO substitution group ${groupId}`);
}

const substitutionFixture={
  schemaVersion:1,
  source:{kind:"substitution fixture"},
  counts:{recipes:5,items:9},
  items:{
    "6204":{name:"Rhino Blood",grade:0,icon:"icons/6204.webp"},
    "6214":{name:"Wolf Blood",grade:0,icon:"icons/6214.webp"},
    "7201":{name:"Wheat Dough",grade:0,icon:"icons/7201.webp"},
    "7202":{name:"Barley Dough",grade:0,icon:"icons/7202.webp"},
    "7901":{name:"Deer Meat",grade:0,icon:"icons/7901.webp"},
    "7908":{name:"Lizard Meat",grade:0,icon:"icons/7908.webp"},
    "7913":{name:"Wolf Meat",grade:0,icon:"icons/7913.webp"},
    "7915":{name:"Cheetah Dragon Meat",grade:0,icon:"icons/7915.webp"},
    "999999":{name:"Test Meal",grade:0,icon:"icons/999999.webp"}
  },
  recipes:[
    {id:"cook-red-meat",outputId:"999999",type:"COOK",inputs:[{itemId:"7905",count:5}]},
    {id:"alchemy-blood",outputId:"999999",type:"ALCHEMY",inputs:[{itemId:"6214",count:2}]},
    {id:"cook-dough",outputId:"999999",type:"COOK",inputs:[{itemId:"7201",count:2}]},
    {id:"cook-reptile",outputId:"999999",type:"COOK",inputs:[{itemId:"7908",count:2}]},
    {id:"cook-fruit",outputId:"999999",type:"COOK",inputs:[{itemId:"7313",count:2}]},
    {id:"house-exact",outputId:"999999",type:"HOUSE",inputs:[{itemId:"7901",count:5}]},
    {id:"herbal-juice",outputId:"999999",type:"SIMPLE_ALCHEMY",inputs:[{itemId:"5401",count:3}]},
    {id:"herbal-juice-azalea",outputId:"999999",type:"SIMPLE_ALCHEMY",inputs:[{itemId:"5402",count:3}]},
    {id:"herbal-juice-weeds",outputId:"999999",type:"SIMPLE_ALCHEMY",inputs:[{itemId:"5600",count:10}]}
  ]
};
const substitutionData=core.recipeBookPrepareData(substitutionFixture);
assert.ok(Array.isArray(substitutionData.substitutionGroups)&&substitutionData.substitutionGroups.length>=14,"Prepared data must expose the reviewed substitution groups");
assert.ok(substitutionData.substitutionGroupLookup["meat-1"],"Prepared data must index substitution groups by stable ID");
assert.equal(substitutionData.substitutionGroupLookup["meat-1"].sharedIcon,true,"Meat Group metadata must preserve its shared-icon ambiguity flag for OCR");
assert.equal(substitutionData.substitutionGroupLookup["blood-1"].sharedIcon,true,"Blood Group metadata must preserve its shared-icon ambiguity flag for OCR");
assert.equal(substitutionData.substitutionGroupLookup.grain.sharedIcon,false,"Non-identical quality-tier groups must not be mislabeled as shared meat/blood icons");
assert.equal(substitutionData.substitutionMemberByKey["7901:0"]?.groupId,"meat-1","Prepared data must index exact member identities without replacing their keys");
assert.ok(substitutionData.resourceLookup["7913:0"],"A curated substitute absent from recipe inputs must be synthesized as a selectable resource identity");
assert.equal(core.recipeBookResourceCandidates(substitutionData,"Wolf Meat",10)[0]?.key,"7913:0","Synthesized substitution members must be searchable by their real material name");
assert.deepEqual(core.recipeBookFilterRecipes(substitutionData,{query:"Goat Meat",mode:"ingredient"}).map(recipe=>recipe.id),["cook-red-meat"],"Ingredient search must expose every valid member of a generic substitution-group recipe");
assert.equal(core.recipeBookFilterRecipes(substitutionData,{query:"Wolf Meat",mode:"ingredient"}).some(recipe=>recipe.id==="house-exact"),false,"Ingredient search must not expand an exact non-group recipe to sibling materials");
assert.equal(substitutionData.substitutionMemberByKey["820108:0"]?.groupId,"fruit","Wild Berry must be an exact member of the explicitly requested Fruit Group");
assert.equal(substitutionData.substitutionMemberByKey["820113:0"]?.groupId,"fruit","Persimmon must be an exact member of the explicitly requested Fruit Group");
assert.deepEqual(core.recipeBookFilterRecipes(substitutionData,{query:"Wild Berry",mode:"ingredient"}).map(recipe=>recipe.id),["cook-fruit"],"Ingredient search must expose Wild Berry through a generic Fruit Group recipe");
assert.deepEqual(core.recipeBookFilterRecipes(substitutionData,{query:"Persimmon",mode:"ingredient"}).map(recipe=>recipe.id),["cook-fruit"],"Ingredient search must expose Persimmon through a generic Fruit Group recipe");
const goatUsage=core.recipeBookItemUsage(substitutionData,"7957",0,4);
assert.equal(goatUsage.recipeCount,1,"A substitute tooltip must report the generic recipe that accepts it");
assert.equal(goatUsage.outputs[0]?.outputId,"999999","Substitute usage must resolve to the same crafted output as the canonical group ingredient");
assert.equal(substitutionData.resourceLookup["7957:0"].uses,goatUsage.recipeCount,"Search ranking and tooltip usage must share the same group-applicability rules");

const exactMeatResources=core.recipeBookSanitizeResources({"7901:0":10000,"7913:0":10000},substitutionData);
assert.deepEqual({...exactMeatResources},{"7901:0":10000,"7913:0":10000},"Grouped presentation must preserve each exact material key and quantity in storage");
const meatRows=Array.from(core.recipeBookResourceInventoryRows(substitutionData,exactMeatResources));
assert.equal(meatRows.length,1,"Two tracked red meats must project as one inventory card");
const meatRow=meatRows[0];
assert.equal(meatRow.kind,"group");
assert.equal(meatRow.id,"group:meat-1");
assert.equal(meatRow.groupId,"meat-1");
assert.equal(meatRow.name,"Meat Group 1");
assert.equal(meatRow.rawTotal,20000,"Five different 10K red meats would likewise sum to one 50K raw group total");
assert.equal(meatRow.equivalentTotal,20000,"One-to-one meat substitutes must retain the same recipe-unit total");
assert.equal(meatRow.weighted,false);
assert.deepEqual(Array.from(meatRow.members,member=>[member.key,member.amount]).sort(),[["7901:0",10000],["7913:0",10000]],"The grouped card must retain every tracked member for its icon and editable detail row");

const redMeatRecipe=substitutionData.recipes.find(recipe=>recipe.id==="cook-red-meat");
const redMeatRequirement=core.recipeBookRecipeRequirements(redMeatRecipe,exactMeatResources,substitutionData)[0];
assert.equal(redMeatRequirement.key,"group:meat-1");
assert.equal(redMeatRequirement.groupId,"meat-1");
assert.equal(redMeatRequirement.candidateKey,substitutionData.substitutionGroupLookup["meat-1"].representativeKey,"Grouped requirements must use the reviewed representative icon identity");
assert.equal(redMeatRequirement.name,"Meat Group 1");
assert.equal(redMeatRequirement.count,5);
assert.equal(redMeatRequirement.owned,20000,"A cooking recipe must pool all same-group meat stock");
assert.equal(redMeatRequirement.rawOwned,20000);
assert.equal(redMeatRequirement.weighted,false);
assert.equal(core.recipeBookRecipeCraftCount(redMeatRecipe,exactMeatResources,substitutionData),4000,"Group-pooled stock must determine the craftable batch count");
const repeatedMeatRecipe={type:"COOK",inputs:[{key:"7905:0",count:2},{key:"7905:0",count:3}]},repeatedMeatRequirements=core.recipeBookRecipeRequirements(repeatedMeatRecipe,{"7901:0":10},substitutionData);
assert.equal(repeatedMeatRequirements.length,1,"Repeated inputs from one substitution group must share one pooled requirement");
assert.equal(repeatedMeatRequirements[0].count,5,"Same-group recipe inputs must aggregate before craft division");
assert.equal(core.recipeBookRecipeCraftCount(repeatedMeatRecipe,{"7901:0":10},substitutionData),2);
const exactPotatoRecipe={type:"COOK",inputs:[{key:"7003:0",count:5}]};
assert.equal(core.recipeBookRecipeRequirements(exactPotatoRecipe,{"7001:0":5},substitutionData)[0].key,"7003:0","A same-type recipe that literally requires a non-representative member must remain exact");
assert.equal(core.recipeBookRecipeCraftCount(exactPotatoRecipe,{"7001:0":5},substitutionData),0,"Wheat must never satisfy an exact Potato recipe merely because both are grains");
const genericGrainRecipe={type:"COOK",inputs:[{key:"7001:0",count:5}]},qualityGrainRequirement=core.recipeBookRecipeRequirements(genericGrainRecipe,{"7006:0":3},substitutionData)[0];
assert.equal(qualityGrainRequirement.key,"group:grain","The representative Wheat requirement must identify a generic Grain Group recipe");
assert.equal(qualityGrainRequirement.owned,6,"High-quality Wheat must contribute the conservative two recipe units per physical item");
assert.equal(core.recipeBookRecipeCraftCount(genericGrainRecipe,{"7006:0":3},substitutionData),1,"Quality grain must safely satisfy a generic grain recipe at its conservative tier value");
const fruitResources=core.recipeBookSanitizeResources({"820108:0":7,"820113:0":5},substitutionData),fruitRow=Array.from(core.recipeBookResourceInventoryRows(substitutionData,fruitResources)).find(row=>row.groupId==="fruit"),fruitRecipe=substitutionData.recipes.find(recipe=>recipe.id==="cook-fruit"),fruitRequirement=core.recipeBookRecipeRequirements(fruitRecipe,fruitResources,substitutionData)[0];
assert.ok(fruitRow,"Wild Berry and Persimmon stock must project into one Fruit Group inventory card");
assert.equal(fruitRow.rawTotal,12,"Fruit Group inventory must add the literal Wild Berry and Persimmon quantities");
assert.equal(fruitRow.equivalentTotal,12,"Wild Berry and Persimmon must contribute one recipe unit per item");
assert.deepEqual(Array.from(fruitRow.members,member=>member.key).sort(),["820108:0","820113:0"],"The grouped Fruit card must retain both exact member identities");
assert.equal(fruitRequirement.key,"group:fruit","An Apple representative input must resolve as the generic Fruit Group requirement");
assert.equal(fruitRequirement.owned,12,"Generic fruit requirements must pool Wild Berry and Persimmon stock");
assert.equal(core.recipeBookRecipeCraftCount(fruitRecipe,fruitResources,substitutionData),6,"Fruit Group stock must drive generic recipe craftability");
const herbResources={"5402:0":3,"5600:0":10},herbRow=Array.from(core.recipeBookResourceInventoryRows(substitutionData,herbResources)).find(row=>row.groupId==="herb-juice"),herbRecipe=substitutionData.recipes.find(recipe=>recipe.id==="herbal-juice"),herbRequirement=core.recipeBookRecipeRequirements(herbRecipe,herbResources,substitutionData)[0];
assert.equal(herbRow.name,"Herb Group 1","The user-reviewed wild-herb pool must have a single grouped inventory card");
assert.equal(herbRow.rawTotal,13,"The herb group must preserve the literal item count");
assert.equal(herbRow.equivalentTotal,60,"Three wild herbs and ten Weeds must each contribute one 30-unit Herbal Juice batch");
assert.equal(herbRequirement.count,30);
assert.equal(herbRequirement.owned,60);
assert.equal(core.recipeBookRecipeCraftCount(herbRecipe,herbResources,substitutionData),2,"Herb Group 1 must honor both the 3-herb and 10-Weeds Herbal Juice ratios");
assert.equal(substitutionData.substitutionCanonicalRecipeById["herbal-juice-azalea"],"herbal-juice","Equivalent herb recipe variants must alias the pooled canonical recipe");
assert.equal(substitutionData.substitutionCanonicalRecipeById["herbal-juice-weeds"],"herbal-juice","The 10-Weeds variant must alias the 3-herb pooled recipe through exact integer units");
assert.equal(core.recipeBookCraftableRecipes(substitutionData,herbResources).filter(entry=>entry.recipe.id.startsWith("herbal-juice")).map(entry=>entry.recipe.id).join("|"),"herbal-juice","Craftables must show one pooled group card instead of duplicate material variants");
assert.equal(core.recipeBookFilterRecipes(substitutionData,{query:"Silver Azalea",mode:"ingredient"}).map(recipe=>recipe.id).join("|"),"herbal-juice","Ingredient search must return the pooled canonical recipe once instead of its duplicate exact alias");
assert.equal(core.recipeBookItemUsage(substitutionData,"5402",0,4).recipeCount,1,"A grouped member tooltip must count the pooled Herbal Juice recipe once");
const groupedCraftable=Array.from(core.recipeBookCraftableRecipes(substitutionData,exactMeatResources),entry=>[entry.recipe.id,entry.maxCrafts]);
assert.ok(groupedCraftable.some(([id,maxCrafts])=>id==="cook-red-meat"&&maxCrafts===4000),"Craftables must use substitution-aware recipe counts, not only direct exact stock");

const bloodResources=core.recipeBookSanitizeResources({"6204:0":10,"6214:0":10},substitutionData);
const bloodRow=Array.from(core.recipeBookResourceInventoryRows(substitutionData,bloodResources)).find(row=>row.groupId==="blood-1");
assert.ok(bloodRow,"Same-group bloods must project into one Blood Group 1 inventory card");
assert.equal(bloodRow.rawTotal,20);
assert.equal(bloodRow.equivalentTotal,20,"Blood Group 1 members in this reviewed one-to-one model must pool at the same amount");
assert.equal(bloodRow.weighted,false);
const bloodRecipe=substitutionData.recipes.find(recipe=>recipe.id==="alchemy-blood");
assert.equal(core.recipeBookRecipeCraftCount(bloodRecipe,bloodResources,substitutionData),10,"Alchemy recipes must consume pooled same-group blood stock");

for(const [groupId,resources,recipeId] of [
  ["dough",{"7201:0":10,"7202:0":10},"cook-dough"],
  ["meat-reptile",{"7908:0":10,"7915:0":10},"cook-reptile"]
]){
  const inventoryRow=Array.from(core.recipeBookResourceInventoryRows(substitutionData,resources)).find(row=>row.groupId===groupId);
  assert.ok(inventoryRow,`${groupId} substitutes must project into one inventory card`);
  assert.equal(inventoryRow.rawTotal,20,`${groupId} must show the literal sum of stored items`);
  assert.equal(inventoryRow.weighted,true,`${groupId} must disclose that its recipe units use member factors`);
  assert.notEqual(inventoryRow.equivalentTotal,inventoryRow.rawTotal,`${groupId} must distinguish raw item total from weighted recipe units`);
  const expectedEquivalent=Array.from(inventoryRow.members,member=>member.amount*member.factor).reduce((sum,value)=>sum+value,0);
  assert.equal(inventoryRow.equivalentTotal,expectedEquivalent,`${groupId} recipe units must be the exact weighted member sum`);
  const recipe=substitutionData.recipes.find(entry=>entry.id===recipeId),requirement=core.recipeBookRecipeRequirements(recipe,resources,substitutionData)[0],recipeMember=inventoryRow.members.find(member=>member.key===recipe.inputs[0].key);
  assert.equal(requirement.key,`group:${groupId}`);
  assert.equal(requirement.owned,expectedEquivalent);
  assert.equal(requirement.count,recipe.inputs[0].count*recipeMember.factor,"Recipe cost must be normalized to the same units as weighted stock");
  assert.equal(core.recipeBookRecipeCraftCount(recipe,resources,substitutionData),Math.floor(expectedEquivalent/requirement.count));
}

const houseRecipe=substitutionData.recipes.find(recipe=>recipe.id==="house-exact"),wolfOnly={"7913:0":10000},mixedMeat={"7901:0":10000,"7913:0":10000};
const houseRequirement=core.recipeBookRecipeRequirements(houseRecipe,mixedMeat,substitutionData)[0];
assert.equal(houseRequirement.key,"7901:0","Non-cooking/non-alchemy recipes must retain the exact ingredient key");
assert.equal(houseRequirement.groupId,"");
assert.equal(houseRequirement.owned,10000,"HOUSE recipes must not count a same-group substitute toward an exact material");
assert.equal(houseRequirement.rawOwned,10000);
assert.equal(core.recipeBookRecipeCraftCount(houseRecipe,wolfOnly,substitutionData),0,"A substitute must not satisfy an exact HOUSE recipe outside the reviewed recipe-type scope");
assert.equal(core.recipeBookRecipeCraftCount(houseRecipe,mixedMeat,substitutionData),2000);

const fishFixture={
  schemaVersion:1,
  source:{kind:"fish substitution fixture"},
  counts:{recipes:5,items:8},
  items:{
    "8201":{name:"Mudskipper",description:"An ingredient used for Cooking.\n- Common Fish\n- Usage: Fried Fish, Steamed Fish, Fish Soup, etc.",grade:1,icon:`icons/items/${"1".repeat(64)}.webp`},
    "8302":{name:"Clownfish",description:"An ingredient used for Cooking.\n- Common Fish\n- Usage: Fried Fish, Steamed Fish, Fish Soup, etc.",grade:1,icon:`icons/items/${"2".repeat(64)}.webp`},
    "8335":{name:"Mackerel Pike",description:"An ingredient used for Cooking.\n- Common Fish\n- Usage: Fried Fish, Steamed Fish, Fish Soup, etc.",grade:1,icon:`icons/items/${"3".repeat(64)}.webp`},
    "8501":{name:"Dried Mudskipper",description:"You will need twice as much of it for cooking compared to the non-dried version.",grade:0,icon:`icons/items/${"4".repeat(64)}.webp`},
    "8602":{name:"Dried Clownfish",description:"You will need twice as much of it for cooking compared to the non-dried version.",grade:0,icon:`icons/items/${"5".repeat(64)}.webp`},
    "8635":{name:"Dried Mackerel Pike",description:"A dried mackerel pike obtained through Drying.",grade:0,icon:`icons/items/${"5".repeat(64)}.webp`},
    "990001":{name:"Test Fish Meal",description:"A test cooking output.",grade:0,icon:`icons/items/${"6".repeat(64)}.webp`},
    "990002":{name:"Test Fish Pack",description:"A test workshop output.",grade:0,icon:`icons/items/${"7".repeat(64)}.webp`}
  },
  recipes:[
    {id:"dry-mudskipper",outputId:"8501",type:"DRY",inputs:[{itemId:"8201",count:1}]},
    {id:"dry-clownfish",outputId:"8602",type:"DRY",inputs:[{itemId:"8302",count:1}]},
    {id:"dry-mackerel-pike",outputId:"8635",type:"DRY",inputs:[{itemId:"8335",count:1}]},
    {id:"cook-generic-fish",outputId:"990001",type:"COOK",inputs:[{itemId:"8201",count:1}]},
    {id:"house-exact-dried-fish",outputId:"990002",type:"HOUSE",inputs:[{itemId:"8501",count:10}]}
  ]
};
const fishData=core.recipeBookPrepareData(fishFixture),fishGroup=fishData.substitutionGroupLookup.fish,fishRecipe=fishData.recipes.find(recipe=>recipe.id==="cook-generic-fish");
assert.ok(fishGroup,"A verified DRY mapping from generic Cooking fish must derive the Fish Group");
assert.equal(fishGroup.representativeKey,"8201:0");
assert.deepEqual(Array.from(fishGroup.recipeTypes),["COOK"],"Fish substitution must apply only to generic Cooking recipes");
assert.equal(fishGroup.sharedIcon,true,"Fish artwork may identify multiple exact dried species");
assert.deepEqual(Array.from(fishGroup.members,member=>[member.key,member.factor,member.tier]),[
  ["8201:0",2,"fresh-common"],["8302:0",2,"fresh-common"],["8335:0",2,"fresh-common"],
  ["8501:0",1,"dried"],["8602:0",1,"dried"],["8635:0",1,"dried"]
],"Derived fish members must use two integer recipe units per fresh fish and one per dried fish");
assert.equal(core.recipeBookRecipeCraftCount(fishRecipe,{"8302:0":1},fishData),1,"One fresh generic fish must satisfy one fish requirement");
assert.equal(core.recipeBookRecipeCraftCount(fishRecipe,{"8602:0":1},fishData),0,"One dried fish must not satisfy one fresh-fish requirement");
assert.equal(core.recipeBookRecipeCraftCount(fishRecipe,{"8602:0":2},fishData),1,"Two dried fish must substitute for one fresh fish");
const fishInventory=Array.from(core.recipeBookResourceInventoryRows(fishData,{"8302:0":1,"8602:0":2})).find(row=>row.groupId==="fish");
assert.equal(fishInventory.rawTotal,3,"Fish inventory must preserve physical item totals");
assert.equal(fishInventory.equivalentTotal,4,"One fresh plus two dried fish must contribute four scaled recipe units");
const driedCookingUsage=fishData.recipesUsingKey["8602:0"].find(entry=>entry.recipe.id==="cook-generic-fish");
assert.equal(driedCookingUsage?.count,2,"Synthesized item usage must include the representative's scale before converting to a dried member count");
const exactDryRecipe=fishData.recipes.find(recipe=>recipe.id==="dry-clownfish"),exactHouseFishRecipe=fishData.recipes.find(recipe=>recipe.id==="house-exact-dried-fish");
assert.equal(core.recipeBookRecipeCraftCount(exactDryRecipe,{"8602:0":99},fishData),0,"A dried sibling must never satisfy an exact fresh-fish Drying input");
assert.equal(core.recipeBookRecipeCraftCount(exactDryRecipe,{"8302:0":1},fishData),1,"The exact fresh species must still satisfy its Drying recipe");
assert.equal(core.recipeBookRecipeCraftCount(exactHouseFishRecipe,{"8602:0":10},fishData),0,"Dried siblings must not pool in exact Fish Workshop recipes");
assert.equal(core.recipeBookRecipeCraftCount(exactHouseFishRecipe,{"8501:0":10},fishData),1,"The exact dried species must still satisfy its Fish Workshop recipe");

const singleResourceRow=Array.from(core.recipeBookResourceInventoryRows(prepared,{"3:0":2}))[0];
assert.equal(singleResourceRow.kind,"single","Materials without a reviewed substitution group must retain a normal inventory row");
assert.equal(singleResourceRow.id,"3:0");
assert.equal(singleResourceRow.key,"3:0");
assert.equal(singleResourceRow.candidate.key,"3:0");
assert.equal(singleResourceRow.amount,2);

const usageFixture={...fixture,counts:{recipes:4,items:6},recipes:[...fixture.recipes,{id:"alchemy-draught-alt",outputId:"4",type:"SIMPLE_ALCHEMY",station:"Processing",inputs:[{itemId:"2",count:3}]}]};
const usagePrepared=core.recipeBookPrepareData(usageFixture),wolfUsage=core.recipeBookItemUsage(usagePrepared,"2",0,1),draughtUsage=core.recipeBookItemUsage(usagePrepared,"4",0,4);
assert.equal(wolfUsage.recipeCount,3,"usage summaries must preserve every recipe variant");
assert.equal(wolfUsage.uniqueOutputCount,2,"usage summaries must group duplicate output variants");
assert.deepEqual({...wolfUsage.outputs[0]}, {outputKey:"4:0",outputId:"4",outputEnhancement:0,type:"ALCHEMY",station:"Alchemy Tool",recipeCount:2,minimum:3,maximum:7},"grouped usage must retain quantity ranges and variant totals");
assert.equal(wolfUsage.outputs.length,1,"usage previews must respect their display cap");
assert.equal(wolfUsage.remainingOutputCount,1,"usage previews must report hidden crafted outputs");
assert.equal(draughtUsage.producedByCount,2,"item tooltips must report every direct production recipe variant");

const wolfResults=core.recipeBookFilterRecipes(prepared,{query:"Wolf's Blood",mode:"ingredient"});
assert.equal(wolfResults.map(recipe=>recipe.id).join("|"),"alchemy-draught|alchemy-sinners","Wolf's Blood must find recipes using canonical Wolf Blood");
assert.equal(core.recipeBookFilterRecipes(prepared,{query:"wolf salt",mode:"ingredient"}).map(recipe=>recipe.id).join("|"),"alchemy-draught","ingredient search must use AND-token matching");
assert.equal(core.recipeBookFilterRecipes(prepared,{query:"savage",mode:"name"}).map(recipe=>recipe.id).join("|"),"alchemy-draught","name mode must search crafted item names");
assert.equal(core.recipeBookFilterRecipes(prepared,{query:"wolf",mode:"name"}).length,0,"name mode must not search ingredient names");
assert.equal(core.recipeBookFilterRecipes(prepared,{mode:"name",type:"COOK"}).map(recipe=>recipe.id).join("|"),"cook-beer","craft category filtering must use exact recipe types");

assert.throws(()=>core.recipeBookPrepareData({...fixture,schemaVersion:2}),/schemaVersion must be 1/);
assert.throws(()=>core.recipeBookPrepareData({...fixture,recipes:[{id:"bad",outputId:"404",type:"COOK",inputs:[{itemId:"5",count:1}]}]}),/outputId does not reference an item/);
assert.throws(()=>core.recipeBookPrepareData({...fixture,recipes:[{id:"bad",outputId:"1",type:"COOK",inputs:[{itemId:"5",count:0}]}]}),/count must be greater than zero/);
const rangedFixture=core.recipeBookPrepareData({...fixture,recipes:fixture.recipes.map((recipe,index)=>index?recipe:{...recipe,outputQuantityMin:10,outputQuantityMax:18,outputQuantityNote:"Varies with Processing Mastery",officialSource:officialPatchUrl})});
const rangedFixtureRecipe=rangedFixture.recipes.find(recipe=>recipe.id==="cook-beer");
assert.deepEqual({min:rangedFixtureRecipe.outputQuantityMin,max:rangedFixtureRecipe.outputQuantityMax,note:rangedFixtureRecipe.outputQuantityNote,source:rangedFixtureRecipe.officialSource},{min:10,max:18,note:"Varies with Processing Mastery",source:officialPatchUrl},"variable output ranges and official provenance must survive catalog preparation");
assert.throws(()=>core.recipeBookPrepareData({...fixture,recipes:[{...fixture.recipes[0],outputQuantityMin:18,outputQuantityMax:10},...fixture.recipes.slice(1)]}),/outputQuantityMax must be a whole number no smaller than outputQuantityMin/);
assert.throws(()=>core.recipeBookPrepareData({...fixture,recipes:[{...fixture.recipes[0],officialSource:"http://example.invalid/patch"},...fixture.recipes.slice(1)]}),/officialSource must be an HTTPS URL/);

const bundledDataPath=path.join(sourceDirectory,"Assets","RecipeBook","recipes.json");
if(fs.existsSync(bundledDataPath)){
  const bundleRoot=path.dirname(bundledDataPath);
  const manifestPath=path.join(bundleRoot,"manifest.json");
  const bundleIdPath=path.join(bundleRoot,"bundle-id.txt");
  const filterReportPath=path.join(bundleRoot,"filter-report.json");
  const noticePath=path.join(bundleRoot,"NOTICE.txt");
  for(const required of [manifestPath,bundleIdPath,filterReportPath,noticePath])assert.ok(fs.statSync(required).isFile(),`bundled catalog file is missing: ${path.basename(required)}`);
  const digest=value=>createHash("sha256").update(value).digest("hex");
  const datasetBytes=fs.readFileSync(bundledDataPath);
  const manifestBytes=fs.readFileSync(manifestPath);
  const filterReportBytes=fs.readFileSync(filterReportPath);
  const payload=JSON.parse(datasetBytes.toString("utf8"));
  const manifest=JSON.parse(manifestBytes.toString("utf8"));
  const filterReport=JSON.parse(filterReportBytes.toString("utf8"));
  const bundled=core.recipeBookPrepareData(payload);
  const recipesForOutput=outputId=>payload.recipes.filter(recipe=>Number(recipe.outputId)===Number(outputId));
  const recipesUsingItem=itemId=>payload.recipes.filter(recipe=>recipe.inputs.some(input=>Number(input.itemId)===Number(itemId)));
  const sortedInputPairs=recipe=>recipe.inputs.map(input=>[Number(input.itemId),input.count]).sort((left,right)=>left[0]-right[0]||left[1]-right[1]);
  assert.equal(fs.readFileSync(bundleIdPath,"utf8").trim(),digest(manifestBytes),"bundle marker must hash the exact manifest bytes");
  assert.equal(manifest.dataset.path,"recipes.json");
  assert.equal(manifest.dataset.bytes,datasetBytes.length);
  assert.equal(manifest.dataset.sha256,digest(datasetBytes));
  assert.equal(manifest.filterReport.path,"filter-report.json");
  assert.equal(manifest.filterReport.bytes,filterReportBytes.length);
  assert.equal(manifest.filterReport.sha256,digest(filterReportBytes));
  assert.equal(payload.counts.recipes,payload.recipes.length,"dataset recipe count must be exact");
  assert.equal(payload.counts.items,Object.keys(payload.items).length,"dataset item count must be exact");
  assert.equal(payload.counts.rawRecipes+payload.counts.officialPatchRecipeOverrides,payload.counts.recipes+payload.counts.excludedRecipes,"every extracted recipe and official patch override must be kept or reported as excluded");
  assert.equal(filterReport.counts.rawRecipes,payload.counts.rawRecipes,"filter report and runtime dataset must describe the same source snapshot");
  assert.equal(filterReport.counts.officialPatchRecipeOverrides,payload.counts.officialPatchRecipeOverrides,"filter report and runtime dataset must describe the same official recipe overlay");
  assert.deepEqual(filterReport.counts.exclusions,payload.counts.exclusions,"filter report exclusion totals must match the runtime dataset");
  assert.equal(payload.counts.rawRecipes,13525,"the reviewed September 3 extractor recipe count changed unexpectedly");
  assert.equal(payload.counts.officialPatchRecipeOverrides,4,"the reviewed patch must contribute Elion's Tear plus three variable-yield Spirit Stone recipes");
  assert.equal(payload.counts.excludedRecipes,3316,"the reviewed September 3 exclusion count changed unexpectedly");
  assert.equal(payload.counts.items,7626,"the reviewed September 3 referenced-item count changed unexpectedly");
  assert.equal(bundled.recipes.length,10213,"the reviewed September 3 client snapshot recipe count changed unexpectedly");
  assert.equal(Object.keys(bundled.items).length,7651,"the reviewed client snapshot plus 25 curated group-only material identities changed unexpectedly");
  assert.equal(bundled.resourceItems.length,4711,"the reviewed snapshot plus curated and derived substitution-member identities changed unexpectedly");
  const bundledFishGroup=bundled.substitutionGroupLookup.fish,bundledFreshFish=bundledFishGroup?.members.filter(member=>member.tier.startsWith("fresh-"))||[],bundledDriedFish=bundledFishGroup?.members.filter(member=>member.tier==="dried")||[];
  assert.ok(bundledFishGroup,"The installed-client snapshot must derive a generic Fish Group from its exact Drying mappings");
  assert.equal(bundledFishGroup.members.length,359,"The reviewed snapshot must expose all 180 fresh Fish identities and 179 unique dried outputs");
  assert.equal(bundledFreshFish.length,180,"Every exact fresh Fish input in the reviewed DRY mappings must remain selectable");
  assert.equal(bundledDriedFish.length,179,"Duplicate DRY outputs such as Dried Mullet must produce one exact resource identity");
  assert.ok(bundledFreshFish.every(member=>member.factor===2&&member.sourceWorth===2),"Fresh Fish of every client rarity must contribute one full two-unit cooking substitution");
  assert.ok(bundledDriedFish.every(member=>member.factor===1&&member.sourceWorth===1),"Every verified dried Fish must contribute one half-fish cooking unit");
  assert.equal(bundled.substitutionMemberByKey["8602:0"]?.groupId,"fish","Dried Clownfish from the supplied qty-89 icon must be a usable Fish Group member");
  assert.equal(bundled.substitutionMemberByKey["8635:0"]?.groupId,"fish","Dried Mackerel Pike from the supplied qty-89 icon must be a usable Fish Group member");
  assert.equal(bundled.substitutionMemberByKey["9321:0"],undefined,"Finished Carrot Confit must not enter the Fish Group or recipe-input catalog");
  assert.ok(bundled.recipesUsingKey["8602:0"].filter(entry=>entry.substitutionGroupId==="fish").every(entry=>entry.count===2),"Bundled Dried Clownfish usage must consistently show two dried fish per canonical fresh-fish input");
  assert.equal(core.recipeBookResourceCandidates(bundled,"Eltro Sea Crystal",12).length,70,"all exact same-name ingredient identities must remain selectable");
  assert.equal(core.recipeBookResourceCandidates(bundled,"756586",12)[0]?.itemId,"756586","ingredient item IDs must be searchable when client names are ambiguous");
  const potatoStew=bundled.recipes.find(recipe=>recipe.id==="recipe-9341-e1888a1a50c199ab"),potatoRequirement=core.recipeBookRecipeRequirements(potatoStew,{"7001:0":999},bundled).find(requirement=>requirement.candidateKey==="7003:0");
  assert.equal(potatoRequirement?.key,"7003:0","The current Chanterelle and Potato Stew recipe must retain its exact Potato requirement");
  assert.equal(potatoRequirement?.owned,0,"Wheat stock must not satisfy the current exact Potato requirement");
  const beer=bundled.recipes.find(recipe=>recipe.id==="recipe-9213-18484873a500e6fe"),qualityBeerStock={"7006:0":3,"9059:0":6,"9005:0":2,"9002:0":1};
  assert.equal(core.recipeBookRecipeCraftCount(beer,qualityBeerStock,bundled),1,"Three high-quality Wheat must safely cover one current generic Beer grain requirement at the conservative tier value");
  const ampleResources=Object.fromEntries(bundled.resourceItems.map(candidate=>[candidate.key,999999999999]));
  const reviewedAliases=Object.entries(bundled.substitutionCanonicalRecipeById).sort(([left],[right])=>left.localeCompare(right));
  assert.equal(JSON.stringify(reviewedAliases),JSON.stringify([
    ["recipe-566-5c5c1b8235e7782d","recipe-566-afff699b4d59d071"],["recipe-566-a81f259c9ed83df0","recipe-566-afff699b4d59d071"],["recipe-566-cc66c43f469b0276","recipe-566-afff699b4d59d071"],["recipe-566-f7a5068fdc86fa76","recipe-566-afff699b4d59d071"],
    ["recipe-569-0a8b655f7a02cb3e","recipe-569-f2c6a98dfd8018ff"],["recipe-569-0d9da151969e7aa8","recipe-569-f2c6a98dfd8018ff"],["recipe-569-2aa2c73496e28e93","recipe-569-f2c6a98dfd8018ff"],["recipe-569-3b3f162ac29964d1","recipe-569-f2c6a98dfd8018ff"],["recipe-569-bbe19e456b4d1a82","recipe-569-f2c6a98dfd8018ff"],["recipe-569-daaca9c94f9c47ee","recipe-569-f2c6a98dfd8018ff"],["recipe-569-ff0fdf20c6bed191","recipe-569-f2c6a98dfd8018ff"]
  ]),"Only the reviewed Grain Juice and Herbal Juice material variants should collapse into canonical pooled recipes");
  assert.equal(core.recipeBookCraftableRecipes(bundled,ampleResources).length,bundled.recipes.length-Object.keys(bundled.substitutionCanonicalRecipeById).length,"every distinct valid recipe must become craftable while equivalent substitution variants render once");
  assert.equal(core.recipeBookFilterRecipes(bundled,{query:"Wolf's Blood",mode:"ingredient"}).length,36,"Wolf's Blood must resolve to every current Wolf Blood recipe in the reviewed snapshot");
  assert.equal(payload.source.kind,"installed-black-desert-client","recipe facts must come from the installed game client");
  assert.equal(payload.source.locale,"en","the bundled catalog must use English client names");
  assert.equal(payload.generatedAtUtc,"2026-09-03T14:41:47.192Z","the reviewed bundle must retain the exact September 3 client snapshot time");
  assert.deepEqual(payload.source.extractor,{
    repository:"https://github.com/iDevelopThings/bdo-data-extractor",
    version:"v0.1.9",
    commit:"5bf11bd7bc60dcbb6126be34bf3d76633abdd8b2",
    compatibility:"2026-09 client item layout"
  },"the catalog must retain reproducible extractor provenance for the current client layout");
  assert.deepEqual(payload.source.officialPatch,{
    publisher:"Pearl Abyss",
    title:"Patch Notes - September 3, 2026",
    publishedDate:"2026-09-03",
    url:officialPatchUrl
  },"official recipe overlays must cite the exact NA/EU patch used for review");
  assert.equal(payload.source.files.itemsSha256,"c9fcc68a1ee64e32efac814dae9189bd1e1adb0636866622b85a4b205774caf0","item facts must come from the reviewed September 3 extraction");
  assert.equal(payload.source.files.recipesSha256,"24d62be02237c70cfc8ef9ad8cb3b950e784316430fd97b30aafe9fcb8ae55ac","recipe facts must come from the reviewed September 3 extraction");
  assert.equal(payload.source.files.archive.sha256,"8ed5ad63993ed499120ff9509fbc644d3da58ea36c383bd04daa319e6ead11c9","the installed archive provenance must remain reproducible");
  assert.equal(payload.source.files.localization.sha256,"4d4874f7b9bfd1e9708ecf4bda62bf4f4fcd9afb1c2e36228ab0253318d59438","the installed English localization provenance must remain reproducible");
  assert.equal(payload.filters.excludesEventPrefixedItems,true);
  assert.equal(payload.filters.excludesRetiredGhostItems,true);
  assert.equal(payload.filters.excludesLegacyImperialBoxes,true);
  assert.equal(payload.filters.excludesClientRetiredItems,true);
  assert.equal(payload.filters.excludesOfficialPatchRetiredItems,true);
  assert.equal(payload.filters.excludesClientUnavailableItems,true);
  assert.ok((payload.counts.exclusions["event-or-retired-output"]||0)>0,"event/retired outputs must be actively excluded");
  assert.ok((payload.counts.exclusions["retired-output-ghost"]||0)>0,"retired ghost outputs must be actively excluded");
  assert.equal(payload.counts.exclusions["legacy-imperial-box"],50,"all raw pre-rework Imperial box rows must be intentionally classified");
  assert.ok(payload.counts.exclusions["client-retired-output"]>0&&payload.counts.exclusions["client-retired-ingredient"]>0,"client-retired materials must be excluded as outputs and ingredients");
  assert.ok(payload.counts.exclusions["client-unavailable-output"]>0&&payload.counts.exclusions["client-unavailable-ingredient"]>0,"unavailable fossil recipes must be excluded as outputs and ingredients");

  const elionRecipes=recipesForOutput(17566);
  assert.equal(payload.items["17566"]?.name,"Elion's Tear","Elion's Tear must remain discoverable by its current client name");
  assert.equal(elionRecipes.length,1,"the retired Mystical Spirit Powder formula must be replaced by one current Elion's Tear formula");
  assert.equal(elionRecipes[0].type,"SIMPLE_ALCHEMY");
  assert.deepEqual(sortedInputPairs(elionRecipes[0]),[[8042,1],[721002,50]],"Elion's Tear must use Tears of War x1 and Ancient Spirit Dust x50");
  assert.equal(elionRecipes[0].officialSource,officialPatchUrl,"the Elion's Tear overlay must retain its official source");

  const shardRecipes=recipesForOutput(44336);
  assert.equal(payload.items["44336"]?.name,"Alchemy Stone Shard");
  assert.equal(shardRecipes.length,3,"only the three current blue Spirit Stones should produce Alchemy Stone Shards");
  assert.deepEqual(shardRecipes.map(recipe=>Number(recipe.inputs[0]?.itemId)).sort((left,right)=>left-right),[45298,45300,45302],"Destruction, Guardian, and Life Spirit Stones must each have a shard recipe");
  for(const recipe of shardRecipes){
    assert.equal(recipe.type,"GRIND","Spirit Stones must be ground into Alchemy Stone Shards");
    assert.equal(recipe.inputs.length,1,"each shard formula must consume exactly one Spirit Stone identity");
    assert.equal(recipe.inputs[0].count,1,"each shard formula must consume one Spirit Stone");
    assert.equal(recipe.outputQuantityMin,10,"Spirit Stone grinding must retain the official minimum yield");
    assert.equal(recipe.outputQuantityMax,18,"Spirit Stone grinding must retain the official maximum yield");
    assert.equal(recipe.outputQuantityNote,"Varies with Processing Mastery");
    assert.equal(recipe.officialSource,officialPatchUrl);
  }

  for(const [outputId,energyId] of [[56185,56191],[56186,56192],[56187,56193],[56188,56194]]){
    const breathRecipes=recipesForOutput(outputId);
    assert.equal(payload.items[String(outputId)]?.name,"Breath of All Creations");
    assert.equal(breathRecipes.length,1,`Breath of All Creations ${outputId} must have one current formula`);
    assert.equal(breathRecipes[0].type,"SIMPLE_ALCHEMY");
    assert.deepEqual(sortedInputPairs(breathRecipes[0]),[[6603,20],[energyId,1],[721002,10]].sort((left,right)=>left[0]-right[0]),"Breath of All Creations must use Energy x1, Oil of Fortitude x20, and Ancient Spirit Dust x10");
    assert.ok(!breathRecipes[0].inputs.some(input=>Number(input.itemId)===4924),"Mystical Spirit Powder must not remain in a Breath of All Creations formula");
  }

  for(const [heartId,heartName,blueStoneId,blueStoneName] of [
    [45503,"Khan's Heart: Destruction",45298,"Destruction Spirit Stone"],
    [45513,"Khan's Heart: Protection",45300,"Guardian Spirit Stone"],
    [45514,"Khan's Heart: Life",45302,"Life Spirit Stone"]
  ]){
    assert.equal(payload.items[String(blueStoneId)]?.name,blueStoneName);
    assert.equal(payload.items[String(blueStoneId)]?.grade,2,`${blueStoneName} must be the current blue-grade identity`);
    const heartRecipes=recipesForOutput(heartId);
    assert.equal(payload.items[String(heartId)]?.name,heartName);
    assert.equal(heartRecipes.filter(recipe=>recipe.inputs.some(input=>Number(input.itemId)===blueStoneId)).length,2,`${heartName} must retain both current formulas that use its blue Spirit Stone`);
  }

  assert.equal(payload.items["821469"]?.name,"Evergreen Shard");
  assert.equal(payload.items["933601"]?.name,"Evergreen Orb");
  const evergreenShardRecipes=recipesForOutput(821469),evergreenOrbRecipes=recipesForOutput(933601);
  assert.equal(evergreenShardRecipes.length,2,"Evergreen Shard must support its Heating formula and Orb conversion");
  const evergreenHeating=evergreenShardRecipes.find(recipe=>recipe.type==="HEAT");
  const evergreenFromOrb=evergreenShardRecipes.find(recipe=>recipe.type==="SIMPLE_ALCHEMY");
  assert.ok(evergreenHeating&&evergreenFromOrb,"both Evergreen Shard processing methods must be present");
  assert.deepEqual(sortedInputPairs(evergreenHeating),[[5960,30],[766108,500],[820979,1]].sort((left,right)=>left[0]-right[0]),"Evergreen Shard Heating must use Trace of Nature x30, Magical Lightstone Crystal x500, and Essence of Dawn x1");
  assert.deepEqual(sortedInputPairs(evergreenFromOrb),[[933601,1]],"an unenhanced Evergreen Orb must convert back to one Evergreen Shard");
  assert.equal(evergreenOrbRecipes.length,1,"Evergreen Orb must have one Simple Alchemy formula");
  assert.equal(evergreenOrbRecipes[0].type,"SIMPLE_ALCHEMY");
  assert.deepEqual(sortedInputPairs(evergreenOrbRecipes[0]),[[821469,1]],"one Evergreen Shard must produce one Evergreen Orb");

  const knotDefinitions=[
    [860358,"Bear Necessities Knot"],[860359,"Agris Knot"],[860360,"Pavilla Knot"],
    [860361,"Venecil (Karki) Knot"],[860362,"Canape Knot"],[860363,"Venia Knot"]
  ];
  assert.equal(payload.items["860357"]?.name,"Merv's Silver Needle");
  assert.equal(recipesUsingItem(860357).length,192,"the client snapshot must retain all 32 class formulas for each of the six functional-costume Knots");
  for(const [knotId,knotName] of knotDefinitions){
    const knotRecipes=recipesForOutput(knotId);
    assert.equal(payload.items[String(knotId)]?.name,knotName);
    assert.equal(knotRecipes.length,32,`${knotName} must retain one formula for every current class identity`);
    assert.ok(knotRecipes.every(recipe=>recipe.type==="CRAFT"&&recipe.inputs.some(input=>Number(input.itemId)===860357&&input.count===1)),`${knotName} formulas must use Merv's Silver Needle x1`);
  }

  const seafoodCron=payload.items["9691"];
  assert.equal(seafoodCron?.name,"Seafood Cron Meal");
  assert.match(seafoodCron.description,/Weight Limit \+250 LT/,"Seafood Cron Meal must show its increased Weight Limit");
  assert.doesNotMatch(seafoodCron.description,/Weight Limit \+100 LT/,"the pre-patch Seafood Cron Meal Weight Limit must not remain");

  const greatOceanOil=payload.items["9727"];
  assert.equal(greatOceanOil?.name,"Great Ocean Oil","Blue Whale Oil must use its current renamed identity");
  assert.equal(Object.values(payload.items).filter(item=>item.name==="Blue Whale Oil").length,0,"the retired Blue Whale Oil name must not remain in the catalog");
  assert.match(greatOceanOil.description,/Defeat sea monsters or Khan/i,"Great Ocean Oil must mention its current Khan source");
  assert.match(greatOceanOil.description,/World Boss Vell Reward Bundle/i,"Great Ocean Oil must mention its current Vell source");
  assert.equal(recipesUsingItem(9727).length,9,"all reviewed Great Ocean Oil ingredient formulas must remain discoverable");

  const functionalKnotIds=new Set(knotDefinitions.map(([id])=>id));
  const blankDescriptionItems=Object.entries(payload.items).filter(([,item])=>!item.description.trim());
  assert.equal(blankDescriptionItems.length,359,"only the reviewed functional-costume inputs may lack client description text");
  const retiredName=/^\[(?:event|gm|test|unused|expired|removed|deprecated)\]|\b(?:obsolete|deprecated|dummy item|test item|unused item|removed item|expired item|do not use)\b/i;
  for(const [id,item] of Object.entries(payload.items)){
    assert.doesNotMatch(item.name,retiredName,`retired/event item leaked into the runtime catalog: ${id} ${item.name}`);
    assert.equal(typeof item.description,"string",`item ${id} must include a local client description`);
    if(!item.description.trim()){
      assert.match(item.name,/^\[[^\]]+\] (?:Bear Necessities|Agris|Pavilla|Venecil|Karki|Canape|Venia)\b/,`blank client description is only allowed for a functional-costume Knot ingredient: ${id} ${item.name}`);
      const itemUses=recipesUsingItem(id);
      assert.ok(itemUses.length>0&&itemUses.every(recipe=>functionalKnotIds.has(Number(recipe.outputId))),`blank-description item ${id} must be used only by a functional-costume Knot formula`);
    }
    assert.doesNotMatch(item.description,/<PA(?:Color0x[0-9a-f]+|OldColor)>/i,`item ${id} leaked client color markup`);
    assert.doesNotMatch(item.description,/\{TextBind:[^}]+\}/i,`item ${id} leaked an internal client text placeholder`);
    assert.equal(Object.hasOwn(item,"sourceIcon"),false,"client archive paths must not leak into the runtime dataset");
    assert.ok(core.recipeBookSafeIconPath(item.icon),`item ${id} must use a safe local icon path`);
  }
  const legacyImperialIds=new Set([
    ...Array.from({length:21},(_,index)=>9801+index),
    ...Array.from({length:19},(_,index)=>9823+index),
    9848
  ]);
  const clientRetiredIds=new Set([
    5201,5202,5203,5204,5207,5208,5209,5210,5211,5212,5213,5214,5215,5216,5217,
    5951,5952,5953,5954,5955,5956,5957,5958,5959,5961,5962,5963,16002,16005,757130
  ]);
  const officialPatchRetiredIdSet=new Set(officialPatchRetiredIds);
  const referencedItems=new Set(),signatures=new Set();
  for(const recipe of payload.recipes){
    assert.ok(!legacyImperialIds.has(Number(recipe.outputId)),`legacy Imperial box leaked into the catalog: ${recipe.outputId}`);
    assert.ok(!clientRetiredIds.has(Number(recipe.outputId)),`retired client output leaked into the catalog: ${recipe.outputId}`);
    assert.ok(!officialPatchRetiredIdSet.has(Number(recipe.outputId)),`September 3 retired output leaked into the catalog: ${recipe.outputId}`);
    referencedItems.add(String(recipe.outputId));
    const ingredients=recipe.inputs.map(input=>{
      assert.ok(!clientRetiredIds.has(Number(input.itemId)),`retired client ingredient leaked into the catalog: ${input.itemId}`);
      assert.ok(!officialPatchRetiredIdSet.has(Number(input.itemId)),`September 3 retired ingredient leaked into the catalog: ${input.itemId}`);
      referencedItems.add(String(input.itemId));
      return `${input.enhancement||0}:${input.itemId}x${input.count}`;
    }).sort();
    const outputRange=recipe.outputQuantityMin||recipe.outputQuantityMax?`yield:${recipe.outputQuantityMin||1}-${recipe.outputQuantityMax||recipe.outputQuantityMin||1}`:"";
    const signature=[`${recipe.outputEnhancement||0}:${recipe.outputId}`,recipe.type,recipe.station||"",outputRange,...ingredients].join("|");
    assert.ok(!signatures.has(signature),`duplicate recipe leaked into the catalog: ${recipe.id}`);
    signatures.add(signature);
  }
  for(const id of legacyImperialIds)assert.equal(Object.hasOwn(payload.items,String(id)),false,`legacy Imperial item ${id} must not be packaged`);
  for(const id of clientRetiredIds)assert.equal(Object.hasOwn(payload.items,String(id)),false,`retired/unavailable item ${id} must not be packaged`);
  for(const id of officialPatchRetiredIdSet)assert.equal(Object.hasOwn(payload.items,String(id)),false,`September 3 retired item ${id} must not be packaged`);
  for(const id of [5205,5206,5960])assert.ok(Object.hasOwn(payload.items,String(id)),`current simplified replacement item ${id} must remain packaged`);
  for(const id of [9851,9852,9853,9854,9855,9856,9866,9867,9868,9869,9870,9871])assert.ok(payload.recipes.some(recipe=>Number(recipe.outputId)===id),`current Imperial box ${id} must retain recipes`);
  assert.ok(payload.recipes.some(recipe=>Number(recipe.outputId)===5868),"the active Professional's Satisfying Dinner Meal recipe must remain");
  assert.deepEqual([...referencedItems].sort((a,b)=>Number(a)-Number(b)),Object.keys(payload.items).sort((a,b)=>Number(a)-Number(b)),"runtime items must be exactly the recipe-reference union");
  assert.equal(manifest.icons.itemAliases,Object.keys(payload.items).length);
  assert.equal(manifest.icons.itemAliases,7626,"every reviewed runtime item must resolve to a cached icon or an explicit fallback");
  assert.equal(manifest.icons.clientSourceFiles,4362,"the reviewed client icon-source count changed unexpectedly");
  assert.equal(manifest.icons.fallbackItems.length,payload.counts.fallbackIcons);
  assert.equal(manifest.icons.uniqueFiles,payload.counts.uniqueIcons+1,"the manifest must contain all WebPs plus the SVG fallback");
  assert.equal(payload.counts.uniqueIcons,3987,"the reviewed lossless content-deduplicated icon count changed unexpectedly");
  assert.equal(payload.counts.fallbackIcons,31,"only the reviewed missing or non-square client artwork may use the fallback");
  assert.equal(manifest.icons.uniqueFiles,3988,"the reviewed bundle must contain 3,987 lossless WebPs plus the SVG fallback");
  assert.equal(manifest.icons.bytes,16840406,"the reviewed native lossless icon payload changed unexpectedly");
  assert.equal(manifest.icons.encoding,"lossless","cached client icons must not be degraded by lossy WebP compression");
  const expectedFallbackIds=[2018,2020,2110,2218,2220,2318,2320,2710,4017,4098,14019,14020,14022,16901,16902,25623,25624,25625,27993,28066,28245,28246,28247,28248,28249,28250,28251,28252,28253,28346,56001];
  const nonSquareFallbackIds=new Set([4017,4098,14019,14020,14022,16901,16902,56001]);
  assert.deepEqual(manifest.icons.fallbackItems.map(item=>item.id).sort((a,b)=>a-b),expectedFallbackIds,"only the reviewed missing or non-square client artwork may use the fallback");
  for(const item of manifest.icons.fallbackItems){
    assert.equal(item.reason,nonSquareFallbackIds.has(item.id)?"non-square-client-artwork":"missing-client-artwork",`fallback reason changed for item ${item.id}`);
  }
  for(const item of manifest.icons.fallbackItems)assert.equal(payload.items[String(item.id)]?.icon,"icons/item-fallback.svg",`fallback item ${item.id} must not retain non-square preview artwork`);
  assert.ok(manifest.icons.clientSourceFiles>=payload.counts.uniqueIcons,"client-path deduplication cannot create extra physical icons");
  const manifestedPaths=new Set();
  const bundleRootPrefix=`${path.resolve(bundleRoot)}${path.sep}`;
  const webpChunkTypes=bytes=>{
    assert.ok(bytes.length>=20,"WebP artwork must contain a complete RIFF chunk");
    assert.equal(bytes.readUInt32LE(4)+8,bytes.length,"WebP RIFF size must cover the exact cached file");
    const chunks=[];
    let offset=12;
    while(offset+8<=bytes.length){
      const type=bytes.subarray(offset,offset+4).toString("ascii"),size=bytes.readUInt32LE(offset+4),end=offset+8+size;
      assert.ok(end<=bytes.length,`WebP ${type} chunk extends past its RIFF container`);
      chunks.push(type);
      offset=end+(size%2);
    }
    assert.equal(offset,bytes.length,"WebP RIFF chunks must consume the exact cached file");
    return chunks;
  };
  for(const entry of manifest.icons.files){
    assert.match(entry.path,/^icons\/(?:items\/[a-f0-9]{64}\.webp|item-fallback\.svg)$/,"manifest icon paths must be content-addressed or the fixed fallback");
    assert.ok(!manifestedPaths.has(entry.path),`duplicate manifest icon path: ${entry.path}`);
    manifestedPaths.add(entry.path);
    const file=path.resolve(bundleRoot,...entry.path.split("/"));
    assert.ok(file.startsWith(bundleRootPrefix),`manifest icon escaped its bundle: ${entry.path}`);
    const bytes=fs.readFileSync(file);
    assert.equal(bytes.length,entry.bytes,`icon byte count changed: ${entry.path}`);
    assert.equal(digest(bytes),entry.sha256,`icon digest changed: ${entry.path}`);
    if(entry.path.endsWith(".webp")){
      assert.equal(bytes.subarray(0,4).toString("ascii"),"RIFF",`icon is not RIFF WebP: ${entry.path}`);
      assert.equal(bytes.subarray(8,12).toString("ascii"),"WEBP",`icon is not WebP: ${entry.path}`);
      assert.equal(entry.encoding,"lossless",`icon must retain lossless client artwork: ${entry.path}`);
      const chunks=webpChunkTypes(bytes);
      assert.ok(chunks.includes("VP8L"),`icon must contain a lossless VP8L payload: ${entry.path}`);
      assert.ok(!chunks.includes("VP8 "),`icon must not contain a lossy VP8 payload: ${entry.path}`);
      assert.ok(entry.width>0&&entry.width===entry.height,`item artwork must be a square native icon, not preview art: ${entry.path}`);
    }
  }
  const walk=directory=>fs.readdirSync(directory,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?walk(path.join(directory,entry.name)):[path.relative(bundleRoot,path.join(directory,entry.name)).replaceAll(path.sep,"/")]);
  assert.deepEqual(walk(path.join(bundleRoot,"icons")).sort(),[...manifestedPaths].sort(),"the icon directory and manifest must contain exactly the same files");
  for(const [id,item] of Object.entries(payload.items))assert.ok(manifestedPaths.has(item.icon),`item ${id} references an unmanifested icon`);
  const notice=fs.readFileSync(noticePath,"utf8");
  assert.match(notice,/unofficial and is not affiliated with or endorsed by Pearl Abyss/i);
  assert.match(notice,/official Pearl Abyss September 3, 2026 patch overlay/i,"bundle notice must distinguish the cited official overlay from installed-client facts");
  assert.match(notice,/English item names, descriptions, and item icons/i,"bundle notice must identify locally extracted item metadata and artwork");
  assert.match(notice,/lossless WebP at its native client dimensions/i,"bundle notice must identify the cached artwork encoding and sizing policy");
  assert.match(notice,/No BDO Codex, BDOlytics, or Black Desert Foundry editorial content or artwork is bundled\./);
}

assert.match(html,/data-app-view="recipeBookView"[\s\S]*?<span class="navLabel">Recipe Book<\/span>/,"Recipe Book must be present in navigation");
assert.match(html,/<section id="recipeBookView" class="appView">/,"Recipe Book view must exist");
const modeMarkup=html.match(/<fieldset id="recipeBookSearchMode"[\s\S]*?<\/fieldset>/)?.[0]||"";
const radios=modeMarkup.match(/<input\s+type="radio"[^>]*>/g)||[];
assert.equal(radios.length,2,"Recipe Book must expose exactly two radio search modes");
assert.ok(radios.some(input=>/value="name"/.test(input))&&radios.some(input=>/value="ingredient"/.test(input)),"search modes must be name and ingredient");
assert.ok(radios.every(input=>/name="recipeBookMode"/.test(input)),"both mode radios must share an accessible group name");
const workspaceMarkup=html.match(/<nav class="recipeBookWorkspaceTabs"[\s\S]*?<\/nav>/)?.[0]||"";
const workspaceTabs=workspaceMarkup.match(/data-recipe-book-section="(?:catalog|resources|craftables)"/g)||[];
assert.equal(workspaceTabs.length,3,"Recipe Book must expose exactly three internal workspace tabs");
for(const iconClass of ["catalog","resources","craftables"]){
  assert.match(workspaceMarkup,new RegExp(`class="recipeBookTabIcon ${iconClass}"[^>]*aria-hidden="true"[\\s\\S]*?<svg viewBox="0 0 24 24" focusable="false">`),`${iconClass} tab must use an accessible inline SVG icon tile`);
}
assert.doesNotMatch(workspaceMarkup,/[⌕◇✦]/,"workspace tabs must not use small font glyphs as icons");
assert.match(html,/id="recipeBookResourcesPanel"[\s\S]*?id="recipeBookResourceForm"[\s\S]*?id="recipeBookResourceList"/,"My Resources must provide ingredient search, quantity entry, and an editable inventory");
assert.doesNotMatch(html,/id="recipeBookResourceSummary"/,"The removed material-stack/substitute-group summary pill must not return");
assert.doesNotMatch(js,/resourceSummary:document\.getElementById\("recipeBookResourceSummary"\)/,"The removed resource summary pill must not retain dormant controller wiring");
assert.doesNotMatch(html,/Quantities are saved locally on this PC\.?/i,"My Resources must not show the removed local-save sentence");
assert.match(html,/id="recipeBookCraftablesPanel"[\s\S]*?id="recipeBookCraftableGrid"/,"Craftables must provide its own results panel");
assert.match(html,/<\/section>\s*<div id="recipeBookItemTooltip" class="recipeBookItemTooltip" role="tooltip" hidden><\/div>[\s\S]*?<section id="dehkiaFuelView"/,"item tooltip must be one body-level portal outside the clipped Recipe Book view");
assert.match(html,/id="recipeBookSearchInput"[^>]*aria-label="Search recipes"/,"catalog search must have an explicit accessible name");
assert.match(html,/id="recipeBookCraftableSearch"[^>]*aria-label="Filter craftable recipes"/,"craftable search must have an explicit accessible name");
assert.doesNotMatch(html,/id="recipeBookCraftableGrid"[^>]*aria-live/,"full craftable cards must not be announced as one large live region");
assert.match(js,/fetch\(`\$\{RECIPE_BOOK_ASSET_ROOT\}recipes\.json`/,"catalog must be fetched lazily from the installed offline virtual host");
assert.match(js,/if\(viewId === "recipeBookView"\) initializeRecipeBook\(\)/,"view dispatcher must initialize Recipe Book lazily");
assert.match(js,/recipeBookView:"Assets\/CinematicBackgrounds\//,"Recipe Book must have a cinematic background hook");
assert.match(js,/loading="lazy" decoding="async"/,"recipe and ingredient images must load lazily");
assert.match(html,/data-app-view="recipeBookView"[^>]*>(?:(?!<\/button>)[\s\S])*?<use href="NavigationAssets\/nav-icons\.svg\?v=cartographers-brass-20260827#nav-icon-recipe-book"/,"navigation must use the shared book glyph");
assert.match(navigationSprite,/<symbol id="nav-icon-recipe-book" viewBox="0 0 64 64">/,"the shared navigation sprite must define the book glyph");
assert.match(css,/\.recipeBookGrid\{[^}]*grid-template-columns:repeat\(3[^}]*align-items:stretch/,"desktop result rows must stretch every card to an equal height");
assert.match(css,/\.recipeBookCard\{[^}]*width:100%;height:100%[^}]*display:flex;flex-direction:column/,"each Recipe Book card must fill its equal-height grid cell");
assert.match(css,/\.recipeBookCard>ul\{[^}]*flex:1 1 auto[^}]*align-content:start/,"short ingredient lists must fill their card without stretching individual ingredient rows");
assert.match(css,/\.recipeBookItemIcon img\{[^}]*width:auto;height:auto;max-width:100%;max-height:100%/,"item artwork must retain its natural dimensions instead of filling and upscaling its frame");
assert.match(css,/\.recipeBookItemIcon\.output img\{max-width:44px;max-height:44px\}/,"native 44px output icons must never be enlarged");
assert.match(css,/\.recipeBookItemIcon\.ingredient img\{max-width:34px;max-height:34px\}/,"ingredient icons must be downscaled rather than enlarged");
assert.match(js,/recipeBookIconDisplaySize\(image\.naturalWidth,image\.naturalHeight,wrap\.classList\.contains/,"loaded icons must be capped by their native dimensions");
assert.match(css,/\.recipeBookIconFallback\{[^}]*display:none/,"fallback glyphs must not contaminate successful transparent item artwork");
assert.match(css,/\.recipeBookSearchForm\{--recipe-book-control-height:44px;/,"Recipe Book controls must share one explicit height");
assert.match(css,/\.recipeBookModeToggle\{[^}]*height:var\(--recipe-book-control-height\)[^}]*padding:2px!important/,"search mode toggle must align with and fill the shared control row");
assert.match(css,/\.recipeBookModeToggle span\{[^}]*width:100%;height:100%/,"selected search-mode pills must fill their segment");
assert.match(css,/\.recipeBookSearchButton\{[^}]*height:var\(--recipe-book-control-height\)/,"Search button must match the search field height");
assert.match(css,/\.recipeBookFilterField\{[^}]*height:var\(--recipe-book-control-height\)/,"category selector must align with the shared control row");
assert.match(js,/counts\.uniqueIcons[\s\S]*?cached images/,"catalog status must report physical cached images rather than item aliases");
assert.match(js,/function recipeBookOutputYieldLabel\(recipe\)[\s\S]*?Yields \$\{amount\}/,"variable recipe yields must have a dedicated display formatter");
assert.match(js,/recipeBookCardMarkup\(recipe,tokens\)[\s\S]*?yieldLabel=recipeBookOutputYieldLabel\(recipe\)[\s\S]*?\$\{yieldLabel\?` · \$\{escapeHtml\(yieldLabel\)\}`:""\}/,"catalog cards must display variable recipe yields");
assert.match(js,/recipeBookCraftableCardMarkup\(entry\)[\s\S]*?yieldLabel=recipeBookOutputYieldLabel\(recipe\)[\s\S]*?\$\{yieldLabel\?` · \$\{escapeHtml\(yieldLabel\)\}`:""\}/,"craftable cards must display variable recipe yields");
assert.match(js,/persistSetting\(RECIPE_BOOK_RESOURCES_SETTING/,"My Resources must persist locally");
assert.match(js,/persistSetting\(RECIPE_BOOK_CRAFT_PLANS_SETTING/,"craft planner choices must persist locally");
assert.match(js,/aria-activedescendant/,"resource autocomplete must expose its keyboard-highlighted option");
const resourceRenderStart=js.indexOf("function recipeBookRenderResources"),resourceRenderEnd=js.indexOf("const RECIPE_BOOK_OCR_MAX_FILES",resourceRenderStart),resourceRenderSource=js.slice(resourceRenderStart,resourceRenderEnd);
assert.ok(resourceRenderStart>=0&&resourceRenderEnd>resourceRenderStart,"My Resources renderer must remain discoverable for grouped-card regression checks");
assert.match(resourceRenderSource,/recipeBookResourceInventoryRows\(recipeBookState\.data,recipeBookState\.resources\)/,"My Resources must render the projected inventory rows rather than one duplicate card per substitute");
assert.match(resourceRenderSource,/class="[^"]*recipeBookResourceGroupCard[^"]*"[^>]*data-resource-group=/,"Each projected substitution group must render as one identifiable group card");
assert.match(resourceRenderSource,/row\.members\.slice\(0,6\)\.map\([\s\S]*?class="recipeBookResourceGroupIcon"[\s\S]*?recipeBookIconMarkup/,"A group card must render a bounded stack of its tracked material icons");
assert.match(resourceRenderSource,/class="recipeBookResourceGroupTotals"[\s\S]*?data-resource-group-raw[\s\S]*?row\.rawTotal[\s\S]*?data-resource-group-equivalent[\s\S]*?row\.equivalentTotal/,"A group card must show its literal raw total alongside its normalized recipe-unit total");
assert.match(resourceRenderSource,/Recipe units\$\{row\.weighted\?"":" \(1:1\)"\}/,"The recipe-unit display must identify genuinely one-to-one groups without hiding weighted totals");
assert.match(resourceRenderSource,/<details class="recipeBookResourceGroupDetails"[^>]*>[\s\S]*?class="recipeBookResourceGroupMembers"/,"Grouped inventory must keep member-level quantities in an inspectable details section");
assert.match(resourceRenderSource,/const memberMarkup=[\s\S]*?data-resource-quantity="\$\{escapeHtml\(candidate\.key\)\}"[\s\S]*?data-resource-remove="\$\{escapeHtml\(candidate\.key\)\}"/,"The shared exact-member markup must keep quantity editing and removal keyed to the member identity");
assert.match(resourceRenderSource,/factor=1[\s\S]*?recipeBookResourceFactor[\s\S]*?1 item = \$\{recipeBookFormatCount\(factor\)\} recipe units/,"Weighted group members must explain their physical-item to recipe-unit conversion");
assert.match(resourceRenderSource,/row\.members\.map\(member=>memberMarkup\(member,"recipeBookResourceGroupMember"\)\)/,"Every grouped member, including icons beyond the bounded header stack, must render in the editable details list");
assert.match(css,/Unified complete form controls:[\s\S]*?clip-path:none!important;[\s\S]*?border-radius:10px!important|Unified complete form controls:[\s\S]*?border-radius:10px!important;[\s\S]*?clip-path:none!important;/,"all themed form controls must use complete rounded boxes rather than cropped silhouettes");
const themeAssetInputRule=css.match(/body\[data-style\]:not\(\[data-style="custom"\]\) :is\([^\n]+\) \{ background-image:var\(--asset-input\)!important;/)?.[0]||"";
assert.ok(themeAssetInputRule,"theme input artwork rule must remain discoverable");
assert.doesNotMatch(themeAssetInputRule,/portraitPathValue/,"Face Texture path display must never inherit pointed theme input artwork");
assert.match(css,/body\[data-style\] #portraitView \.portraitPathValue\{[^}]*border-radius:10px!important;[^}]*clip-path:none!important;[^}]*background-image:[^}]*!important/ ,"Face Texture path display must use a complete theme-independent field");

assert.match(css,/\.recipeBookWorkspaceTabs button\{[^}]*min-height:56px/ ,"Recipe Book workspace tabs must be large enough to scan and click");
assert.match(css,/\.recipeBookWorkspaceTabs \.recipeBookTabIcon\{[^}]*width:34px;height:34px/ ,"Recipe Book workspace icon tiles must be prominent");
for(const [iconClass,color] of [["catalog","#22d3ee"],["resources","#fbbf24"],["craftables","#34d399"]])assert.match(css,new RegExp(`\\.recipeBookWorkspaceTabs \\.recipeBookTabIcon\\.${iconClass}\\{color:${color}\\}`),`${iconClass} tab must keep its own vibrant color`);
for(const className of ["recipeBookResourceName","recipeBookItemId","recipeBookUsedIn","recipeBookStoredState"])assert.match(js,new RegExp(`class="${className}"`),`${className} must be independently styled`);
for(const className of ["recipeBookIngredientPer","recipeBookOwnedAmount","recipeBookConsumedAmount"])assert.match(js,new RegExp(`class="${className}"`),`${className} must be independently styled in Craftables`);
assert.match(css,/#recipeBookView \.recipeBookResourceName\{[^}]*font-size:13px/ ,"resource names must be clearly larger");
assert.match(css,/#recipeBookView \.recipeBookResourceMeta\{[^}]*font-size:10\.5px/ ,"resource metadata must be legible");
for(const selector of [".recipeBookResourceGroupCard{",".recipeBookResourceGroupIcons",".recipeBookResourceGroupTotals",".recipeBookResourceGroupDetails",".recipeBookResourceGroupMembers",".recipeBookResourceGroupMember"]){
  assert.ok(css.includes(selector),`Grouped inventory styling is missing ${selector}`);
}
assert.match(css,/body\[data-mode="light"\] #recipeBookView,[\s\S]*?--rb-group-title:#4c1d95;[\s\S]*?--rb-group-value:#0e7490;/,"Light Recipe Book themes must use dark, readable group title and total colors");
assert.match(js,/addEventListener\("focusin",event=>\{const target=event\.target\.closest\("\[data-recipe-book-item-key\]"\)[\s\S]*?else if\(interactive\)recipeBookHideTooltip\(\)/,"Focusing a nested quantity or remove control must dismiss an item tooltip instead of covering the editor");
assert.match(css,/\.recipeBookCraftableGrid \.recipeBookIngredientCopy strong\{[^}]*font-size:12px/ ,"craftable ingredient names must be larger");
assert.match(css,/\.recipeBookIngredientStock \.recipeBookOwnedAmount\{[^}]*font-size:12px/ ,"owned material totals must be larger");

const plannerStart=js.indexOf("function recipeBookUpdateCraftPlanner");
const plannerEnd=js.indexOf("function recipeBookRenderCraftables",plannerStart);
const plannerSource=js.slice(plannerStart,plannerEnd);
assert.ok(plannerStart>=0&&plannerEnd>plannerStart,"craft planner update routine must exist");
assert.match(js,/data-craft-plan-range[\s\S]*?data-craft-plan-number/ ,"each craftable card must provide a smooth slider and exact batch input");
assert.match(plannerSource,/data-craft-used[\s\S]*?data-craft-remaining/ ,"slider changes must update used and remaining material totals");
assert.doesNotMatch(plannerSource,/recipeBookRenderCraftables/,"slider input must update its card in place instead of rerendering the full grid");
assert.match(css,/input\[type="range"\]::\-webkit-slider-runnable-track\{[^}]*--craft-progress/ ,"craft planner slider must render a smooth progress track");
assert.match(css,/input\[type="range"\]::\-webkit-slider-thumb\{[^}]*width:20px;height:20px/ ,"craft planner slider must provide a clear draggable thumb");

const resetPalette={daily:"#22d3ee",nodewar:"#ef4444",imperial:"#fbbf24",bsa:"#f472b6",agris:"#4ade80",barter:"#fb923c",trading:"#a78bfa"};
for(const [resetId,color] of Object.entries(resetPalette)){
  if(resetId==="nodewar")assert.match(css,/\.resetTimerCard\[data-reset-id="nodewar"\]\{--reset-accent:var\(--node-war-accent\)\}/,"nodewar reset timer must consume the shared Node War accent");
  else assert.match(css,new RegExp(`\\.resetTimerCard\\[data-reset-id="${resetId}"\\]\\{--reset-accent:${color}\\}`),`${resetId} reset timer must have its own vibrant color`);
}
assert.match(css,/\.resetTimersShell\{--node-war-accent:#ef4444;/,"shared Node War accent must remain vibrant red");
assert.equal(new Set(Object.values(resetPalette)).size,7,"all timer accents must be distinct");
assert.match(css,/\.resetTimerValue\{color:var\(--reset-value\)/ ,"reset countdown digits must consume the semantic card color");
assert.match(css,/body\[data-mode="light"\] \.resetTimerCard[\s\S]*?--reset-value:/ ,"reset timer colors must retain contrast in light mode");

assert.match(js,/function recipeBookItemUsage\(/,"item usage must be derived from the bundled recipe graph");
assert.match(js,/data-recipe-book-item-key/,"visible output and ingredient targets must opt into item information");
assert.match(js,/addEventListener\("pointerover"[\s\S]*?addEventListener\("focusin"[\s\S]*?event\.key==="Escape"/,"item information must support hover, keyboard focus, and Escape dismissal");
assert.match(js,/usage\.outputs\.map[\s\S]*?remainingOutputCount/,"item information must cap output previews and report additional uses");
assert.match(css,/\.recipeBookItemTooltip\{[^}]*position:fixed;z-index:1900[^}]*pointer-events:none/,"item information must render above, rather than inside, clipped cards");
assert.match(css,/\.recipeBookTooltipDescription\{[^}]*-webkit-line-clamp:7/,"long client descriptions must remain bounded inside the tooltip");
assert.match(css,/body\[data-motion="reduced"\] \.recipeBookItemTooltip\{transition:none!important\}/,"item tooltip motion must respect reduced-motion preferences");
const tooltipStart=js.indexOf("function recipeBookTooltipMarkup");
const tooltipEnd=js.indexOf("function recipeBookPositionTooltip",tooltipStart);
assert.ok(tooltipStart>=0&&tooltipEnd>tooltipStart,"item tooltip implementation must remain discoverable for regression checks");
const tooltipSource=js.slice(tooltipStart,tooltipEnd);
assert.match(tooltipSource,/const usageSection=usage\.recipeCount\?[\s\S]*?<strong>Used to craft<\/strong>[\s\S]*?:""/,"recipe relationships must appear only when the item is directly used as an ingredient");
assert.doesNotMatch(tooltipSource,/No direct ingredient use|<strong>Recipe usage<\/strong>/,"output-only items must not show a redundant empty usage section");
assert.doesNotMatch(tooltipSource,/https?:\/\/(?:bdocodex|bdolytics)/i,"item information must not depend on third-party sites");

console.log("Recipe Book frontend tests passed.");
