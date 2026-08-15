/* Live-mechanics corrections and complete 250 AP+ route/encounter coverage. */
(()=>{
  const bundle=window.BDO_GRIND_GUIDES;
  if(!bundle||!bundle.guides)return;
  const guides=bundle.guides;
  const source=(publisher,title,url,updated)=>({publisher,title,url,updated});
  const step=(tone,title,text)=>({tone,title,text});
  const route=(title,caption,routeStatus="text-only",visualKind="rotation-route")=>({title,caption,routeStatus,visualKind});
  const set=(id,data)=>{guides[String(id)]={...data,spotId:Number(id)}};
  const extend=(id,data)=>{const key=String(id),current=guides[key];if(current)guides[key]={...current,...data,spotId:Number(id)}};

  const officialCombat=source("Pearl Abyss","July 2025 combat and monster-zone update","https://blackdesert.pearlabyss.com/Asia/en-us/News/Notice/Detail?_boardNo=7955","2025-07-24");
  const officialInnerEdania=source("Pearl Abyss","Inner Edania monster zones","https://blackdesert.pearlabyss.com/ASIA/en-US/Game/Wiki?_masterWikiNo=84","2026-08-13");
  const calpheonGuide=source("Garmoth","Elvia Realm: Calpheon","https://garmoth.com/guides/post/elvia-realm-calpheon/","2026-08-15");

  delete guides["112"];
  delete guides["914"];

  set(169,{source:source("Pearl Abyss","Orzekea monster zone update","https://blackdesert.pearlabyss.com/TR/en-US/News/Notice/Detail?_boardNo=17815","2025-12-18"),summary:"Enter Orzekea's Marni-only combat field, raise its alert through Ancient Weapon kills, then defeat the increasingly dangerous reinforcements and Alketa.",steps:[
    step("trigger","Enter with Maha's Fragment","Buy the timed entry item from an Old Moon Manager or the Marni Sol Magia, then enter the normal-server Marni field."),
    step("do","Raise the alert","Defeat Spiran, Centarion, and Leos packs. Each alert stage calls stronger Atoraxxion Ancient Weapon reinforcements."),
    step("watch","Save burst for Alketa","The maximum alert summons Alketa. Re-center the pack and spend major cooldowns on this final priority target."),
    step("avoid","Do not build around species damage","The official zone guidance states that racial Extra Damage does not apply here; use general monster damage instead.")
  ],rotations:[]});

  set(11,{source:source("Pearl Abyss","Abandoned Monastery monster-zone guide","https://www.sa.playblackdesert.com/pt-br/Wiki?wikiNo=69","2026-08-15"),summary:"Stay together in the monastery cave, collect five regional grudges from blessed Shadow Knights, then defeat the Specter of Belmorn without losing party-loot range.",steps:[
    step("do","Collect five dawn grudges","Clear the blessed Shadow Knights through the cave. The fifth regional grudge calls the Specter of Belmorn."),
    step("trigger","Defeat Belmorn together","Regroup before the fifth trigger and kill the Specter to obtain Dawn's Resentment."),
    step("watch","Read the ceiling","Falling stalactites can incapacitate you for several seconds and make the next Shadow Knight hit lethal."),
    step("avoid","Do not split the duo","The cave uses party loot. Stay close enough to share kills and turn together at the end of the corridor.")
  ],rotations:[]});

  set(27,{source:source("Pearl Abyss","Ash Forest monster-zone update","https://blackdesert.pearlabyss.com/asia/en-US/News/Notice/Detail?_boardNo=1560","2026-08-15"),summary:"Build a compact Barnas-centered pull, commit nearby Volkras, then reveal Gairas with the Rift Seed so the full group can be stacked and back-attacked.",steps:[
    step("do","Tag Barnas first","Pull Barnas and confirm the nearby Volkras are committed before touching the Rift Seed."),
    step("trigger","Use the Rift Seed second","Strike the Seed to reveal and pull Gairas only after the first monsters are moving into the stack."),
    step("do","Stack and back-attack","Bring the compact group together, stay behind the elites, and finish it before exceeding the aggro cap."),
    step("avoid","Do not start with the Seed","Opening on the Seed can fill the aggro limit with Gairas and leave valuable Volkras behind. Move out of the red Volkras knockdown telegraph.")
  ],rotations:[]});

  set(8,{source:source("Pearl Abyss","Crypt of Resting Thoughts update","https://blackdesert.pearlabyss.com/Asia/en-US/News/Notice/Detail?_boardNo=2810","2026-08-15"),summary:"Clear the Crypt's dense rooms while interrupting Dark Mages, controlling Chasers and animal elites, and treating every Dark Knight or Raz'nal spawn as a priority fight.",steps:[
    step("do","Interrupt Dark Mages","A Mage either heals wounded Ahib or channels a high-damage spell. Debuff or crowd-control it before cleaning up the pack."),
    step("watch","Track roaming elites","Dark Chasers enter from darkness, while Salun Bear and Wolf elites can follow across several nearby packs."),
    step("trigger","Handle rare bosses safely","Repeated kills can produce an Abyssal Dark Knight and, rarely, Raz'nal. Raz'nal does not heal when aggro drops, so a safer player can finish it over later laps."),
    step("avoid","Do not face-tank the room","Normal mobs apply Stun and Stiffness, and elite frontal patterns are lethal. Keep accuracy high and work from the rear.")
  ],rotations:[]});

  set(166,{source:source("Pearl Abyss","Dokkebi Forest monster-zone update","https://blackdesert.pearlabyss.com/Asia/en-US/News/Notice/Detail?_boardNo=6504","2026-08-15"),summary:"Hold one Kkebidol site, clear the Dokkebi and kkebifire ritual waves, then survive Duoksini's rage before the statue absorbs energy and starts the next cycle.",steps:[
    step("trigger","Begin at a Kkebidol","Clear the Dokkebi and kkebifires drawn to one of the six stationary stone-statue sites."),
    step("watch","Prepare for Duoksini","The ritual awakens Duoksini. After its rage subsides, a short respite begins while the Kkebidol absorbs nearby energy."),
    step("do","Maximize each clear window","Keep summoned monsters close to the statue and finish the wave before the next rage cycle begins."),
    step("avoid","Leave the large area attack","Duoksini's marked attack can be fatal and the zone applies Stun and Stiffness. Death specifically to Duoksini does not apply the normal death penalty.")
  ],rotations:[]});

  set(33,{source:source("Inven Global","Gyfin Rhasia Temple party-grinding guide","https://www.invenglobal.com/blackdesertonline/articles/3530/guide-on-party-grinding-in-gyfin-rhasia-temple-the-highest-level-grind-spot-in-kamasylvia-part-2","2026-08-15"),summary:"Assign pullers in the five-player party, bring dispersed Gyfin and ranged Flamen into one shared stack, then burst only after every dangerous target is inside the group.",steps:[
    step("do","Assign pull roles","Let dedicated pullers bring the surrounding packs and ranged targets into the party's chosen stack."),
    step("watch","Pull Flamen from the side","A Flamen backsteps when its aggro holder stands directly in front. Approach from the side or rear so it moves into the party's damage."),
    step("do","Burst the completed stack","Hold major area damage until ranged mobs and tower threats are grouped with the melee pack."),
    step("avoid","Do not reset the pack","Stay inside shared-loot range and avoid dragging the stack so far that dispersed monsters leash or reset.")
  ],rotations:[]});

  set(111,{source:source("Pearl Abyss","Murrowak's Labyrinth update","https://blackdesert.pearlabyss.com/Console/en-US/News/Notice/Detail?_boardNo=11880","2026-08-15"),summary:"Clear a solo chamber inside the six-player labyrinth, silence enough rooms to awaken Vercedes, then regroup through the Burrow for the shared Queen phase.",steps:[
    step("do","Silence your chamber","Defeat General Murrasto's swarms and round targets. The first silenced room starts the Queen timer."),
    step("do","Prioritize the Tunnel","Kill the earthquake insect and Tunnel targets quickly; a living Tunnel continues producing self-destructing insects."),
    step("trigger","Awaken Vercedes","At least four silenced chambers fully awaken the Queen. Use the Burrow to join the shared boss phase."),
    step("avoid","Do not lose the next wave","Murrasto can call adds immediately. Repair or manage inventory only after the chamber is truly quiet.")
  ],rotations:[]});

  set(10,{source:source("Pearl Abyss","Padix Island renewal","https://blackdesert.pearlabyss.com/ASIA/en-US/News/Notice/Detail?_boardNo=3383","2026-08-15"),summary:"Rotate between Loah-pot rooms, clear around a ready pot to trigger the extra pirate invasion, then leave that room to recover while another pot becomes available.",steps:[
    step("trigger","Find a ready Loah pot","A ready pot is visibly active. Clear the surrounding pirates until Loah's scent triggers the additional invasion."),
    step("do","Clear the invasion wave","Stay in the room for the concentrated pirate spawn, then move on when the event is finished."),
    step("watch","Cycle recovering rooms","Community testing supports a roughly ten-minute recovery and a two- or three-room loop, but the exact trigger remains drop-rate affected."),
    step("avoid","Ignore obsolete snake instructions","The old strengthen-or-weaken pot, snake, neutralizer, and Ancient Platinum Coin system was removed when Padix became solo content.")
  ],rotations:[]});

  set(4,{source:officialCombat,summary:"Run a compact solo loop through normal Turo packs, use rear damage against their heavy fronts, and stop for the occasional chief Ulutuka before resuming the same route.",steps:[
    step("do","Stack each Turo pack","Pull nearby Turos into one compact group and work behind them for back attacks."),
    step("watch","Expect Ulutuka","Continued grinding can call the Turo chief. Re-center and treat its heavy attacks as the priority encounter."),
    step("do","Resume the same loop","After the chief or ordinary pack is finished, continue through the next ready normal-spawn group."),
    step("avoid","Do not use Dehkia instructions","Normal Tunkuta is now solo. It does not use the Lantern, Turo Charm, Shaman Tower, or endless-wave rules of the separate Dehkia profile.")
  ],rotations:[]});

  set(907,{source:source("Pearl Abyss","Star's End renewal","https://blackdesert.pearlabyss.com/Asia/en-US/News/Notice/Detail?_boardNo=12801","2026-01-22"),summary:"Move debris to debris, gather each Star's End pack onto the object, then destroy it to knock down or erase the group and start a chain of explosions.",steps:[
    step("do","Pull onto Star Debris","Wait until the full pack has reached the object before destroying it."),
    step("trigger","Detonate the debris","The blast knocks monsters down, can instantly kill some targets, and may call a bonus group."),
    step("do","Ride the chain forward","Deaths can trigger further explosions through nearby packs. Move to the next debris object as the chain finishes."),
    step("watch","Handle the Incarnation","A rare Incarnation of Corruption can appear and may drop Origin of Corruption. Do not confuse this mobile field with the preserved quest or ecology pockets.")
  ],rotations:[]});

  set(908,{source:source("Pearl Abyss","Sycraia Lower renewal","https://blackdesert.pearlabyss.com/Asia/en-us/News/Notice/Detail?_boardNo=12907","2026-02-26"),summary:"Build the following Sycraia Memory from green to red while feeding it engaged Ancient Weapons and deleting three priority objects before their effects disrupt the route.",steps:[
    step("trigger","Build the Memory","A glowing Memory can appear and follow you, damaging nearby engaged enemies. Its green, blue, yellow, and red stages improve the reward bundle."),
    step("avoid","Destroy the Eye quickly","Eye of the Deep Sea applies a 10-second Attack and Cast Speed penalty if it survives. Remove it immediately."),
    step("do","Use the Restoration buff","Destroy an Accelerated Tower of Restoration for a 30-second Attack, Cast, and Movement Speed buff plus greatly increased damage to Ancient Weapons."),
    step("watch","Prioritize ranged defenders","Force Field Defenders fire painful water shots. Keep pulls within the Memory's damage, but do not expect it to erase unrelated monsters that are not chasing you.")
  ],rotations:[]});

  set(916,{source:source("Pearl Abyss","Gavinya Coastal Cliff updates","https://blackdesert.pearlabyss.com/Asia/en-US/News/Notice/Detail?_boardNo=19693","2026-08-13"),summary:"Let the Sulfur Volcano Golem complete its opening attack so the Boulder and Rock Golems rise, clear the full awakened group, then break the Sulfur Stalagmite for the payout.",steps:[
    step("trigger","Wait for the first Golem attack","Engage the pack and let the Sulfur Volcano Golem rise and complete its opener; this raises the Boulder and Rock Golems with it."),
    step("do","Clear every awakened Golem","Finish the spawned group before cashing out the encounter."),
    step("do","Break the Stalagmite last","Destroy the Sulfur Stalagmite after the group. The giant variant guarantees a large amount of loot."),
    step("avoid","Do not use launch-era damage pauses","The August update changed add emergence, so old advice to stop damage at specific health thresholds is obsolete. Respect Knockdown and Bound during the opener.")
  ],rotations:[]});

  set(161,{source:officialCombat,summary:"Defeat the Void-absorbing Olun itself, then clear the divided golems that re-form from the dispersed fragments after the main construct falls.",steps:[
    step("trigger","Engage the absorbing Olun","The Tier II Olun draws in nearby golems and void power, leaving the main construct as the central fight."),
    step("do","Focus the main Olun","Stay behind the construct when safe and commit damage to the absorbed form instead of searching for the Tier I baby-golem phase."),
    step("watch","Expect divided golems","After the main Olun dies, its void disperses and fragments re-form as Divided golems around the field."),
    step("avoid","Do not use the Tier I script","Tier II does not follow the Tier I roar, arm-break, invulnerable baby-clear loop. Clear the divided fragments to finish the cycle.")
  ],rotations:[...(guides["161"]?.rotations||[])]});

  set(162,{source:officialCombat,summary:"Pressure Void-absorbed Gairas until it retreats into the deep void, clear the roaming Volkras and Barnas waves to weaken that void, then finish Gairas when it returns.",steps:[
    step("trigger","Drive Gairas into the void","Damage the Void-absorbed Gairas until it withdraws from the field."),
    step("do","Clear the roaming spirits","Remove the smaller Volkras and Barnas waves while Gairas is absent; their deaths diminish the deep void."),
    step("watch","Re-center for the return","Gairas returns after the void weakens. Group the remaining pressure before committing the next damage cycle."),
    step("avoid","Do not rely on back attacks","The current Void-absorbed Gairas no longer receives Back Attack damage, and Tier I's Rift Seed/split-Volkras script does not apply.")
  ],rotations:[...(guides["162"]?.rotations||[])]});

  set(122,{source:source("Pearl Abyss","Rhutum Outstation monster-zone guide","https://www.tr.playblackdesert.com/en-Us/Wiki?wikiNo=265","2026-08-15"),summary:"Clear every Glorious Rhutum at a flag, survive the rush, then destroy the supply boxes after the retreating Rhutums ignite them so the rewards are not lost.",steps:[
    step("trigger","Clear the Glorious Rhutums","Defeat all Glorious enemies around a flag to begin the concentrated rush wave."),
    step("do","Break the burning supplies","The Rhutums retreat after setting their own supply boxes on fire. Destroy those burning boxes before they burn out to receive the loot."),
    step("watch","Use the watchtower event","Destroy all three watchtowers to summon the Rhutum Wizard; its barrier provides monster damage reduction during the fight."),
    step("avoid","Do not defend the boxes","This is not an escort objective. Waiting for the fire to consume the crates throws away the reward; a Grand Rhutum Chief may also appear during continued clears.")
  ],rotations:[]});

  set(120,{source:calpheonGuide,summary:"Charge each World-weary Soul with nearby Giant kills, clear the ravening waves and Giant Fighter, then use the freed soul's speed buff for the next loop.",steps:[
    step("trigger","Find a World-weary Soul","Killing Giants can reveal the soul. Continue defeating Giants close to it to charge the event."),
    step("do","Clear the ravening waves","Stronger Giants arrive as the soul fills, ending with a Giant Fighter."),
    step("do","Free the soul","Defeat the Fighter to release the soul and gain 15% Attack and Cast Speed for the next packs."),
    step("watch","Prepare for Gehaku","The Giant chief can appear rarely. Keep the event pack compact and save a safe burst window for him.")
  ],rotations:[]});

  extend(121,{source:calpheonGuide,summary:"Kill three ordinary Troll guards to wake an Ancient Troll, use its burst to awaken the pack, then break a sealed Shaman to petrify and weaken the group.",steps:[
    step("trigger","Kill three nearby guards","Defeat three ordinary Troll guards around an Ancient Troll to wake the central target."),
    step("trigger","Force the Ancient Troll burst","Damage the Ancient Troll until its health-and-stamina release awakens nearby petrified Trolls with a temporary defense increase."),
    step("do","Destroy the sealed Shaman","Breaking the dormant Troll Shaman petrifies nearby Trolls and applies the defense reduction needed for a fast clear."),
    step("avoid","Do not expect the original reset","An awakened Ancient Troll later returns only to a paralyzed state, not its initial petrified condition.")
  ]});

  set(157,{source:source("Pearl Abyss","Yzrahid Highlands update","https://www.sa.playblackdesert.com/pt-BR/News/Detail?groupContentNo=6530","2026-08-15"),summary:"Stay at Seculion, strike the glowing leg, step into its green safety zone for the damage buff, then burst the exposed core and priority constructs through the final arena-wide sequence.",steps:[
    step("do","Attack the active leg","Follow the red aura to the currently vulnerable Seculion leg rather than spreading damage across inactive parts."),
    step("trigger","Take the green safety buff","Leave the red attack area and step into the green wedge or circle to gain the short Seculion damage bonus."),
    step("do","Burst the core","When the central body becomes targetable, focus it; ordinary Ancient Weapons are cleave targets, not the objective."),
    step("watch","Prioritize Overcharged Kilar","Remove the Overcharged construct in the later phase. Seculion's three final arena attacks then automatically wipe the spawned waves if handled correctly.")
  ],rotations:[]});

  extend(165,{source:source("Pearl Abyss","Honglim Base monster-zone update","https://blackdesert.pearlabyss.com/Console/fr-FR/News/Notice/Detail?_boardNo=12131","2026-08-15"),steps:[
    step("trigger","Free and charge Foxfire","Defeat sentries and bandits around the territory so Foxfire follows, gains energy, and calls the nine-tailed fox boon."),
    step("do","Use the boon window","Keep the short pack loop moving while the spirit weakens bandits and empowers the Black Spirit Rage device."),
    step("watch","Count boss-bandit groups","A Sharpshooter appears with the third and sixth boss-bandit group, remains at range, and fires powerful unblockable shots."),
    step("avoid","Do not ignore the Sharpshooter","Its appearance is scheduled, not caused by standing still. Reposition and remove it quickly instead of trying to prevent it through movement.")
  ]});

  set(148,{source:source("Black Desert Foundry","Tungrad Ruins mechanic update","https://www.blackdesertfoundry.com/global-lab-updates-3rd-may-2024/","2024-05-03"),summary:"Kill the Tungrad Guide to release the pack's defensive protection and obtain the shorter, stronger Essence of Ulukita, then crowd-control and down-attack the exposed targets.",steps:[
    step("do","Prioritize the Guide","Ascetics and Punishers retain their defense increase until the Tungrad Guide dies and releases its energy."),
    step("trigger","Take the stronger Essence","The Guide's death grants a shorter but stronger Essence of Ulukita window for the pack."),
    step("do","Crowd-control after release","Once the defense effect is gone, knock down the exposed priority target and use down attacks to finish the group."),
    step("avoid","Do not wait for the Essence to affect the Guide","The Guide is unaffected by the Essence and no longer removes it. Kill the Guide first instead.")
  ],rotations:[]});

  extend(160,{steps:[
    step("trigger","Use the Obsidian Altar","Activate Dehkia's Lantern at the Void-Infested Obsidian Altar."),
    step("do","Destroy Obsidian Energy","Breaking Argos Obsidian Energy or Essence stuns nearby Crescent monsters; gather them tightly because the effect has limited range."),
    step("do","Group around the Gatekeeper","Use the stun to collapse the awakened forces around the Crescent Chief Gatekeeper."),
    step("avoid","Evade the chief attack","The Chief Gatekeeper's strongest strike cannot be safely blocked. Move or iframe instead.")
  ]});

  set(911,{source:source("Pearl Abyss","New Dehkia party zones","https://blackdesert.pearlabyss.com/TR/en-us/News/Notice/Detail?_boardNo=18722","2026-01-15"),summary:"Hold the three-player upper-Gyfin activation field, clear escalating Imperfect waves when the void destabilizes, then use the cleansed-aura reward window before restarting.",steps:[
    step("trigger","Activate the upper-Gyfin point","Bring the full three-player party to the marked Lantern site and start the fixed encounter."),
    step("watch","Read the void warning","When the void can no longer be controlled, Imperfect Ancient Weapon waves enter the field."),
    step("do","Complete the trial together","Keep the dangerous ranged and melee targets stacked within party-loot range until the trial is fully cleared."),
    step("do","Use the cleansed aura","Successful completion grants the cleansed-aura benefit; spend that window efficiently before beginning another cycle.")
  ],rotations:[...(guides["911"]?.rotations||[])]});

  set(912,{source:source("Pearl Abyss","New Dehkia party zones","https://blackdesert.pearlabyss.com/TR/en-us/News/Notice/Detail?_boardNo=18722","2026-01-15"),summary:"Destroy the three-player Mirumok waves while dispersed void awakens Old Mirumok, then prevent or survive its void absorption before the empowered attacks overwhelm the field.",steps:[
    step("trigger","Activate the Mirumok field","Start at the marked Lantern location with the complete three-player party."),
    step("do","Clear Ancient Weapons","Remove the summoned constructs while watching where the unstable dispersed void gathers."),
    step("watch","Prepare for Old Mirumok","The void awakens Old Mirumok and can be absorbed by it, changing the encounter into its dangerous empowered state."),
    step("avoid","Do not feed an uncontrolled absorption","Keep the party together and finish the required targets promptly; an absorbed Old Mirumok unleashes lethal attacks.")
  ],rotations:[...(guides["912"]?.rotations||[])]});

  set(919,{source:officialInnerEdania,summary:"Clear Magaia's sinner and Elion-follower packs while prioritizing the Knight and Priest threats, then move only after the active group is fully controlled.",steps:[
    step("do","Prioritize the clergy and knights","Focus the Elion-follower Knight and Priest targets before cleaning up the surrounding sinners."),
    step("watch","Prepare the correct resistance","Magaia uses the Stun, Stiffness, and Freeze control family. Keep the matching resistance setup active."),
    step("do","Finish the active group","Keep enemies compact and complete each group before advancing to the next temple pack."),
    step("avoid","Do not assume an undocumented phase","Current official guidance confirms the enemies and control family but not a special activation puzzle; follow the visible combat notices rather than imported mechanics.")
  ],rotations:[]});

  set(920,{source:officialInnerEdania,summary:"Fight Aresion's soldiers around the War Beacon, purify the Unholy Ember they leave behind, and use its strong combat benefit on the next concentrated group.",steps:[
    step("trigger","Engage at the War Beacon","Clear the soldiers gathered around the active beacon and keep the group close to the mechanic."),
    step("do","Purify the Unholy Ember","Resolve the ember left by the soldiers to obtain the zone's powerful temporary benefit."),
    step("do","Spend the benefit immediately","Carry the buff into the next ready pack and use major area damage while it is active."),
    step("avoid","Respect Knockdown and Bound","Aresion uses the Knockdown and Bound family. Do not remain in long frontal animations through the soldiers' marked attacks.")
  ],rotations:[]});

  set(921,{source:officialInnerEdania,summary:"In a three-player party, clear the followers gathered around the Scales of Judgment and defeat the forces of justice or vengeance that disturb its balance.",steps:[
    step("do","Stay as one party","Keep all three players in shared-loot range while circling the active Scales encounter."),
    step("trigger","Restore the balance","Defeat the justice- or vengeance-aligned followers called around the Scales as the combat notices direct."),
    step("do","Collapse priority targets","Assign one caller, stack the active followers, and burst them together before the next group develops."),
    step("avoid","Prepare group stun resistance","Scales uses Stun, Stiffness, and Freeze. Do not let staggered party positioning turn one control hit into a wipe.")
  ],rotations:[]});

  set(922,{source:officialInnerEdania,summary:"Cut through Event Horizon's Despairbringers, immediately remove Ibedor's commanding ranks, and keep each lethal pack controlled before moving deeper into the field.",steps:[
    step("do","Group the Despairbringers","Pull each active group into one compact area and keep damage focused instead of chasing scattered targets."),
    step("do","Prioritize commanding ranks","Remove Ibedor's commanders as soon as they enter; they are the encounter's highest-priority targets."),
    step("watch","Read every combat notice","The zone's current official guide identifies priority ranks rather than a fixed puzzle. Re-center when a new command group appears."),
    step("avoid","Prepare Stun resistance","Event Horizon uses Stun, Stiffness, and Freeze. Preserve an escape for overlapping marked attacks.")
  ],rotations:[]});

  extend(97,{steps:[
    step("trigger","Identify one active statue","Begin at red, blue, or purple and never aggro two statue groups at once."),
    step("do","Follow the counter order","Carry red's buff into blue, blue into purple, and purple into red; fight only while the matching advantage is active."),
    step("watch","Use event windows","A Decimator can call an experience wave. The Butcher event draws all three groups and grants a 60-second damage benefit after it is cleared."),
    step("avoid","Respect lethal patterns","Crusher, Guard, and Flamen attacks can kill through greedy damage. Finish the active statue before touching another cluster.")
  ]});

  extend(110,{steps:[
    step("do","Break the brazier first","Use the brazier or guardian interaction to debuff and knock down nearby Okjinsini."),
    step("do","Chain death explosions","Stack the pack so each defeated Okjinsini explosion damages the remaining monsters."),
    step("watch","Prepare for the snowstorm","Continued grinding can call Erebox or Erebjork. The harder boss reward can be shared by up to five nearby players."),
    step("avoid","Do not empower an elite","An elite brought beside a living lamp can receive a buff; destroy the object before the pull reaches it.")
  ]});

  extend(113,{steps:[
    step("trigger","Record the four symbols","Use a Forgotten Witch's Token and note the four center-crystal symbols required to unlock the golden chamber."),
    step("watch","Read the room objective","A room may ask you to defend Spires, carry five Soul flames to them, kill enough Souls, remove a heavy defense penalty through a Soul or Spire, or let Soul fireballs destroy the Spires."),
    step("do","Clear matching doors","Complete one required symbol room at a time and return through the central chamber after each success."),
    step("avoid","Do not claim blindly","Pure damage does not solve every room. The Token is consumed when the golden chest is claimed, so verify the run is complete first.")
  ]});

  extend(146,{steps:[
    step("trigger","Find an Eye of Despair","Use the Lantern at one of the four Eyes of Despair and clear the arriving Ahib waves."),
    step("do","Focus the Dark Knight","Ahib continue arriving after the Dark Knight appears, so stack the wave while removing the priority target."),
    step("watch","Prepare the right resistance","Dehkia Thornwood uses Knockback and Floating; use the matching resistance group."),
    step("avoid","Do not chase every arrival","Keep the fight anchored at the Eye so new waves enter the same damage area.")
  ]});

  extend(151,{steps:[
    step("trigger","Activate near Longleaf","Choose one of the five marked Cyclops Land sites and clear the short-lived opening monsters promptly."),
    step("avoid","Deny Cyclops healing","Cyclopes consume nearby boars to recover health. Separate or remove the boars before the heal can complete."),
    step("avoid","Control the Gargoyle kill order","Killing a Cyclops beside surviving Gargoyles enrages them. Finish the group cleanly and treat every heavy swing as lethal."),
    step("watch","Agris does not apply to Cyclops","Do not spend Agris Fever expecting it to increase the Cyclops rewards at this encounter.")
  ]});

  set(149,{source:source("Pearl Abyss","Winter Tree Fossil monster-zone guide","https://blackdesert.pearlabyss.com/Console/en-US/News/Notice/Detail?_boardNo=11880","2026-08-15"),summary:"Spend 100 Energy to start the hard Winter Tree Fossil, hold its stationary waves without exceeding the spawn limit, and prepare for the possible Erebjork event.",steps:[
    step("trigger","Choose Hard difficulty","Activate the black fossil with 100 Energy and confirm the 280 AP hard version before beginning."),
    step("do","Clear waves at the tower","Remain anchored and erase each summoned group quickly enough to keep the encounter advancing."),
    step("avoid","Do not exceed the spawn limit","The fossil can deactivate if too many summoned monsters remain alive. Item Drop Rate does not improve this encounter's rewards."),
    step("watch","Prepare for Erebjork","The special boss can appear during the run. Re-center and save a safe damage window for the event.")
  ],rotations:[]});

  set(150,{source:source("Pearl Abyss","Winter Tree Fossil monster-zone guide","https://blackdesert.pearlabyss.com/Console/en-US/News/Notice/Detail?_boardNo=11880","2026-08-15"),summary:"Spend 100 Energy to start the normal Winter Tree Fossil, clear its stationary waves before the spawn limit is reached, and react to the possible Erebjork event.",steps:[
    step("trigger","Choose Normal difficulty","Activate the black fossil with 100 Energy and confirm the 250 AP normal version."),
    step("do","Hold the tower","Clear each summoned wave at the fossil rather than trying to trace a field rotation."),
    step("avoid","Do not let waves accumulate","The encounter can deactivate when its spawned-monster limit is exceeded. Item Drop Rate does not affect its rewards."),
    step("watch","Prepare for Erebjork","A special boss event can interrupt the waves, so keep defensive cooldowns available.")
  ],rotations:[]});

  const routeCatalog={
    4:["Multiple solo loops","Choose one compact normal-Turo loop, clear every stacked pack, stop for Ulutuka when it appears, then resume the same order.","text-only","rotation-route"],
    5:["Valley golem sequence","Follow a consistent sequence of Olun golem packs around the valley; skip only isolated packs when the party would otherwise wait for respawns.","pending-original","rotation-route"],
    8:["Main, upper, or Marni room","The main room is the standard high-density route. Lower-geared players can limit the lap to the upper room, while Marni offers a compact alternative.","text-only","rotation-route"],
    10:["Loah-pot room cycle","Community convention uses two or three pot rooms: trigger one ready pot, finish its invasion, then rotate while that room recovers.","pending-original","rotation-route"],
    11:["Cave out-and-back","Clear the connected main cave corridor to its far end, U-turn, and work back toward the entrance as the first packs respawn.","text-only","rotation-route"],
    17:["Light-zone camp loop","Choose one compact Orc camp loop, free Fairies and kill Wizards while clearing, and add an adjacent camp only when the first has not respawned.","pending-original","rotation-route"],
    18:["Monastery loop and bell hold","Run a compact loop through dense packs. When a Crimson Bell drops, activate it at a safe central point, hold for its waves, then resume the loop.","pending-original","rotation-route"],
    27:["Ash Forest route families","Community routes include North or Main, Stair or South, and Cliff or Woods. Use a class-appropriate loop and preserve the Barnas-to-Seed pull order.","pending-original","rotation-route"],
    33:["Upper Gyfin party areas","Traditional party routes use Areas 1 through 4. Assign one cluster, have pullers stack its ranged mobs, and expand only when the party outruns respawns.","pending-original","rotation-route"],
    97:["Three-color statue cycle","This is a cluster cycle rather than a wide route: carry the counter buff red to blue, blue to purple, and purple to red.","text-only","encounter-layout"],
    110:["Brazier-cluster loop","Cycle between nearby Okjinsini brazier clusters, chain the object's explosion through each pack, then advance while the previous cluster respawns.","pending-original","rotation-route"],
    111:["Labyrinth room flow","Players clear separate repeating chambers, silence at least four rooms, then regroup through the Burrow for Vercedes; there is no overworld lap.","not-applicable","encounter-layout"],
    113:["Four-symbol room flow","Record the four center symbols, clear their matching door rooms one at a time, and return through the central chamber after every objective.","not-applicable","encounter-layout"],
    120:["Soul-event loop","Run a compact Giant pack loop, stop at each World-weary Soul for its ravening waves and Fighter, then resume with the freed-soul speed buff.","text-only","rotation-route"],
    121:["Ancient Troll clusters","Finish the active Ancient Troll and Shaman cluster before moving; rotate only after its awakened group has been petrified and cleared.","text-only","encounter-layout"],
    122:["Flag and supply cycle","Loop the guarded flags. Stop when Glorious Rhutums rush, destroy their burning supply boxes, then return to the same camp order.","text-only","rotation-route"],
    123:["Flag-pack cycle","Cycle nearby Saunil flags, refresh the flag benefit, and pause the route for the siege-tower event before continuing the same order.","text-only","rotation-route"],
    124:["Rift-to-rift cycle","Rotate between Rift of Despair pack areas, kill Witmirth, move while its stronger wave develops, and return when the rift is ready.","pending-original","rotation-route"],
    143:["Tier I Rift Seed encounter","Remain at one Rift Seed activation field and repeat its Volkras split sequence; this is a fixed encounter rather than a field rotation.","not-applicable","encounter-layout"],
    144:["Tier I Power Tower encounter","Stay at Olun's Power Tower through the roar, arm, and baby-golem phases, then reset at the same activation site.","not-applicable","encounter-layout"],
    145:["Six Tunkuta activation sites","Choose one of three Turo Charms or three Shaman Towers and hold that site's waves; do not path between all six during one encounter.","embedded","activation-map"],
    146:["Eye of Despair encounter","Select one of the four Eyes, hold the arriving Ahib and Dark Knight at that activation point, then restart there.","embedded","activation-map"],
    147:["City cluster loop","Follow a compact cluster loop around the node-manager area; interrupt each Messenger, finish the gathered pack, then advance.","pending-original","rotation-route"],
    148:["Tungrad pack loop","Use a compact route through Guide-led groups, kill each Guide to release its pack's defense, and move only after spending the Essence window.","pending-original","rotation-route"],
    149:["Hard fossil arena","The fossil is a stationary tower-wave encounter. Stay at one activated tower until the hard run and any Erebjork event are complete.","not-applicable","encounter-layout"],
    150:["Normal fossil arena","The fossil is a stationary tower-wave encounter. Stay at one activated tower until the normal run and any Erebjork event are complete.","not-applicable","encounter-layout"],
    151:["Five Cyclops activation sites","Choose one of five marked sites near Longleaf, hold the Cyclops and Gargoyle sequence there, then restart at the same point.","embedded","activation-map"],
    153:["Artifact pack loop","Follow a compact Darkseeker route, stop for every Blazing Ember and Sealed Artifact, then carry the control window into nearby packs.","pending-original","rotation-route"],
    155:["Two Aakman activation points","Choose either marked statue inside Aakman and hold its fixed Flamen encounter; the images identify activation objects, not two route loops.","embedded","activation-object"],
    156:["Two Hystria activation points","Choose either marked Guard Tower and hold Tutuka, alert, and Elten waves there; the images show encounter objects rather than rotations.","embedded","activation-object"],
    157:["Seculion station","Stay at Seculion, follow the active leg and safety zones, burst the exposed core, and complete the final arena sequence without leaving the machine.","not-applicable","encounter-layout"],
    158:["Two Sulfur activation sites","Choose the northern or eastern device, hold the sulfur-bundle and water-stream sequence there, and restart at that point.","embedded","activation-map"],
    159:["Two Pila Ku rooms","Choose either inner-jail activation bell and hold the Executioner and alarm waves inside that room; the references show objects, not pack paths.","embedded","activation-object"],
    160:["Crescent altar encounter","Remain at the Obsidian Altar, group enemies around destroyable Obsidian Energy, and finish the Gatekeeper at the same site.","embedded","activation-map"],
    161:["Tier II Olun encounter","Stay at the Tier II Olun activation field, kill the absorbed main construct, then sweep the divided golems formed from its fragments.","not-applicable","encounter-layout"],
    162:["Tier II Gairas encounter","Remain at the activation field, alternate Gairas damage with roaming Volkras and Barnas clears, then reset after Gairas returns and falls.","not-applicable","encounter-layout"],
    163:["Cadry Cannon encounter","Choose one marked Cannon, hold its soldiers and commanders around the object, then defeat the frenzied Commander called by the void.","embedded","activation-map"],
    165:["Honglim short loop","Run a compact bandit-and-sentry loop, free Foxfire when found, and repeat while counting the third and sixth boss groups for Sharpshooter.","pending-original","rotation-route"],
    166:["Six Kkebidol stations","Choose one of six stationary statue sites and repeat its Dokkebi and Duoksini cycle; the stations are independent encounters, not one connected lap.","text-only","rotation-sites"],
    167:["Fortunate cave lap","Clear every pack in the private cave to complete one lap, repeat five laps for the Pig King, then use the timed scroll during the re-entry cooldown.","text-only","encounter-layout"],
    168:["Unlucky cave lap","Clear every pack in the private cave to complete one lap, repeat five laps for the Pig King, then use the timed scroll during the re-entry cooldown.","text-only","encounter-layout"],
    169:["Orzekea alert field","Remain in the Marni Sol Magia field, clear packs to raise alert, eliminate each reinforcement wave, and defeat Alketa before resetting there.","not-applicable","encounter-layout"],
    901:["Aetherion tower cycle","Start at the Root Spirit, feed kills into the active blue circles, use the lightning-orb phase, defeat Muraka, and restart at the center.","text-only","encounter-layout"],
    902:["Nymphamare pillar cycle","Move pillar to pillar while killing Shamans, stop for every Rusalka Eye, defeat the boss, and use the central launch circle for the final phase.","text-only","encounter-layout"],
    903:["Orbita six-pillar cycle","Clear the six outer pillars in sequence with their golems, return to the center, defeat Titan, then use the free-kill phase before restarting.","text-only","encounter-layout"],
    904:["Tenebraum four-tower cycle","Clear all four outer towers in order, use each Seer's stun, defeat the retreating Manticore phases, then restart after the free-kill minute.","text-only","encounter-layout"],
    905:["Zephyros tower cycle","Hold the central tower waves, rotate through all three Shadow Knights, defeat Beelzebub, and restart after the automatic-kill phase.","text-only","encounter-layout"],
    906:["Zephyros Floodlands area","Choose the Zephyros variant area, then move pack to pack between its black-and-white circles while the party handles all three protection orbs.","embedded","zone-overview"],
    907:["Debris-to-debris field","Move through the current Star's End field one debris object at a time, detonating only after its complete pack is stacked.","pending-original","rotation-route"],
    908:["Current Lower Sycraia loop","Follow a compact indoor loop while feeding engaged Ancient Weapons to the Memory and detouring immediately for the three priority objects.","pending-original","rotation-route"],
    909:["Orbita Floodlands area","Choose the Orbita variant area, then move pack to pack between its black-and-white circles while the party handles all three protection orbs.","embedded","zone-overview"],
    910:["Great Red Sea Floodlands area","Choose the Great Red Sea variant area, then move pack to pack between its black-and-white circles while the party handles all three protection orbs.","embedded","zone-overview"],
    911:["Upper-Gyfin trial field","Stay at the marked three-player activation field through the Imperfect waves and cleansed-aura trial; this is not the normal Gyfin Area 1–4 route.","embedded","activation-map"],
    912:["Mirumok trial field","Stay at the marked three-player encounter area, clear Ancient Weapons and Old Mirumok's void sequence, then restart at the same point.","embedded","zone-overview"],
    916:["Seven Gavinya stations","Community maps number seven independent stations. Choose a compact station sequence that matches your clear speed and finish each awakened group before its Stalagmite.","pending-original","rotation-sites"],
    917:["Eleven independent Aphrodon sites","Pick one of the eleven marked grind locations and work that site's scarecrows and tree cycle; do not connect all eleven into one route.","embedded","rotation-sites"],
    918:["Hermesia tower-and-crystal flow","Clear the main tower, first crystal, second crystal, and dragon phase in sequence, then reset at the same encounter.","text-only","encounter-layout"],
    919:["Magaia temple packs","Move between ready sinner and Elion-follower groups, prioritize Knights and Priests, and complete each pack before advancing.","pending-original","rotation-route"],
    920:["Aresion beacon packs","Cycle ready War Beacon groups, purify each Unholy Ember, and carry its benefit directly into the next concentrated pack.","pending-original","rotation-route"],
    921:["Scales party encounter","Circle the Scales as one three-player group and resolve each justice or vengeance follower wave before the next balance phase.","pending-original","encounter-layout"],
    922:["Event Horizon priority loop","Move pack to pack through Despairbringers, stopping to collapse every Ibedor command group before advancing deeper.","pending-original","rotation-route"]
  };

  for(const [id,spec] of Object.entries(routeCatalog)){
    const guide=guides[id];
    if(!guide)continue;
    const [title,caption,rawStatus,rawKind]=spec;
    const routeStatus=rawStatus==="not-applicable"?rawStatus:"text-only";
    const visualKind=["activation-map","activation-object","zone-overview"].includes(rawKind)?"encounter-layout":rawKind;
    guide.rotations=[...(Array.isArray(guide.rotations)?guide.rotations:[]),route(title,caption,routeStatus,visualKind)];
  }

  const imageMeta={
    "dehkia-ash-forest-location.png":{title:"Rift Seed activation sites",caption:"Official world-map view of the designated Rift Seed activation sites.",visualKind:"activation-map"},
    "dehkia-olun-location-1.jpg":{title:"Olun Power Tower",caption:"Official in-world view of the Voidtouched Olun's Power Tower used to begin the encounter.",visualKind:"activation-object"},
    "dehkia-olun-location-2.png":{title:"Olun activation sites",caption:"Official world-map view of the designated Olun activation sites.",visualKind:"activation-map"},
    "dehkia-tunkuta-location.png":{title:"Tunkuta activation sites",caption:"Official world-map view of the six Turo Charm and Shaman Tower activation sites.",visualKind:"activation-map"},
    "dehkia-thornwood-location.png":{title:"Eyes of Despair",caption:"Official world-map view of the Eyes of Despair activation area.",visualKind:"activation-map"},
    "dehkia-cyclops-location.png":{title:"Cyclops activation sites",caption:"Official world-map view of the five Cyclops Land activation sites near Longleaf.",visualKind:"activation-map"},
    "dehkia-aakman-location-1.png":{title:"Aakman activation statue",caption:"First official in-world view of an Aakman Dehkia activation statue.",visualKind:"activation-object"},
    "dehkia-aakman-location-2.png":{title:"Aakman encounter statue",caption:"Second official in-world view of an Aakman activation statue during the encounter.",visualKind:"activation-object"},
    "dehkia-hystria-location-1.png":{title:"Hystria Guard Tower",caption:"First official in-world view of a Hystria Guard Tower activation point.",visualKind:"activation-object"},
    "dehkia-hystria-location-2.png":{title:"Hystria encounter tower",caption:"Second official in-world view of a Hystria Guard Tower during the encounter.",visualKind:"activation-object"},
    "dehkia-pila-ku-location-1.png":{title:"Pila Ku activation bell",caption:"First official in-world view of a Pila Ku Dehkia activation bell.",visualKind:"activation-object"},
    "dehkia-pila-ku-location-2.jpg":{title:"Pila Ku encounter bell",caption:"Second official in-world view of a Pila Ku activation bell during the encounter.",visualKind:"activation-object"},
    "dehkia-sulfur-location-1.png":{title:"Sulfur activation device",caption:"Official in-world view of the Roud Sulfur Dehkia activation device.",visualKind:"activation-object"},
    "dehkia-sulfur-location-2.png":{title:"Sulfur activation sites",caption:"Official world-map view of the two Roud Sulfur activation sites.",visualKind:"activation-map"},
    "dehkia-crescent-location-1.png":{title:"Obsidian Altar",caption:"Official in-world view of the Void-Infested Obsidian Altar.",visualKind:"activation-object"},
    "dehkia-crescent-location-2.png":{title:"Crescent activation sites",caption:"Official world-map view of the designated Crescent activation sites.",visualKind:"activation-map"},
    "dehkia-cadry-location-1.png":{title:"Cadry Cannon",caption:"Official in-world view of a void-infested Cadry Cannon.",visualKind:"activation-object"},
    "dehkia-cadry-location-2.png":{title:"Cadry activation sites",caption:"Official world-map view of the Cadry Cannon activation sites.",visualKind:"activation-map"},
    "dehkia-mirumok-location.png":{title:"Mirumok encounter area",caption:"Official world-map overview of the Dehkia Mirumok encounter area; it is not a pack-to-pack route.",visualKind:"zone-overview"},
    "dehkia-gyfin-location.png":{title:"Upper-Gyfin activation sites",caption:"Official world-map view of the upper-Gyfin Dehkia activation sites.",visualKind:"activation-map"},
    "aphrodon-rotations.png":{title:"Eleven Aphrodon grind sites",caption:"Eleven known Aphrodon grind locations; this does not prescribe a path between packs.",visualKind:"rotation-sites"},
    "floodlands-rotations.png":{title:"Dark Energy Floodlands regions",caption:"Overview of the three Dark Energy Floodlands variants; this is not an in-zone rotation path.",visualKind:"zone-overview"}
  };

  for(const guide of Object.values(guides)){
    guide.rotations=(guide.rotations||[]).map(item=>{
      if(!item.image)return item;
      const file=String(item.image).split("/").pop();
      const meta=imageMeta[file];
      return meta?{...item,...meta,routeStatus:"embedded"}:item;
    });
  }

  const crossChecks={
    combat:source("Pearl Abyss","Current monster-zone combat update","https://blackdesert.pearlabyss.com/Asia/en-us/News/Notice/Detail?_boardNo=7955","2025-07-24"),
    dehkia:source("Garmoth","Dehkia's Lantern mechanics","https://garmoth.com/guides/post/dehkias-lantern","2026-08-15"),
    calpheon:source("Garmoth","Elvia Realm: Calpheon","https://garmoth.com/guides/post/elvia-realm-calpheon/","2026-08-15"),
    winter:source("Pearl Abyss","Mountain of Eternal Winter monster zones","https://blackdesert.pearlabyss.com/Console/en-US/News/Notice/Detail?_boardNo=11880","2026-08-15"),
    inner:officialInnerEdania,
    outerOne:source("Pearl Abyss","Aetherion, Nymphamare, and Orbita release","https://blackdesert.pearlabyss.com/Asia/en-US/News/Notice/Detail?_boardNo=8017","2025-08-21"),
    outerTwo:source("Pearl Abyss","Tenebraum and Zephyros release","https://blackdesert.pearlabyss.com/Asia/en-US/News/Notice/Detail?_boardNo=8063","2025-09-11"),
    floodlands:source("Pearl Abyss","Dark Energy Floodlands release","https://blackdesert.pearlabyss.com/Asia/en-US/News/Notice/Detail?_boardNo=12986","2026-03-19"),
    tunkuta:source("Pearl Abyss","Tunkuta monster-zone guide","https://www.tr.playblackdesert.com/en-US/Wiki?wikiNo=196","2026-08-15"),
    ash:source("Tyler Games","Ash Forest pull-mechanics report","https://tyler-games.com/2023/08/06/grinding-report-61/","2023-08-06"),
    crypt:source("Korean Inven","Current Crypt room and elite guide","https://www.inven.co.kr/board/black/5994/1779","2026-08-15"),
    padix:source("Reddit community","Current solo Padix pot behavior","https://www.reddit.com/r/blackdesertonline/comments/1e88bgj","2026-08-15"),
    murrowak:source("Grumpy Green","Murrowak chamber and Queen flow","https://grumpygreen.cricket/murrowak/","2026-08-15"),
    sycraia:source("Yumechoco","Renewed Sycraia Lower mechanics","https://yumechoco.net/blackdesert-sycriaia-underwater-ruins/","2026-08-15"),
    honglim:source("Garmoth","Land of the Morning Light monster zones","https://garmoth.com/guides/post/land-of-the-morning-light-grind-zones","2026-08-15"),
    gyfinParty:source("Inven Global","Upper Gyfin party pulls","https://www.invenglobal.com/blackdesertonline/articles/3530/guide-on-party-grinding-in-gyfin-rhasia-temple-the-highest-level-grind-spot-in-kamasylvia-part-2","2026-08-15")
  };
  const attach=(ids,reference)=>ids.forEach(id=>{const guide=guides[String(id)];if(guide)guide.sources=[guide.source,reference]});
  attach([5,17,18,97,147,148,153,167,168],crossChecks.combat);
  attach([110,113,149,150],crossChecks.winter);
  attach([120,121,122,123,124],crossChecks.calpheon);
  attach([143,144,145,146,151,155,156,158,159,160,161,162,163],crossChecks.dehkia);
  attach([901,902,903],crossChecks.outerOne);
  attach([904,905],crossChecks.outerTwo);
  attach([906,909,910],crossChecks.floodlands);
  attach([917,918,919,920,921,922],crossChecks.inner);
  attach([4],crossChecks.tunkuta);
  attach([8],crossChecks.crypt);
  attach([10],crossChecks.padix);
  attach([27],crossChecks.ash);
  attach([33],crossChecks.gyfinParty);
  attach([111],crossChecks.murrowak);
  attach([165,166],crossChecks.honglim);
  attach([908],crossChecks.sycraia);
  attach([911,912],crossChecks.dehkia);
  for(const guide of Object.values(guides))if(!guide.sources)guide.sources=[guide.source];

  bundle.schemaVersion=2;
  bundle.generatedAt="2026-08-15";
  bundle.guideCount=Object.keys(guides).length;
})();
