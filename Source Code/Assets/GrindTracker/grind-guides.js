/* Original grind-zone summaries synthesized from official and community references. */
(()=>{
  const source=(title,url,updated)=>({publisher:"Black Desert Foundry",title,url,updated});
  const cited=(publisher,title,url,updated)=>({publisher,title,url,updated});
  const step=(tone,title,text)=>({tone,title,text});
  const image=(title,file,caption)=>({title,image:`Assets/GrindTracker/guides/${file}`,caption});
  const route=(title,caption,routeStatus="text-only",visualKind="rotation-route")=>({title,caption,routeStatus,visualKind});
  const guides={};
  const add=(ids,guide)=>ids.forEach(id=>{guides[String(id)]={...guide,spotId:Number(id)}});

  const dehkiaSource=source("Dehkia's Lantern Guide","https://www.blackdesertfoundry.com/dehkias-lantern-guide/","2026-07-07");
  add([162,143],{
    source:dehkiaSource,
    summary:"Wake the Ash Forest through its Rift Seed, then control the awakened elites before their combined pressure becomes lethal.",
    steps:[
      step("trigger","Start the encounter","Activate Dehkia's Lantern at the Rift Seed, then strike the seed to wake the forest spirits."),
      step("do","Remove Barnas quickly","When Barnas is active near Volkras, focus Barnas first so Volkras cannot keep chaining its deadly pressure attack."),
      step("watch","Expect a second phase","After the awakened Volkras falls, it rises again in a split form. Reposition before committing to the follow-up pack."),
      step("avoid","Protect against knockdown","The spot applies knockdown. Use the recommended resistance setup and avoid standing through Volkras's large attacks.")
    ],
    rotations:[image("Rift Seed location","dehkia-ash-forest-location.png","Lantern activation point and grind location shown in the Foundry guide.")]
  });
  add([161,144],{
    source:dehkiaSource,
    summary:"Fight around Olun's Power Tower, survive the roar and arm slam, then clear baby golems to end the invulnerable phase.",
    steps:[
      step("trigger","Use Olun's Power Tower","Activate Dehkia's Lantern beside the tower to summon the awakened Olun's Golem."),
      step("avoid","Leave the roar circle","The mighty-roar message precedes a large red area attack. Move out immediately."),
      step("avoid","Respect the left-arm slam","At roughly 50% to 40% health the golem slams its left arm. Guard or iframe it; the hit can be lethal."),
      step("do","Clear the baby golems","After the arm breaks, the boss becomes invulnerable and summons babies. Defeat enough of them to bring the boss back.")
    ],
    rotations:[
      image("Power Tower area","dehkia-olun-location-1.jpg","Approach and activation area for Dehkia Olun's Valley."),
      image("Lantern position","dehkia-olun-location-2.png","Exact Power Tower position shown in the guide.")
    ]
  });
  add([145],{
    source:dehkiaSource,
    summary:"Hold one of Tunkuta's six lantern points, clear the Turo waves, and repeatedly force Ulutuka out of the fallen packs.",
    steps:[
      step("trigger","Choose a charm or tower","Activate the lantern at one of the three Turo Charms or three Turo Shaman Towers."),
      step("do","Clear the Turo waves","Keep the packs grouped at the activation point while the lantern encounter builds."),
      step("watch","Prepare for Ulutuka","Ulutuka appears after a delay and returns from the Turo corpses after enough Turos are defeated.")
    ],
    rotations:[image("Six activation points","dehkia-tunkuta-location.png","Foundry's map of the Turo Charm and Shaman Tower locations.")]
  });
  add([146],{
    source:dehkiaSource,
    summary:"Activate an Eye of Despair, clear the attacking Ahib, and keep control of the pack when the Dark Knight joins the fight.",
    steps:[
      step("trigger","Find an Eye of Despair","Use the lantern at one of the four Eyes of Despair in Thornwood Forest."),
      step("do","Build the encounter","Defeat the Ahib waves until the Dark Knight appears."),
      step("watch","The waves do not stop","Ahib continue arriving after the Dark Knight spawns, so keep them grouped while focusing the priority target.")
    ],
    rotations:[image("Eye of Despair locations","dehkia-thornwood-location.png","The four lantern points shown in the Foundry guide.")]
  });
  add([151],{
    source:dehkiaSource,
    summary:"Awaken the Cyclopes and Gargoyles, deny the Cyclopes their healing, and avoid enraging the surviving Gargoyles.",
    steps:[
      step("trigger","Activate southwest of Longleaf","Use one of the five lantern positions near Longleaf Tree Sentry Post."),
      step("avoid","Do not feed the Cyclopes","Cyclopes can consume nearby boars to recover health. Keep them away from boars or remove the boars first."),
      step("avoid","Do not leave enraged Gargoyles","Killing a Cyclops beside surviving Gargoyles enrages them. Plan the kill order and finish the pack cleanly."),
      step("watch","Treat every heavy swing as lethal","The awakened monsters deal extremely high damage; stay behind them and preserve a defensive escape.")
    ],
    rotations:[image("Five lantern positions","dehkia-cyclops-location.png","Activation points southwest of Longleaf Tree Sentry Post.")]
  });
  add([155],{
    source:dehkiaSource,
    summary:"Enter Aakman, activate one of its two lantern points, and fight through the Flamen's unstable devices and meteor barrage.",
    steps:[
      step("trigger","Enter Aakman Temple","Reach the temple through a desert portal or the cave entrance near Madun, then activate one of the two marked points."),
      step("watch","Track the Flamen","The Aakman Flamen takes control of the encounter and destabilizes the ancient device."),
      step("avoid","Move out of meteor impacts","The Flamen's illusion attack covers a wide area with falling meteors. Keep moving and save an iframe for overlapping markers.")
    ],
    rotations:[
      image("Aakman point one","dehkia-aakman-location-1.png","First lantern position inside Aakman Temple."),
      image("Aakman point two","dehkia-aakman-location-2.png","Second lantern position inside Aakman Temple.")
    ]
  });
  add([156],{
    source:dehkiaSource,
    summary:"Activate a Hystria Guard Tower, avoid Tutuka's battlefield shockwave, and prepare for Elten when alert reaches its peak.",
    steps:[
      step("trigger","Enter Hystria Ruins","Use a desert portal or the cave entrance near Vygun, then activate one of the two marked Guard Towers."),
      step("avoid","Dodge Tutuka's shockwave","Tutuka sends a powerful shockwave across the fight. Move or iframe as soon as its cast begins."),
      step("watch","Peak alert summons Elten","At maximum alert the chaotic Elten activates. Re-center the pack and be ready for the priority target.")
    ],
    rotations:[
      image("Hystria point one","dehkia-hystria-location-1.png","First lantern position inside Hystria Ruins."),
      image("Hystria point two","dehkia-hystria-location-2.png","Second lantern position inside Hystria Ruins.")
    ]
  });
  add([159],{
    source:dehkiaSource,
    summary:"Hold one of Pila Ku's two lantern rooms, prioritize the Frenzied Executioner, and be ready for the alarm-driven swarm.",
    steps:[
      step("trigger","Use an inner-jail lantern point","Activate the lantern at either marked position inside Pila Ku Jail."),
      step("do","Focus the Executioner","The Frenzied Executioner is the main threat. Remove it before its empowered sword attacks overlap the pack."),
      step("watch","The alarm pulls reinforcements","An alarm calls prisoners and wardens into the fight. Keep the group centered instead of chasing stragglers.")
    ],
    rotations:[
      image("Pila Ku overview","dehkia-pila-ku-location-1.png","Guide view of the two activation areas."),
      image("Pila Ku lantern points","dehkia-pila-ku-location-2.jpg","Exact lantern locations inside the jail.")
    ]
  });
  add([158],{
    source:dehkiaSource,
    summary:"Break sulfur bundles to draw out the empowered Lava Tribe, then use the water vents to strip away the dangerous heat.",
    steps:[
      step("trigger","Destroy the sulfur bundles","Activate the lantern at the northern or eastern point and break nearby bundles to pull the tribe to the surface."),
      step("do","Use the water streams","Fight through the erupting water so it removes the lava heat and makes the pack easier to control."),
      step("avoid","Do not ignore the heat","Staying in the empowered lava pressure without cooling it makes the encounter substantially more dangerous.")
    ],
    rotations:[
      image("Sulfur Mine overview","dehkia-sulfur-location-1.png","Northern and eastern encounter areas."),
      image("Sulfur Mine lantern points","dehkia-sulfur-location-2.png","Exact lantern positions shown in the guide.")
    ]
  });
  add([160],{
    source:dehkiaSource,
    summary:"Wake the Argos at the void-infested altar, collapse the forces around their Gatekeeper, and avoid the chief's undefendable strike.",
    steps:[
      step("trigger","Use the Obsidian Altar","Activate Dehkia's Lantern at the Void-Infested Obsidian Altar."),
      step("do","Group around the Gatekeeper","The awakened forces cluster around the Crescent Chief Gatekeeper; keep the pack tight for efficient damage."),
      step("avoid","Evade the chief attack","The Chief Gatekeeper's strongest attack cannot be safely blocked. Move or iframe instead.")
    ],
    rotations:[
      image("Crescent overview","dehkia-crescent-location-1.png","Approach to the awakened Crescent encounter."),
      image("Obsidian Altar","dehkia-crescent-location-2.png","Lantern position at the altar.")
    ]
  });
  add([163],{
    source:dehkiaSource,
    summary:"Activate a Cadry Cannon, clear the Black Stone-empowered soldiers, then burst the frenzied Commander called by the lingering void.",
    steps:[
      step("trigger","Use a Cadry Cannon","Shine the lantern on a void-infested cannon to summon commanders and soldiers."),
      step("do","Clear the cannon pack","Keep the soldiers grouped around the cannon while removing the dangerous commanders first."),
      step("watch","A frenzied Commander follows","After enough Cadry fall, the remaining void calls in a stronger Commander. Save burst damage for its arrival.")
    ],
    rotations:[
      image("Cadry encounter area","dehkia-cadry-location-1.png","Guide overview of the awakened ruins."),
      image("Cadry Cannon","dehkia-cadry-location-2.png","Lantern activation object and location.")
    ]
  });
  add([912],{
    source:dehkiaSource,
    summary:"This encounter begins at the dedicated Mirumok lantern point; Foundry has not yet published additional mechanic instructions.",
    steps:[
      step("trigger","Use the marked Mirumok point","Activate Dehkia's Lantern at the guide location to spawn the awakened Mirumok encounter."),
      step("watch","Party content","Keep the recommended three-player party together around the activation area while learning the wave timing.")
    ],
    rotations:[image("Mirumok lantern point","dehkia-mirumok-location.png","Activation location published in the Foundry guide.")]
  });
  add([911],{
    source:dehkiaSource,
    summary:"This encounter begins at the dedicated upper Gyfin lantern point; Foundry has not yet published additional mechanic instructions.",
    steps:[
      step("trigger","Use the marked upper-Gyfin point","Activate Dehkia's Lantern at the guide location to spawn the awakened Gyfin encounter."),
      step("watch","Party content","Keep the recommended three-player party together around the activation area while learning the wave timing.")
    ],
    rotations:[image("Upper Gyfin lantern point","dehkia-gyfin-location.png","Activation location published in the Foundry guide.")]
  });

  const innerSource=source("Edania: Inner Monster Zones Guide","https://www.blackdesertfoundry.com/edania-inner-monster-zones-guide/","2026-08-13");
  add([917],{
    source:innerSource,
    summary:"Build three outer scarecrows to energize the central tree, protect the cycle from the jumping scarecrow, and reach the automatic-kill phase.",
    steps:[
      step("trigger","Strike the Goldfield Scarecrow","Use the scarecrow beside the tree to start the encounter."),
      step("do","Build three outer scarecrows","Clear three packs for each outer spawn. Once all three are active, the central tree begins glowing."),
      step("do","Keep the tree active","Maintain the glowing state for roughly 12 to 15 minutes. Slow clears let the scarecrows disappear and reset the spot."),
      step("avoid","Dodge the jumping scarecrow","Its red landing circle hits extremely hard. Iframe the landing, then destroy it before it can reset the encounter."),
      step("watch","Use the boar and free-kill phase","The white boar deletes nearby monsters without hurting players. A two-and-a-half-minute automatic-kill phase follows a successful cycle.")
    ],
    rotations:[image("Eleven Aphrodon rotations","aphrodon-rotations.png","Foundry's complete numbered rotation map.")]
  });
  add([918],{
    source:innerSource,
    summary:"Clear the tower, earn Watchful Gaze from Markthanan's Daughter, destroy both crystals before the buff expires, then defeat the dragon.",
    steps:[
      step("trigger","Begin at the main tower","Kill the packs around the tower and use exploding crystal carriers to damage nearby enemies."),
      step("do","Defeat Markthanan's Daughter","After several packs she appears and grants the four-minute Watchful Gaze buff when defeated."),
      step("do","Break both crystals in time","Clear two cycles at the first crystal, move directly to the second, and destroy it while Watchful Gaze remains active."),
      step("avoid","Do not lose the buff between crystals","If Watchful Gaze expires before the second crystal, the encounter resets and must be restarted at the tower."),
      step("watch","Finish the dragon phase","The dragon lands during the second crystal sequence. Defeat it to begin the one-minute automatic-kill phase.")
    ],
    rotations:[]
  });
  add([919],{source:innerSource,summary:"Foundry currently lists the required control-resistance family but has not yet published a full mechanic walkthrough.",steps:[step("watch","Prepare stun resistance","Magaia uses the Stun, Stiffness, and Freeze resistance family. Full encounter steps are still pending in the source guide.")],rotations:[]});
  add([920],{source:innerSource,summary:"Foundry currently lists the required control-resistance family but has not yet published a full mechanic walkthrough.",steps:[step("watch","Prepare knockdown resistance","Aresion uses the Knockdown and Bound resistance family. Full encounter steps are still pending in the source guide.")],rotations:[]});
  add([921],{source:innerSource,summary:"Foundry currently lists the required control-resistance family but has not yet published a full mechanic walkthrough.",steps:[step("watch","Prepare party stun resistance","Scales of Judgment uses the Stun, Stiffness, and Freeze resistance family. Full encounter steps are still pending in the source guide.")],rotations:[]});
  add([922],{source:innerSource,summary:"Foundry currently lists the required control-resistance family but has not yet published a full mechanic walkthrough.",steps:[step("watch","Prepare stun resistance","Event Horizon uses the Stun, Stiffness, and Freeze resistance family. Full encounter steps are still pending in the source guide.")],rotations:[]});

  const outerSource=source("Edania: Outer Monster Zones Guide","https://www.blackdesertfoundry.com/edania-monster-zones-guide/","2026-08-12");
  add([901],{
    source:outerSource,
    summary:"Feed kills into unstable blue circles, use the lightning-orb transformation to erase waves, then defeat Muraka to restart the loop.",
    steps:[
      step("trigger","Strike the central Root Spirit","Hitting the Darktouched Root Spirit starts the monster waves."),
      step("do","Kill inside the blue circles","Pull packs into each unstable-spirit circle and defeat them there to progress the encounter."),
      step("do","Use the lightning form","After enough circles, Black Wings transforms you into a blue orb. Steer through packs with movement keys to deal massive damage."),
      step("watch","Finish Muraka","Muraka appears when the transformation ends. Defeat it and the remaining monsters, then strike the tower again.")
    ],rotations:[]
  });
  add([902],{
    source:outerSource,
    summary:"Prioritize Shamans, destroy Rusalka's Eyes before contamination floods the area, then use the launch circle after the boss.",
    steps:[
      step("do","Kill the Shaman first","Move pack to pack between the pillars and remove each Shaman before cleaning up the group."),
      step("avoid","Do not ignore Rusalka's Eyes","When the contamination warning appears, destroy the eye tower immediately or the poison pressure will keep rising."),
      step("avoid","Stay behind the boss","The boss has heavy frontal damage and dangerous areas. Keep back attacks active and move out of marked zones."),
      step("do","Use the blue launch circle","After the boss dies, take the central launcher, destroy the bubble above, then finish the weak fish phase.")
    ],rotations:[]
  });
  add([903],{
    source:outerSource,
    summary:"Destroy six pillars in sequence, pair each pillar with its spawned golem, then survive Titan to reach the free-kill phase.",
    steps:[
      step("trigger","Strike the central Grave of Light","The middle tower starts the encounter and unlocks the outer pillars in stages."),
      step("do","Pair every pillar with its golem","Move to the next pillar as each golem spawns so both targets stack. Try to finish them at nearly the same time."),
      step("avoid","Do not leave a golem behind","Destroying a pillar too early can leave two golems active. Their charged red-circle and ranged attacks are extremely dangerous."),
      step("do","Use the safe buff circles","White and gold circles grant an AP buff and are safe to stand in."),
      step("watch","Burst Titan carefully","After both pillar sets and the central tower, Titan arrives. Avoid its marked attacks to unlock the three-minute automatic-kill phase.")
    ],rotations:[]
  });
  add([904],{
    source:outerSource,
    summary:"Clear all four outer towers, use each Seer's death stun, and fight the Manticore through its repeated retreat phases.",
    steps:[
      step("trigger","Start at an outer tower","Hit one of the four towers and clear its three waves before moving clockwise to the next."),
      step("do","Focus the Seer in wave three","Killing the Seer stuns the surrounding pack and creates the safest damage window."),
      step("watch","Track the Manticore thresholds","It retreats near two-thirds and one-third health, granting a buff while more waves arrive, then returns for the next phase."),
      step("do","Restart after the free-kill minute","Defeating the Manticore begins a short automatic-kill phase; hit an outer tower again when it ends.")
    ],rotations:[]
  });
  add([905],{
    source:outerSource,
    summary:"Clear waves from the central tower, kill all three Shadow Knights, then avoid Beelzebub's tongue and red-circle attacks.",
    steps:[
      step("trigger","Strike the central tower","Defeat waves for roughly two minutes until three Shadow Knights appear around the perimeter."),
      step("do","Rotate through the Shadow Knights","Focus each knight while cleaving the regular waves; weaker Cultists spawn after each knight dies."),
      step("avoid","Respect Beelzebub's marked attacks","Iframe or guard the tongue sequence and high-damage red circle."),
      step("do","Restart after the free-kill phase","The boss unlocks roughly two minutes of automatic wave kills before the tower becomes usable again.")
    ],rotations:[]
  });
  const floodlands={
    source:outerSource,
    summary:"In a three-player party, break all three orbs before damaging each pack, rotate through the circles, and interrupt the final boss's orb channel.",
    steps:[
      step("do","Assign one orb per player","Every pack begins with three protection orbs. Break all three to remove the monsters' defense buff."),
      step("do","Clear and rotate","AOE the exposed pack together, then move to the next black-and-white circle."),
      step("watch","Expect a roaming mini-boss","Roughly every 10 to 15 minutes a circle turns red and spawns Titan, Manticore, or Beelzebub."),
      step("avoid","Stop the final orb channel","At low health the final boss pulls yellow orbs inward. Destroy every orb before it reaches the boss."),
      step("do","Use the successful stagger","Breaking the full orb wave stuns the boss and creates the safest finishing window.")
    ],
    rotations:[image("Floodlands party rotation","floodlands-rotations.png","Foundry's route map for the shared Floodlands layout.")]
  };
  add([906,909,910],floodlands);

  const goldenSource=source("Golden Pig Cave Guide","https://www.blackdesertfoundry.com/golden-pig-cave-guide/","2025-03-28");
  const goldenSteps=[
    step("do","Back-attack each group","Golden Pigs spawn in groups of four and ignore crowd control. Pull them together, get behind them, and use back-attack skills."),
    step("trigger","Complete five laps","Clearing every pack counts as one rotation; the Golden Pig King appears after five completed rotations."),
    step("do","Use the re-entry cooldown for the scroll","The run awards a short-lived boss scroll. Challenge it during the five-minute cave cooldown and finish within its limit."),
    step("avoid","Do not let the scroll expire","The summon scroll lasts only ten minutes, so do not postpone the separate boss fight.")
  ];
  add([168],{source:goldenSource,summary:"Run the always-open private cave for 25 minutes, complete five laps, then defeat the Golden Pig King and its timed scroll.",steps:goldenSteps,rotations:[]});
  add([167],{source:goldenSource,summary:"Use the 70-minute event cave, complete repeated five-lap runs, and watch for the server-wide Rare Treasures jackpot.",steps:[...goldenSteps,step("watch","Rare Treasures ends entry","The first player to claim the rare treasure closes new entry, though players already inside can finish their current run.")],rotations:[]});

  const ulukitaSource=source("Ulukita Patch Guide","https://www.blackdesertfoundry.com/ulukita-patch-guide/","2025-05-30");
  add([147],{
    source:ulukitaSource,summary:"Interrupt the Messenger's opening cast to knock down the whole pack, gain the temporary AP buff, and burst with down attacks.",
    steps:[
      step("do","Focus the Tehmelun Messenger","The wizard begins casting with a yellow effect as the pack is pulled."),
      step("trigger","Crowd-control the cast","Interrupting that cast knocks down the nearby monsters and grants a temporary AP buff."),
      step("do","Burst with down attacks","Use down-attack skills and matching add-ons during the knockdown window.")
    ],rotations:[]
  });
  add([148],{
    source:ulukitaSource,summary:"Break the Tungrad Visionary's shield, knock it down, and use its death stun to erase the surrounding pack.",
    steps:[
      step("do","Pressure the Visionary first","Damage the Tungrad Visionary until its shield breaks near the start of its health bar."),
      step("trigger","Knock it down after the break","Once exposed, crowd-control the Visionary to create a high-damage down-attack window."),
      step("do","Use the death stun","Defeating the Visionary stuns nearby monsters, letting you finish the pack safely.")
    ],rotations:[]
  });
  add([153],{
    source:ulukitaSource,summary:"Fight with your back protected, activate Sealed Artifacts through Blazing Embers, and use their repeated disorientation pulses.",
    steps:[
      step("avoid","Do not expose your back","Darkseekers build powerful attacks and leave damaging dark energy behind them."),
      step("trigger","Defeat the Blazing Ember","The Ember appears with a Sealed Artifact after specific Darkseekers fall; killing it activates the artifact."),
      step("do","Fight inside the artifact window","For about five minutes the artifact periodically disorients nearby Darkseekers."),
      step("watch","Corrupt followers resist the effect","Followers summoned by the Eternal Darkseeker are not controlled by the artifact, so treat them separately.")
    ],rotations:[]
  });
  add([157],{
    source:ulukitaSource,summary:"Control Seculion's ancient-weapon waves and expect the main construct to repair itself while continually calling reinforcements.",
    steps:[
      step("do","Keep the weapons grouped","Seculion stores the energy used by the surrounding constructs; stack the summoned weapons for efficient damage."),
      step("watch","Expect self-repair","Seculion can restore itself, so maintain damage instead of leaving the main construct unattended."),
      step("avoid","Do not chase every summon","New weapons arrive continuously. Keep the fight anchored rather than scattering the pack.")
    ],rotations:[]
  });

  const hexeSource=source("Elvia Hexe Sanctuary Guide","https://www.blackdesertfoundry.com/elvia-hexe-sanctuary-guide/","2024-02-05");
  add([124],{
    source:hexeSource,
    summary:"Cycle between Rift of Despair packs, kill Witmirth to seed the next wave, and use Soulless explosions against elites and Hexe Marie.",
    steps:[
      step("do","Open on the Green Orc Warrior","Witmirth begins untargetable and gathers monsters for you; clear the elite and its pack first."),
      step("trigger","Kill Witmirth, then move","When Witmirth becomes vulnerable, defeat it and immediately rotate to the next pack while its stronger wave forms behind you."),
      step("avoid","Leave red bomb circles","Soulless soldiers explode in large marked areas. Move out, but let those explosions hit enemy monsters."),
      step("do","Use bombs on Hexe Marie","When the boss appears, position the Soulless explosions through her and enable Agris for the boss kill."),
      step("watch","Use Spirit Light at a Rift","Ancient Spirit Light purifies a nearby Rift of Despair and grants a five-minute damage buff to players in range.")
    ],rotations:[]
  });
  const calpheonSource=source("Calpheon Elvia Realm Guide","https://www.blackdesertfoundry.com/calpheon-elvias-realm-guide/","2026-07-02");
  add([121],{
    source:calpheonSource,
    summary:"Wake petrified Trolls with the Ancient Troll burst, then destroy Shaman seals to petrify the pack and apply defense reduction.",
    steps:[
      step("trigger","Lower an Ancient Troll's health","At its threshold the Troll releases its health to recharge stamina, waking nearby petrified Trolls."),
      step("watch","Newly awakened Trolls are protected","Resurrected Ancient Trolls gain a strong temporary defense buff."),
      step("do","Destroy the sealed Shaman","Breaking a dormant Troll Shaman petrifies nearby Trolls and applies defense reduction."),
      step("avoid","Do not expect a full reset","Once awakened, Ancient Trolls return only to a paralyzed state, not their original petrified state.")
    ],rotations:[]
  });

  const gyfinSource=source("Gyfin Temple Underground Guide","https://www.blackdesertfoundry.com/gyfin-temple-underground-guide/","2024-02-05");
  add([97],{source:gyfinSource,summary:"Rotate through the three colored Gyfin packs in the correct counter order, carrying each defeated statue's buff into the next pack.",steps:[
    step("trigger","Identify the active statue","Begin at a red, blue, or purple statue and read its color before committing to the pull."),
    step("do","Follow the counter order","Use the red pack's buff against blue, blue against purple, and purple against red."),
    step("watch","Keep the buff moving","The clear depends on reaching the next color while the previous pack's advantage is still active."),
    step("avoid","Do not attack the wrong color","Fighting without the matching counter buff sharply reduces damage and makes the pack dangerous.")
  ],rotations:[]});

  const olunSource=source("Olun's Valley Guide","https://www.blackdesertfoundry.com/oluns-valley-guide/","2024-02-05");
  add([5],{source:olunSource,summary:"Coordinate the party around each Olun golem, break its arm for loot, force the baby phase quickly, and avoid the lethal untelegraphed attacks.",steps:[
    step("do","Push to the arm phase","Aim to reach roughly 40% health quickly so the babies spawn before the arm sequence delays the pull."),
    step("do","Destroy the arm","The arm becomes a separate target and has its own drops, including the rare merchant-ring piece."),
    step("avoid","Read both double-arm attacks","A red flash signals the donut area; no flash signals the high-damage smash. Do not tank either pattern."),
    step("avoid","Keep aggro close","A distant aggro target can trigger the long-range nuke and wipe the party before the arm breaks.")
  ],rotations:[]});

  add([123],{source:calpheonSource,summary:"Cycle between Calpheon Flags, keep their monster-attack buff active, and destroy the siege tower when the Saunil assault begins.",steps:[
    step("do","Clear each flag","Defeat every enraged Saunil beside a flag; an empty flag grants a 60-second monster-attack buff."),
    step("do","Refresh the flag buff","Move through the rotation's flags often enough to keep the attack bonus active."),
    step("watch","Hunt Commanders","Commander Saunils can summon the more valuable Saunil Captain."),
    step("trigger","Break the Siege Tower","When the assault message appears, destroy the tower attacking the flag to start the enraged waves.")
  ],rotations:[]});
  add([122],{source:calpheonSource,summary:"Build Rhutum alert by clearing the camps, then defend the supply crates through the concentrated counterattack.",steps:[
    step("do","Clear around the Rhutum camps","Keep moving through the guarded camps until the alert phase begins."),
    step("trigger","Respond to the supply signal","The alert draws Rhutums toward the supply crates and starts the main reward phase."),
    step("do","Protect the crates","Defeat the incoming waves before they can destroy the supplies."),
    step("avoid","Do not abandon an active crate","Leaving the defense early wastes the event and its concentrated monster waves.")
  ],rotations:[]});
  add([120],{source:calpheonSource,summary:"Clear the Giant packs until the souls gather, then use the resulting event to pull the high-value empowered wave into one controlled fight.",steps:[
    step("do","Keep the packs grouped","Move tightly between Giant groups so the event builds without scattering the pull."),
    step("watch","Track the gathered souls","The zone event escalates as defeated Giants feed the mechanic."),
    step("trigger","Commit when the empowered wave arrives","Use your major cooldowns on the concentrated event pack rather than ordinary stragglers."),
    step("avoid","Do not stand inside heavy Giant attacks","The event density makes overlapping frontal hits much more dangerous.")
  ],rotations:[]});

  const serendiaSource=source("Serendia Elvia Realm Guide","https://www.blackdesertfoundry.com/elvias-realm-hadum-server-guide/","2024-02-05");
  add([17],{source:serendiaSource,summary:"Free Fairies of Light to build weakening zones, combine five zones into a Light Burst, and remove Wizards before they undo the setup.",steps:[
    step("trigger","Free the Fairies of Light","Break their cages so they create Zones of Light around the camp."),
    step("do","Fight inside the light","Red Orcs exposed to a Zone of Light are weakened and become much easier to clear."),
    step("do","Build a Light Burst","Activating more than five zones triggers a powerful burst that heavily weakens Orcs inside it."),
    step("avoid","Kill Wizards first","Red Orc Wizards ignore the light, destroy zones, and strengthen nearby Orcs. Remove them immediately.")
  ],rotations:[]});
  add([18],{source:serendiaSource,summary:"Use Crimson Bells for dense waves, interrupt monastery rituals, and defeat Furious Muskan when a successful interruption summons him.",steps:[
    step("trigger","Use a Crimson Bell","A dropped bell summons monsters from every direction for a concentrated clear."),
    step("watch","Look for an active ritual","Ritual events periodically begin elsewhere in the monastery."),
    step("do","Eliminate every summoner","Stopping the ritual requires clearing its summoners before the event completes."),
    step("trigger","Defeat Furious Muskan","A successful interruption summons Muskan, whose loot is shared with up to five adventurers.")
  ],rotations:[]});

  const winterSource=source("Mountain of Eternal Winter Patch Guide","https://www.blackdesertfoundry.com/mountain-of-eternal-winter-patch-guide/","2024-02-05");
  add([110],{source:winterSource,summary:"Rotate through three lamp packs, use braziers to debuff and knock down the Okjinsini, then chain their death explosions through the group.",steps:[
    step("do","Break the lamp or brazier","Destroying the object debuffs or knocks down the nearby monsters."),
    step("do","Chain the explosions","Defeated Okjinsini explode and damage the rest of the pack, so stack targets tightly."),
    step("watch","Carry elites carefully","Elites can be pulled into the next pack for a double pull."),
    step("avoid","Do not empower an elite","An elite taken beside a living lamp can receive a buff; destroy the object before the pull arrives.")
  ],rotations:[]});
  add([149,150,112],{source:winterSource,summary:"Spend energy at a Winter Tree Fossil, choose the difficulty, and hold the tower while successive monster waves are summoned.",steps:[
    step("trigger","Activate a black fossil tower","Interact with the tower and spend 100 Energy to start the encounter."),
    step("do","Choose the correct difficulty","Select the version that matches the profile and your current gear."),
    step("watch","Expect repeated waves","The fossil remains the center of the fight while different monster groups arrive."),
    step("avoid","Do not start underprepared","The Energy cost is paid at activation, so repair, buff, and clear your inventory first.")
  ],rotations:[]});
  add([113],{source:winterSource,summary:"Memorize the four required symbols, clear matching door rooms, and unlock the golden chamber where the run's valuable rewards are awarded.",steps:[
    step("trigger","Use Erethea's Slate","Enter with a Forgotten Witch's Token and choose the difficulty."),
    step("do","Record the four symbols","The center crystals show the four doorway symbols needed for the golden room."),
    step("do","Clear one matching room at a time","Complete each room's announced mechanic, then choose another required symbol."),
    step("avoid","Do not ignore room instructions","Each chamber uses a different objective; pure damage can fail or slow the route.")
  ],rotations:[]});

  const honglimSource=source("Land of the Morning Light Monster Zone Update","https://www.blackdesertfoundry.com/global-lab-updates-25th-october-2024/","2024-10-25");
  add([165],{source:honglimSource,summary:"Defeat sentries and bandits to free Foxfire, build its energy, then use the summoned nine-tailed fox and 200% Black Spirit power to crush the camp.",steps:[
    step("trigger","Free the captured Foxfire","Defeat sentries and bandits around the marked territory."),
    step("do","Keep gathering Foxfire energy","Continue the short rotation while the released spirit follows and gains power."),
    step("do","Use the nine-tailed fox window","The gathered energy summons an ally that weakens the bandits and grants a powerful benefit."),
    step("avoid","Do not stay planted","Sharpshooter bandits use strong ranged attacks and reward movement between packs.")
  ],rotations:[]});

  window.BDO_GRIND_GUIDES={schemaVersion:1,minRecommendedAp:250,generatedAt:"2026-08-15",guides};
})();
