/* Current live-game corrections layered over the historical grind-spot snapshots. */
(()=>{
  const corrections=new Map([
    [4,{players:"1"}],
    [149,{ap:280,dp:350}],
    [150,{ap:250,dp:320}],
    [167,{ap:340}],
    [169,{name:"Orzekea",zone:"Atoraxxion",type:"normal"}],
    [908,{name:"Sycraia Ruins (Lower Zone)"}],
    [911,{ap:370,dp:440,players:"3"}],
    [912,{ap:350,dp:427,players:"3"}]
  ]);
  // Live NA/EU loot audit: September 3 client Monster Info + official patch notes.
  // August 27 reclassification: https://www.naeu.playblackdesert.com/en-US/News/Detail?groupContentNo=10514
  // August 13 Inner Edania rewards: https://www.naeu.playblackdesert.com/en-US/News/Detail?groupContentNo=10451
  // Evidence and client identity anchors: tests/fixtures/grind-loot-client-20260903.json.
  // Monster Info is not exhaustive: only explicit patch removals and replaced
  // group placeholders are removed; unlisted named loot is left intact.
  const normalizeName=value=>String(value||"").normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/g,"");
  const formerHighestTier=new Set([905,907,908]);
  const removedHighestTierNames=new Set([
    "Refined Origin of Hunger",
    "Refined Essence of Devouring",
    "Corrupt Oil of Immortality",
    "Crimson Primordial Pigment - Sovereign",
    "Violet Primordial Pigment - Sovereign",
    "Violet Primordial Pigment - Edana",
    "Sunset Primordial Pigment - Edana",
    "Crimson Primordial Luster - Sovereign",
    "Violet Primordial Luster - Sovereign",
    "Violet Primordial Luster - Edana",
    "Sunset Primordial Luster - Edana"
  ].map(normalizeName));
  const morningLight=new Set([165,166,167,168]);
  const specificDeboreka=new Set([901,902]);
  const specificArtifacts=new Set([908,911,912]);
  const addedItems={
    "11653":{"id":"11653","name":"Deboreka Necklace","grade":3,"icon":"Assets/GrindTracker/icons-clean/item-11653.png","isTrash":false},
    "11882":{"id":"11882","name":"Deboreka Earring","grade":3,"icon":"Assets/GrindTracker/icons-clean/item-11882.png","isTrash":false},
    "12094":{"id":"12094","name":"Deboreka Ring","grade":3,"icon":"Assets/GrindTracker/icons-clean/item-12094.png","isTrash":false},
    "12276":{"id":"12276","name":"Deboreka Belt","grade":3,"icon":"Assets/GrindTracker/icons-clean/item-12276.png","isTrash":false},
    "16001":{"id":"16001","name":"Black Stone","grade":4,"icon":"Assets/GrindTracker/icons-clean/item-16001.png","isTrash":false},
    "40383":{"id":"40383","name":"Manshaum Voodoo Doll","grade":1,"icon":"Assets/GrindTracker/icons-clean/item-40383.png","isTrash":false},
    "44270":{"id":"44270","name":"Al Yurad's Ring Piece","grade":3,"icon":"Assets/GrindTracker/icons-clean/custom-al-yurads-ring-piece.png","isTrash":false},
    "44311":{"id":"44311","name":"Tree Spirit Stone Fragment","grade":0,"icon":"Assets/GrindTracker/icons-clean/item-44311.png","isTrash":false},
    "50807":{"id":"50807","name":"Pure Forest Breath","grade":1,"icon":"Assets/GrindTracker/icons-clean/item-50807.png","isTrash":false},
    "66946":{"id":"66946","name":"Golden Pig King Summon Scroll","grade":4,"icon":"Assets/GrindTracker/icons-clean/item-66946.webp","isTrash":false},
    "721002":{"id":"721002","name":"Ancient Spirit Dust","grade":1,"icon":"Assets/GrindTracker/icons-clean/item-721002.png","isTrash":false},
    "721003":{"id":"721003","name":"Caphras Stone","grade":2,"icon":"Assets/GrindTracker/icons-clean/item-721003.png","isTrash":false},
    "735302":{"id":"735302","name":"Kehelle's Artifact - Max Stamina","grade":3,"icon":"Assets/GrindTracker/icons-clean/item-735302.webp","isTrash":false},
    "748022":{"id":"748022","name":"Dehkia's Artifact - All Evasion","grade":4,"icon":"Assets/GrindTracker/icons-clean/item-748022.png","isTrash":false},
    "767293":{"id":"767293","name":"Crimson Primordial Pigment - Sovereign","grade":4,"icon":"Assets/GrindTracker/icons-clean/custom-edania-crimson-primordial-pigment-sovereign.png","isTrash":false},
    "767294":{"id":"767294","name":"Violet Primordial Pigment - Sovereign","grade":4,"icon":"Assets/GrindTracker/icons-clean/custom-edania-violet-primordial-pigment-sovereign.png","isTrash":false},
    "767296":{"id":"767296","name":"Violet Primordial Pigment - Edana","grade":4,"icon":"Assets/GrindTracker/icons-clean/custom-edania-violet-primordial-pigment-edana.png","isTrash":false},
    "767337":{"id":"767337","name":"Refined Origin of Hunger","grade":3,"icon":"Assets/GrindTracker/icons-clean/custom-edania-refined-origin-of-hunger.png","isTrash":false},
    "767338":{"id":"767338","name":"Refined Essence of Devouring","grade":3,"icon":"Assets/GrindTracker/icons-clean/custom-edania-refined-essence-of-devouring.png","isTrash":false},
    "767353":{"id":"767353","name":"Sunset Primordial Pigment - Edana","grade":4,"icon":"Assets/GrindTracker/icons-clean/official-inner-edania-sunset-pigment-edana.png","isTrash":false},
    "768160":{"id":"768160","name":"Sealed Black Magic Crystal","grade":3,"icon":"Assets/GrindTracker/icons-clean/item-768160.png","isTrash":false},
    "821341":{"id":"821341","name":"Crimson Primordial Luster - Sovereign","grade":3,"icon":"Assets/GrindTracker/icons-clean/custom-edania-crimson-primordial-luster-sovereign.png","isTrash":false},
    "821342":{"id":"821342","name":"Violet Primordial Luster - Sovereign","grade":3,"icon":"Assets/GrindTracker/icons-clean/custom-edania-violet-primordial-luster-sovereign.png","isTrash":false},
    "821343":{"id":"821343","name":"Violet Primordial Luster - Edana","grade":3,"icon":"Assets/GrindTracker/icons-clean/custom-edania-violet-primordial-luster-edana.png","isTrash":false},
    "821459":{"id":"821459","name":"Sunset Primordial Luster - Edana","grade":3,"icon":"Assets/GrindTracker/icons-clean/official-inner-edania-sunset-luster-edana.png","isTrash":false}
  };
  const lootAdditions=new Map([
    [168,["66946"]],
    [901,["721002","16001","721003","11653","11882","12276","12094"]],
    [902,["721002","16001","721003","11653","11882","12276","12094"]],
    [905,["16001","768160"]],
    [908,["735302","44270"]],
    [911,["748022","50807"]],
    [912,["50807","40383","44311"]],
    [916,["767294","821459","767353"]],
    [917,["767293","767294","767296","821341","821342","821343","767337","767338","16001","721002","721003"]],
    [918,["16001","767293","767294","767296","821341","821342","821343","767337","767338","721002","721003"]],
    [919,["767293","767294","767296","821459","821342","821343","821341","767337","767338","768160","16001","721002","721003"]],
    [920,["767293","767294","767296","821341","821342","821343","767337","767338","721002","16001","721003"]],
    [921,["767293","767294","767296","821341","821342","821343","767337","767338","16001","721002","721003"]],
    [922,["767293","767294","767296"]]
  ]);
  const correctLoot=spot=>{
    const id=Number(spot.id);
    if(!formerHighestTier.has(id)&&!morningLight.has(id)&&!lootAdditions.has(id)) return spot;
    const drops=spot.drops.filter(drop=>{
      const name=normalizeName(drop.name);
      if(formerHighestTier.has(id)&&removedHighestTierNames.has(name)) return false;
      if(morningLight.has(id)&&name===normalizeName("Faint Origin of Dark Hunger")) return false;
      if(specificDeboreka.has(id)&&name===normalizeName("Deboreka Accessories")) return false;
      if(specificArtifacts.has(id)&&name===normalizeName("Any Artifact")) return false;
      return true;
    });
    const ids=new Set(drops.map(drop=>String(drop.id)));
    const names=new Set(drops.map(drop=>normalizeName(drop.name)));
    for(const itemId of lootAdditions.get(id)||[]){
      const item=addedItems[itemId];
      const name=normalizeName(item.name);
      if(ids.has(itemId)||names.has(name)) continue;
      drops.push({...item});
      ids.add(itemId);
      names.add(name);
    }
    return {...spot,drops};
  };
  const spots=Array.isArray(window.BDO_GRIND_SPOTS)?window.BDO_GRIND_SPOTS:[];
  window.BDO_GRIND_SPOTS=spots
    .filter(spot=>![112,914].includes(Number(spot?.id)))
    .map(spot=>correctLoot({...spot,...(corrections.get(Number(spot?.id))||{})}));
})();
