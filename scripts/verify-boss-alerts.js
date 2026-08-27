"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const repoRoot = path.resolve(__dirname, "..");
const appScript = fs.readFileSync(path.join(
  repoRoot,
  "Source Code",
  "BlackSpiritHub.Resources.Black_Spirit_Hub.js"), "utf8");
const appHtml = fs.readFileSync(path.join(
  repoRoot,
  "Source Code",
  "BlackSpiritHub.Resources.Black_Spirit_Hub.html"), "utf8");
const appCss = fs.readFileSync(path.join(
  repoRoot,
  "Source Code",
  "BlackSpiritHub.Resources.Black_Spirit_Hub.css"), "utf8");

function extractFunction(name) {
  let start = appScript.indexOf(`function ${name}(`);
  if (start >= 6 && appScript.slice(start - 6, start) === "async ") {
    start -= 6;
  }
  if (start < 0) {
    throw new Error(`Could not extract ${name} from the application script.`);
  }
  const bodyStart = appScript.indexOf("{", start);
  if (bodyStart < 0) throw new Error(`Could not locate the body of ${name}.`);

  let depth = 0;
  let mode = "code";
  let escaped = false;
  const templateExpressionDepths = [];
  for (let index = bodyStart; index < appScript.length; index++) {
    const character = appScript[index];
    const next = appScript[index + 1];
    if (mode === "line-comment") {
      if (character === "\n") mode = "code";
      continue;
    }
    if (mode === "block-comment") {
      if (character === "*" && next === "/") { mode = "code"; index++; }
      continue;
    }
    if (mode === "single" || mode === "double") {
      if (escaped) { escaped = false; continue; }
      if (character === "\\") { escaped = true; continue; }
      if ((mode === "single" && character === "'") || (mode === "double" && character === '"')) mode = "code";
      continue;
    }
    if (mode === "template") {
      if (escaped) { escaped = false; continue; }
      if (character === "\\") { escaped = true; continue; }
      if (character === "`") { mode = "code"; continue; }
      if (character === "$" && next === "{") {
        depth++;
        templateExpressionDepths.push(depth);
        mode = "code";
        index++;
      }
      continue;
    }
    if (character === "/" && next === "/") { mode = "line-comment"; index++; continue; }
    if (character === "/" && next === "*") { mode = "block-comment"; index++; continue; }
    if (character === "'") { mode = "single"; continue; }
    if (character === '"') { mode = "double"; continue; }
    if (character === "`") { mode = "template"; continue; }
    if (character === "{") { depth++; continue; }
    if (character !== "}") continue;
    if (templateExpressionDepths.at(-1) === depth) {
      depth--;
      templateExpressionDepths.pop();
      mode = "template";
      continue;
    }
    depth--;
    if (depth === 0) return appScript.slice(start, index + 1);
  }
  throw new Error(`Could not locate the end of ${name}.`);
}

function requireMatch(pattern, description) {
  const match = appScript.match(pattern);
  if (!match) {
    throw new Error(`Could not locate ${description} in the application script.`);
  }
  return match[0];
}

function requireLineContaining(token, description) {
  const line = appScript.split(/\r?\n/).find(candidate => candidate.includes(token));
  if (!line) throw new Error(`Could not locate ${description} in the application script.`);
  return line;
}

function openingTagWithId(id) {
  const match = appHtml.match(new RegExp(`<[^>]+\\bid=["']${id}["'][^>]*>`, "i"));
  if (!match) throw new Error(`Missing #${id} from the Home notification interface.`);
  return match[0];
}

function sameJson(actual, expected) {
  if (!actual || !expected || typeof actual !== "object" || typeof expected !== "object") return actual === expected;
  const actualKeys = Object.keys(actual).sort();
  const expectedKeys = Object.keys(expected).sort();
  return actualKeys.join("\u0000") === expectedKeys.join("\u0000")
    && actualKeys.every(key => actual[key] === expected[key]);
}

const extractedCode = [
  "let savedHomeSettings = {};",
  "let savedNotificationAudioSettings = {};",
  "let savedDeliverySettings = null;",
  "let bridgeCalls = [];",
  "let bridgePayloads = [];",
  "let bridgeFailures = new Set();",
  "let bridgeResponses = new Map();",
  "let scheduleSpawns = [];",
	"const testTtsButton={disabled:false,textContent:'Test TTS',attributes:{},setAttribute(name,value){this.attributes[name]=value},removeAttribute(name){delete this.attributes[name]}};",
	"const testAlarmButton={disabled:false,textContent:'Test Alarm',attributes:{},setAttribute(name,value){this.attributes[name]=value},removeAttribute(name){delete this.attributes[name]}};",
	"const addVoicesButton={disabled:false,textContent:'Add voices',listeners:{},addEventListener(name,listener){this.listeners[name]=listener}};",
	"const collapseLabel={textContent:''};",
	"const collapseButton={attributes:{},title:'',setAttribute(name,value){this.attributes[name]=value},querySelector(){return collapseLabel}};",
	"const collapsePanel={classList:{values:new Set(),toggle(name,force){if(force)this.values.add(name);else this.values.delete(name)}}};",
	"const collapseContent={hidden:false};",
	"const volumeInput={value:'50',attributes:{},style:{values:{},setProperty(name,value){this.values[name]=value}},setAttribute(name,value){this.attributes[name]=value}};",
	"const volumeValue={textContent:'50%'};",
	"const voiceSelect={disabled:true,value:'',options:[],selectedOptions:[],replaceChildren(...items){this.options=[...items]},append(item){this.options.push(item)}};",
	"const document={createElement(){return{value:'',textContent:''}}};",
	"const bossFooter={textContent:'Settings are saved automatically.',dataset:{}};",
	"const homeEl={panel:collapsePanel,collapse:collapseButton,content:collapseContent,volume:volumeInput,volumeValue,voice:voiceSelect,addVoices:addVoicesButton,testTts:testTtsButton,testAlarm:testAlarmButton,footer:bossFooter};",
  "function readSetting(name,fallback){ if(name==='homeSettings')return savedHomeSettings; if(name==='notificationAudioSettings')return savedNotificationAudioSettings; return fallback; }",
  "function persistSetting(name,value){ if(name==='notificationAudioSettings')savedNotificationAudioSettings=JSON.parse(JSON.stringify(value)); }",
  "function defaultBossSelection(){ return { Kzarka:true, Garmoth:true, Vell:true }; }",
  "function allBossSpawns(){ return scheduleSpawns; }",
  "let guildTargetValue = null;",
  "function guildBossTarget(){ return guildTargetValue; }",
  "function guildBossDayName(){ return 'Wednesday'; }",
  "function fmtSpawnDateTime(){ return 'Wednesday 20:00 CEST'; }",
  "const HOME_TIMER_CONFIG={region:'EU'};",
  "function pruneHomeNotifications(){}",
  "function saveHomeSettings(settings){ savedHomeSettings = JSON.parse(JSON.stringify(settings)); savedDeliverySettings = JSON.parse(JSON.stringify(settings)); }",
  "function bridgeCall(command,payload){ bridgeCalls.push(command); bridgePayloads.push({command,payload:JSON.parse(JSON.stringify(payload??null))}); return bridgeFailures.has(command) ? Promise.reject(new Error(command + ' failed')) : Promise.resolve(bridgeResponses.has(command)?bridgeResponses.get(command):{ok:true}); }",
  "const NotificationService={ShowInfo(){},ShowWarning(){},ShowError(){},ShowSuccess(){}};",
  requireMatch(/const DEFAULT_NOTIFICATION_VOLUME_PERCENT=50;/, "the default notification volume"),
  requireMatch(/const MAX_TTS_VOICE_ID_LENGTH=\d+;/, "the native voice-token length limit"),
  extractFunction("normalizeNotificationVolumePercent"),
  extractFunction("normalizeTtsVoiceId"),
  extractFunction("normalizedNotificationAudioSettings"),
  extractFunction("saveNotificationAudioSettings"),
  extractFunction("normalizedHomeSettings"),
  extractFunction("applyBossNotifyCollapse"),
  extractFunction("applyNotificationAudioSettings"),
  requireMatch(/const homeAlertInFlight=new Set\(\);/, "the in-flight delivery guard"),
  requireMatch(/const HOME_SPAWNING_NOW_GRACE_MS=60\*1000;/, "the Spawning Now polling grace window"),
  requireMatch(/const HOME_ALERT_MILESTONES=Object\.freeze\(\[0,5,10,15,30\]\);/, "the ordered boss alert milestones"),
  extractFunction("alertStage"),
  extractFunction("alertLeadText"),
  extractFunction("spokenBossList"),
  extractFunction("nextAlertableBossSpawn"),
  extractFunction("sendHomeAlert"),
  extractFunction("persistDeliveredHomeAlert"),
  extractFunction("migrateLegacyHomeAlert"),
  extractFunction("checkBossNotifications"),
  extractFunction("checkGuildBossNotifications"),
  "let ttsVoiceLoadPromise=null;",
  extractFunction("populateEnglishTtsVoices"),
  extractFunction("initializeTtsVoiceSelector"),
  extractFunction("setBossAlertTestStatus"),
  requireLineContaining('homeEl.addVoices?.addEventListener("click"', "the Add voices click handler"),
  extractFunction("runBossAlertTest"),
  extractFunction("bossTestTtsText"),
  extractFunction("runBossTtsTest"),
  extractFunction("runBossAlarmTest"),
  "globalThis.alertTests={normalizedNotificationAudioSettings,saveNotificationAudioSettings,normalizedHomeSettings,applyBossNotifyCollapse,applyNotificationAudioSettings,populateEnglishTtsVoices,initializeTtsVoiceSelector,alertStage,nextAlertableBossSpawn,sendHomeAlert,persistDeliveredHomeAlert,migrateLegacyHomeAlert,checkBossNotifications,checkGuildBossNotifications,bossTestTtsText,runBossTtsTest,runBossAlarmTest,setSaved:value=>{savedHomeSettings=value},setAudioSaved:value=>{savedNotificationAudioSettings=value},getAudioSaved:()=>JSON.parse(JSON.stringify(savedNotificationAudioSettings)),setSpawns:value=>{scheduleSpawns=value},setGuildTarget:value=>{guildTargetValue=value},setFailures:value=>{bridgeFailures=new Set(value)},setBridgeResponse:(command,value)=>{bridgeResponses.set(command,value)},resetVoiceLoader:()=>{ttsVoiceLoadPromise=null},resetCalls:()=>{bridgeCalls=[];bridgePayloads=[]},getCalls:()=>bridgeCalls.slice(),getPayloads:()=>bridgePayloads.slice(),getSavedDelivery:()=>savedDeliverySettings,getTestTtsButton:()=>testTtsButton,getTestAlarmButton:()=>testAlarmButton,getAddVoicesState:()=>({disabled:addVoicesButton.disabled,text:addVoicesButton.textContent,footer:bossFooter.textContent,footerState:bossFooter.dataset.state}),clickAddVoices:()=>addVoicesButton.listeners.click?.(),getCollapseState:()=>({collapsed:collapsePanel.classList.values.has('isCollapsed'),hidden:collapseContent.hidden,expanded:collapseButton.attributes['aria-expanded'],title:collapseButton.title,label:collapseLabel.textContent}),getVolumeState:()=>({value:volumeInput.value,text:volumeValue.textContent,aria:volumeInput.attributes['aria-valuetext'],fill:volumeInput.style.values['--boss-volume']}),getVoiceState:()=>({disabled:voiceSelect.disabled,value:voiceSelect.value,options:voiceSelect.options.map(option=>({value:option.value,text:option.textContent}))})};"
].join("\n");

const context = { console:{ debug(){}, warn(){}, log(){}, error(){} } };
vm.createContext(context);
vm.runInContext(extractedCode, context);
const tests = context.alertTests;

if (!/<option\b[^>]*\bvalue=["']0["'][^>]*>\s*Spawning Now\s*<\/option>/i.test(appHtml)) {
  throw new Error("The First alert selector must offer a Spawning Now option with value 0.");
}
if (!/TTS announcements<\/strong><span>Speak boss alerts with an installed English Windows voice<\/span>/i.test(appHtml)) {
  throw new Error("The TTS setting must explain that alerts use an installed English Windows voice.");
}

const volumeInputTag = openingTagWithId("bossNotificationVolume");
if (!/^<input\b/i.test(volumeInputTag)
  || !/\btype=["']range["']/i.test(volumeInputTag)
  || !/\bmin=["']0["']/i.test(volumeInputTag)
  || !/\bmax=["']100["']/i.test(volumeInputTag)
  || !/\baria-label=["'][^"']*volume[^"']*["']/i.test(volumeInputTag)) {
  throw new Error("The notification volume control must be an accessible 0-100 range slider.");
}
openingTagWithId("bossNotificationVolumeValue");
const voiceSelectTag = openingTagWithId("bossTtsVoice");
if (!/^<select\b/i.test(voiceSelectTag)
  || !/\baria-label=["'][^"']*(?:voice|text.to.speech)[^"']*["']/i.test(voiceSelectTag)) {
  throw new Error("The installed-English TTS voice control must be an accessible select element.");
}
const addVoicesTag = openingTagWithId("bossAddVoices");
if (!/^<button\b/i.test(addVoicesTag)
  || !/\btype=["']button["']/i.test(addVoicesTag)
  || !/\bclass=["'][^"']*bossAddVoices[^"']*["']/i.test(addVoicesTag)
  || !/\btitle=["']Open Windows Speech settings["']/i.test(addVoicesTag)
  || !/<button\b[^>]*\bid=["']bossAddVoices["'][^>]*>\s*Add voices\s*<\/button>/i.test(appHtml)
  || !/<small>Choose an installed English Windows voice\. New voices appear after restarting Black Spirit Hub\.<\/small>/i.test(appHtml)) {
  throw new Error("The TTS voice picker must include the exact Add voices button and restart guidance.");
}
const collapseButtonTag = openingTagWithId("bossNotifyCollapse");
const collapseButtonCss = appCss.match(/\.bossNotifyCollapse\s*\{([^}]*)\}/i)?.[1] || "";
if (!/^<button\b/i.test(collapseButtonTag)
  || !/\btype=["']button["']/i.test(collapseButtonTag)
  || !/\bclass=["'][^"']*bossNotifyCollapse[^"']*["']/i.test(collapseButtonTag)
  || !/\baria-expanded=["']true["']/i.test(collapseButtonTag)
  || !/\baria-controls=["']bossNotifyContent["']/i.test(collapseButtonTag)
  || !/\bborder\s*:/.test(collapseButtonCss)
  || !/\bbackground\s*:/.test(collapseButtonCss)) {
  throw new Error("Boss Notifications must use a boxed disclosure button with correct expanded-state semantics.");
}
openingTagWithId("bossNotifyContent");
if (!/getElementById\(["']bossNotificationVolume["']\)/.test(appScript)
  || !/getElementById\(["']bossNotificationVolumeValue["']\)/.test(appScript)
  || !/getElementById\(["']bossTtsVoice["']\)/.test(appScript)
  || !/getElementById\(["']bossAddVoices["']\)/.test(appScript)
  || !/getElementById\(["']bossNotifyCollapse["']\)/.test(appScript)
  || !/getElementById\(["']bossNotifyContent["']\)/.test(appScript)
  || !/bridgeCall\(["']getEnglishTtsVoices["']/.test(appScript)
  || !/bridgeCall\(["']openSpeechSettings["']\s*,\s*\{\s*\}\s*\)/.test(appScript)
  || !/notificationsCollapsed\s*:\s*saved\.notificationsCollapsed\s*===\s*true/.test(appScript)) {
  throw new Error("Notification audio, installed-English voice discovery, or collapsible-panel JavaScript wiring is incomplete.");
}

for (const [saved, expectedVolume, expectedVoice] of [
  [{}, 50, ""],
  [{ volumePercent:"not-a-number", voiceId:42 }, 50, ""],
  [{ volumePercent:-12, voiceId:"voice-low" }, 0, "voice-low"],
  [{ volumePercent:0, voiceId:"voice-muted" }, 0, "voice-muted"],
  [{ volumePercent:49.6, voiceId:"voice-rounded" }, 50, "voice-rounded"],
  [{ volumePercent:100, voiceId:"voice-max" }, 100, "voice-max"],
  [{ volumePercent:180, voiceId:"voice-clamped" }, 100, "voice-clamped"]
]) {
  tests.setAudioSaved(saved);
  const normalized = tests.normalizedNotificationAudioSettings();
  if (normalized.volumePercent !== expectedVolume || normalized.voiceId !== expectedVoice) {
    throw new Error(`Notification audio normalization failed: ${JSON.stringify({saved, normalized, expectedVolume, expectedVoice})}`);
  }
}
tests.saveNotificationAudioSettings({ volumePercent:64, voiceId:"voice-persisted" });
if (!sameJson(tests.getAudioSaved(), { volumePercent:64, voiceId:"voice-persisted" })) {
  throw new Error("Notification volume and voice selection were not persisted together.");
}

tests.setSaved({ ttsEnabled:true, soundEnabled:true, leadMinutes:10 });
let settings = tests.normalizedHomeSettings();
if (!settings.ttsEnabled || !settings.soundEnabled || settings.leadMinutes !== 10 || settings.notificationsCollapsed !== false) {
  throw new Error("TTS and Alarm.mp3 must remain independently enabled.");
}

tests.setSaved({ notificationsCollapsed:true });
if (tests.normalizedHomeSettings().notificationsCollapsed !== true) {
  throw new Error("The collapsed Boss Notifications state must persist as an explicit boolean.");
}
tests.setSaved({ notificationsCollapsed:"true" });
if (tests.normalizedHomeSettings().notificationsCollapsed !== false) {
  throw new Error("Non-boolean Boss Notifications collapse state must normalize to expanded.");
}

tests.applyBossNotifyCollapse(true);
let collapseState = tests.getCollapseState();
if (!collapseState.collapsed || !collapseState.hidden || collapseState.expanded !== "false"
  || collapseState.title !== "Expand boss notifications" || collapseState.label !== collapseState.title) {
  throw new Error(`Collapsed Boss Notifications state is inaccessible or incomplete: ${JSON.stringify(collapseState)}`);
}
tests.applyBossNotifyCollapse(false);
collapseState = tests.getCollapseState();
if (collapseState.collapsed || collapseState.hidden || collapseState.expanded !== "true"
  || collapseState.title !== "Collapse boss notifications" || collapseState.label !== collapseState.title) {
  throw new Error(`Expanded Boss Notifications state is inaccessible or incomplete: ${JSON.stringify(collapseState)}`);
}

tests.applyNotificationAudioSettings({ volumePercent:0, voiceId:"" });
let volumeState = tests.getVolumeState();
if (volumeState.value !== "0" || volumeState.text !== "Muted" || volumeState.aria !== "Muted" || volumeState.fill !== "0%") {
  throw new Error(`The volume slider did not render the mute boundary correctly: ${JSON.stringify(volumeState)}`);
}
tests.applyNotificationAudioSettings({ volumePercent:37, voiceId:"" });
volumeState = tests.getVolumeState();
if (volumeState.value !== "37" || volumeState.text !== "37%" || volumeState.aria !== "37 percent" || volumeState.fill !== "37%") {
  throw new Error(`The volume slider did not render its persisted percentage correctly: ${JSON.stringify(volumeState)}`);
}

tests.setSaved({ leadMinutes:999 });
settings = tests.normalizedHomeSettings();
if (settings.leadMinutes !== 15) {
  throw new Error("Unsupported alert lead times must fall back to 15 minutes.");
}

tests.setSaved({ leadMinutes:0 });
settings = tests.normalizedHomeSettings();
if (settings.leadMinutes !== 0) {
  throw new Error("Spawning Now must remain a selectable zero-minute first alert.");
}

const alertKeyBase = "boss|2026-07-29T12:00:00.000Z";
const expectedMilestones = new Map([
  [0, [0]],
  [5, [5, 0]],
  [10, [10, 5, 0]],
  [15, [15, 10, 5, 0]],
  [30, [30, 15, 10, 5, 0]]
]);
for (const [leadMinutes, milestones] of expectedMilestones) {
  settings = { leadMinutes, notified:{} };
  if (tests.alertStage(settings, leadMinutes * 60 * 1000 + 1, alertKeyBase) !== null) {
    throw new Error(`${leadMinutes}-minute alerts started before the selected threshold.`);
  }
  for (let index = 0; index < milestones.length; index++) {
    const milestone = milestones[index];
    if (tests.alertStage(settings, milestone * 60 * 1000, alertKeyBase) !== milestone) {
      throw new Error(`${leadMinutes}-minute selection did not trigger its ${milestone}-minute milestone.`);
    }
    settings.notified[`${alertKeyBase}|${milestone}`] = true;
    const nextMilestone = milestones[index + 1];
    const betweenMilestones = nextMilestone
      ? nextMilestone * 60 * 1000 + 1
      : 1;
    if (tests.alertStage(settings, betweenMilestones, alertKeyBase) !== null) {
      throw new Error(`The ${milestone}-minute milestone repeated before the next threshold.`);
    }
  }
}

settings = { leadMinutes:30, notified:{} };
if (tests.alertStage(settings, 4 * 60 * 1000, alertKeyBase) !== 5) {
  throw new Error("Starting late must emit only the current 5-minute milestone, not older warnings.");
}
settings.notified[`${alertKeyBase}|5`] = true;
if (tests.alertStage(settings, 4 * 60 * 1000, alertKeyBase) !== null) {
  throw new Error("A delivered milestone must remain suppressed without backfilling older warnings.");
}
if (tests.alertStage(settings, 0, alertKeyBase) !== 0) {
  throw new Error("A delivered 5-minute warning must not consume the Spawning Now stage.");
}

settings = { leadMinutes:30, notified:{} };
if (tests.alertStage(settings, -10 * 1000, alertKeyBase) !== 0
  || tests.alertStage(settings, -60 * 1000, alertKeyBase) !== 0
  || tests.alertStage(settings, -60 * 1000 - 1, alertKeyBase) !== null) {
  throw new Error("Spawning Now must use a bounded 60-second post-spawn polling grace window.");
}
settings.notified[`${alertKeyBase}|0`] = true;
if (tests.alertStage(settings, 0, alertKeyBase) !== null
  || tests.alertStage(settings, -10 * 1000, alertKeyBase) !== null) {
  throw new Error("A delivered Spawning Now stage must remain suppressed throughout its grace window.");
}

for (const [remainingMinutes, expected] of [[29,30],[14,15],[9,10],[4,5]]) {
  settings = { leadMinutes:30, notified:{} };
  if (tests.alertStage(settings, remainingMinutes * 60 * 1000, alertKeyBase) !== expected) {
    throw new Error(`A late check at ${remainingMinutes} minutes must emit only the ${expected}-minute milestone.`);
  }
}

settings = { leadMinutes:30, notified:{ [alertKeyBase]:true } };
tests.setSaved(settings);
if (tests.alertStage(settings, 29 * 60 * 1000, alertKeyBase) !== 30
  || !tests.migrateLegacyHomeAlert(alertKeyBase, 30, settings)
  || settings.notified[alertKeyBase]
  || !settings.notified[`${alertKeyBase}|30`]
  || tests.alertStage(settings, 29 * 60 * 1000, alertKeyBase) !== null
  || tests.alertStage(settings, 14 * 60 * 1000, alertKeyBase) !== 15) {
  throw new Error("A legacy alert must migrate once while preserving all later milestones.");
}

settings = { leadMinutes:15, notified:{ [alertKeyBase]:true } };
tests.setSaved(settings);
if (tests.migrateLegacyHomeAlert(alertKeyBase, 10, settings)
  || settings.notified[alertKeyBase]
  || !settings.notified[`${alertKeyBase}|15`]
  || settings.notified[`${alertKeyBase}|10`]
  || tests.alertStage(settings, 10 * 60 * 1000, alertKeyBase) !== 10) {
  throw new Error("Migrating a legacy first alert must not consume the next lower milestone.");
}

const alertKey = `${alertKeyBase}|10`;

const now = new Date("2026-07-29T10:00:00.000Z");
tests.setSpawns([
  { date:new Date("2026-07-29T10:05:00.000Z"), bosses:["Kzarka"] },
  { date:new Date("2026-07-29T10:10:00.000Z"), bosses:["Garmoth", "Vell"] }
]);
const candidate = tests.nextAlertableBossSpawn(
  { bosses:{ Kzarka:false, Garmoth:true, Vell:false } },
  now);
if (!candidate
  || candidate.date.toISOString() !== "2026-07-29T10:10:00.000Z"
  || candidate.bosses.join(",") !== "Garmoth") {
  throw new Error("Disabled nearer spawns must not hide the next enabled boss alert.");
}

const justSpawned = new Date(now.getTime() - 10 * 1000);
const laterSpawn = new Date(now.getTime() + 10 * 60 * 1000);
tests.setSpawns([
  { date:justSpawned, bosses:["Kzarka"] },
  { date:laterSpawn, bosses:["Garmoth"] }
]);
settings = {
  leadMinutes:0,
  bosses:{ Kzarka:true, Garmoth:true },
  notified:{}
};
let spawnCandidate = tests.nextAlertableBossSpawn(settings, now);
if (!spawnCandidate || spawnCandidate.date.toISOString() !== justSpawned.toISOString()) {
  throw new Error("A just-spawned boss must remain alertable during the Spawning Now grace window.");
}
settings.notified[`boss|${justSpawned.toISOString()}|0`] = true;
spawnCandidate = tests.nextAlertableBossSpawn(settings, now);
if (!spawnCandidate || spawnCandidate.date.toISOString() !== laterSpawn.toISOString()) {
  throw new Error("A delivered Spawning Now occurrence must yield to the next future boss.");
}
tests.setSpawns([
  { date:new Date(now.getTime() - 60 * 1000 - 1), bosses:["Kzarka"] },
  { date:laterSpawn, bosses:["Garmoth"] }
]);
settings.notified = {};
spawnCandidate = tests.nextAlertableBossSpawn(settings, now);
if (!spawnCandidate || spawnCandidate.date.toISOString() !== laterSpawn.toISOString()) {
  throw new Error("An expired Spawning Now occurrence must not hide the next future boss.");
}

async function verifyChannels(soundEnabled, ttsEnabled, expected) {
  tests.resetCalls();
  tests.setFailures([]);
  const delivered = await tests.sendHomeAlert(
    "Boss alert",
    "Boss message",
    "Boss speech",
    { soundEnabled, ttsEnabled });
  const actual = tests.getCalls().join(",");
  if (!delivered || actual !== expected.join(",")) {
    throw new Error(`Unexpected alert channel routing: ${actual}`);
  }
  for (const call of tests.getPayloads()) {
    if (call.command === "playAlarmSound"
      && !sameJson(call.payload, { volumePercent:37 })) {
      throw new Error(`Boss alarm did not receive the shared volume: ${JSON.stringify(call)}`);
    }
    if (call.command === "speakText"
      && !sameJson(call.payload, { text:"Boss speech", volumePercent:37, voiceId:"voice-en-gb" })) {
      throw new Error(`Boss TTS did not receive the shared volume and installed voice ID: ${JSON.stringify(call)}`);
    }
  }
}

(async () => {
  tests.setAudioSaved({ volumePercent:37, voiceId:"voice-alpha" });
  tests.setBridgeResponse("getEnglishTtsVoices", {
    defaultVoiceId:"voice-beta",
    voices:[
      { id:"voice-beta", name:"Beta English" },
      { id:"voice-alpha", name:"Alpha English" },
      { id:"VOICE-ALPHA", name:"Duplicate Alpha" }
    ]
  });
  tests.resetVoiceLoader();
  tests.resetCalls();
  await Promise.all([tests.initializeTtsVoiceSelector(), tests.initializeTtsVoiceSelector()]);
  let voiceState = tests.getVoiceState();
  if (tests.getCalls().join(",") !== "getEnglishTtsVoices"
    || voiceState.disabled
    || voiceState.value !== "voice-alpha"
    || !sameJson(voiceState.options[0], { value:"", text:"Automatic (Beta English)" })
    || voiceState.options.length !== 3
    || voiceState.options[1].value !== "voice-alpha"
    || voiceState.options[2].value !== "voice-beta") {
    throw new Error(`Installed English voices were not loaded, deduplicated, sorted, and selected exactly once: ${JSON.stringify({calls:tests.getCalls(),voiceState})}`);
  }

  tests.setAudioSaved({ volumePercent:37, voiceId:"voice-no-longer-installed" });
  tests.populateEnglishTtsVoices({ defaultVoiceId:"voice-beta", voices:[{ id:"voice-beta", name:"Beta English" }] });
  voiceState = tests.getVoiceState();
  if (tests.getAudioSaved().voiceId !== "" || voiceState.value !== "" || voiceState.disabled) {
    throw new Error(`An unavailable persisted TTS voice did not safely fall back to Automatic: ${JSON.stringify({audio:tests.getAudioSaved(),voiceState})}`);
  }

  let finishOpeningSpeechSettings;
  tests.setFailures([]);
  tests.setBridgeResponse("openSpeechSettings", new Promise(resolve => { finishOpeningSpeechSettings = resolve; }));
  tests.resetCalls();
  const speechSettingsRequest = tests.clickAddVoices();
  await Promise.resolve();
  let addVoicesState = tests.getAddVoicesState();
  if (!addVoicesState.disabled
    || addVoicesState.text !== "Add voices"
    || tests.getCalls().join(",") !== "openSpeechSettings"
    || !sameJson(tests.getPayloads()[0]?.payload, {})) {
    throw new Error(`Add voices did not enter a single busy native Speech-settings request with an empty payload: ${JSON.stringify({addVoicesState,calls:tests.getPayloads()})}`);
  }
  await tests.clickAddVoices();
  if (tests.getCalls().length !== 1) {
    throw new Error("Add voices allowed a duplicate request while its first request was still busy.");
  }
  finishOpeningSpeechSettings({ opened:true, page:"speech" });
  await speechSettingsRequest;
  await tests.initializeTtsVoiceSelector();
  addVoicesState = tests.getAddVoicesState();
  if (addVoicesState.disabled
    || addVoicesState.text !== "Add voices"
    || addVoicesState.footer !== "Windows Speech settings opened. Installed English voices will appear after restarting Black Spirit Hub."
    || addVoicesState.footerState !== "success"
    || tests.getCalls().join(",") !== "openSpeechSettings") {
    throw new Error(`Add voices did not restore itself, show restart guidance, or preserve one voice enumeration per start: ${JSON.stringify({addVoicesState,calls:tests.getCalls()})}`);
  }

  tests.setFailures(["openSpeechSettings"]);
  tests.resetCalls();
  await tests.clickAddVoices();
  addVoicesState = tests.getAddVoicesState();
  if (addVoicesState.disabled
    || addVoicesState.text !== "Add voices"
    || tests.getCalls().join(",") !== "openSpeechSettings"
    || !sameJson(tests.getPayloads()[0]?.payload, {})) {
    throw new Error(`Add voices did not restore its button after a failed Speech-settings request: ${JSON.stringify({addVoicesState,calls:tests.getPayloads()})}`);
  }
  tests.setFailures([]);

  tests.setAudioSaved({ volumePercent:37, voiceId:"voice-en-gb" });
  await verifyChannels(false, false, ["showDesktopNotification"]);
  await verifyChannels(true, false, ["showDesktopNotification", "playAlarmSound"]);
  await verifyChannels(false, true, ["showDesktopNotification", "speakText"]);
  await verifyChannels(true, true, ["showDesktopNotification", "playAlarmSound", "speakText"]);

	const testTtsNow = new Date();
	tests.setSaved({
		leadMinutes:0,
		bosses:{ Kzarka:true },
		notified:{}
	});
	tests.setSpawns([{
		date:new Date(testTtsNow.getTime() - 5 * 1000),
		bosses:["Kzarka"]
	}]);
	tests.setFailures([]);
	tests.resetCalls();
	await tests.runBossTtsTest();
	let testTtsPayloads = tests.getPayloads();
	if (testTtsPayloads.length !== 1
		|| testTtsPayloads[0].command !== "speakText"
		|| testTtsPayloads[0].payload?.text !== "Kzarka spawning now."
		|| testTtsPayloads[0].payload?.volumePercent !== 37
		|| testTtsPayloads[0].payload?.voiceId !== "voice-en-gb"
		|| tests.getTestTtsButton().disabled
		|| tests.getTestTtsButton().attributes["aria-busy"] !== undefined) {
		throw new Error(`The Test TTS button did not route its English Spawning Now copy through the native speech bridge: ${JSON.stringify(testTtsPayloads)}`);
	}

	tests.setSpawns([]);
	tests.resetCalls();
	await tests.runBossTtsTest();
	testTtsPayloads = tests.getPayloads();
	if (testTtsPayloads.length !== 1
		|| testTtsPayloads[0].command !== "speakText"
		|| testTtsPayloads[0].payload?.text !== "Black Spirit Hub text to speech test."
		|| testTtsPayloads[0].payload?.volumePercent !== 37
		|| testTtsPayloads[0].payload?.voiceId !== "voice-en-gb") {
		throw new Error("The Test TTS button lost its English fallback announcement.");
	}

	tests.setAudioSaved({ volumePercent:100, voiceId:"voice-en-us" });
	tests.resetCalls();
	await tests.runBossAlarmTest();
	const testAlarmPayloads = tests.getPayloads();
	if (testAlarmPayloads.length !== 1
		|| testAlarmPayloads[0].command !== "playAlarmSound"
		|| !sameJson(testAlarmPayloads[0].payload, { volumePercent:100 })
		|| tests.getTestAlarmButton().disabled
		|| tests.getTestAlarmButton().attributes["aria-busy"] !== undefined) {
		throw new Error(`The Test Alarm button did not route maximum volume through the native alarm bridge: ${JSON.stringify(testAlarmPayloads)}`);
	}

	tests.setAudioSaved({ volumePercent:0, voiceId:"voice-muted" });
	tests.resetCalls();
	await tests.sendHomeAlert("Muted boss", "Message", "Muted speech", { soundEnabled:true, ttsEnabled:true });
	const mutedPayloads = tests.getPayloads().filter(call => call.command === "playAlarmSound" || call.command === "speakText");
	if (mutedPayloads.length !== 2
		|| mutedPayloads.some(call => call.payload?.volumePercent !== 0)
		|| mutedPayloads.find(call => call.command === "speakText")?.payload?.voiceId !== "voice-muted") {
		throw new Error(`Zero percent must remain a valid mute value for alarm and TTS: ${JSON.stringify(mutedPayloads)}`);
	}

  tests.resetCalls();
  tests.setFailures(["speakText"]);
  if (!await tests.sendHomeAlert("Boss", "Message", "Speech", {
    soundEnabled:true,
    ttsEnabled:true
  })) {
    throw new Error("A successful desktop or alarm channel must preserve delivery when TTS fails.");
  }

  tests.resetCalls();
  tests.setFailures(["showDesktopNotification", "playAlarmSound", "speakText"]);
  if (await tests.sendHomeAlert("Boss", "Message", "Speech", {
    soundEnabled:true,
    ttsEnabled:true
  })) {
    throw new Error("A complete native alert failure must remain eligible for retry.");
  }

  const deliverySettings = { notified:{} };
  let attempts = 0;
  if (await tests.persistDeliveredHomeAlert(
    alertKey,
    deliverySettings,
    async () => { attempts++; return false; })) {
    throw new Error("A failed delivery cannot be marked successful.");
  }
  if (deliverySettings.notified[alertKey]) {
    throw new Error("Failed delivery was incorrectly written to duplicate suppression.");
  }
  if (!await tests.persistDeliveredHomeAlert(
    alertKey,
    deliverySettings,
    async () => { attempts++; return true; })) {
    throw new Error("A retryable alert did not succeed on its second attempt.");
  }
  if (!deliverySettings.notified[alertKey] || attempts !== 2) {
    throw new Error("Successful delivery was not persisted exactly once.");
  }

  let releaseDelivery;
  attempts = 0;
  const concurrentSettings = { leadMinutes:10, soundEnabled:true, notified:{} };
  tests.setAudioSaved({ volumePercent:18, voiceId:"voice-before-delivery" });
  tests.setSaved({ leadMinutes:10, soundEnabled:true, notified:{} });
  const firstDelivery = tests.persistDeliveredHomeAlert(
    alertKey,
    concurrentSettings,
    () => new Promise(resolve => {
      attempts++;
      releaseDelivery = resolve;
    }));
  await Promise.resolve();
  const duplicateDelivery = await tests.persistDeliveredHomeAlert(
    alertKey,
    concurrentSettings,
    async () => { attempts++; return true; });
  if (duplicateDelivery || attempts !== 1) {
    throw new Error("Overlapping checks delivered the same milestone more than once.");
  }
  tests.setSaved({ leadMinutes:30, soundEnabled:false, notified:{} });
  tests.setAudioSaved({ volumePercent:82, voiceId:"voice-during-delivery" });
  releaseDelivery(true);
  if (!await firstDelivery) {
    throw new Error("The guarded milestone delivery did not complete successfully.");
  }
  const mergedDelivery = tests.getSavedDelivery();
  if (mergedDelivery.leadMinutes !== 30
    || mergedDelivery.soundEnabled !== false
    || !mergedDelivery.notified[alertKey]) {
    throw new Error("Alert completion overwrote settings changed during delivery.");
  }
  if (!sameJson(tests.getAudioSaved(), { volumePercent:82, voiceId:"voice-during-delivery" })) {
    throw new Error("Alert completion overwrote notification audio preferences changed during delivery.");
  }

  const sharedSpawnDate = new Date("2026-07-29T12:00:00.000Z");
  const sharedNow = new Date("2026-07-29T11:50:00.000Z");
  const orchestrationSettings = {
    masterNotifications:true,
    guildBossNotifications:true,
    leadMinutes:30,
    soundEnabled:false,
    ttsEnabled:false,
    bosses:{ Kzarka:true },
    notified:{}
  };
  tests.setSaved(orchestrationSettings);
  tests.setGuildTarget({ date:sharedSpawnDate, day:3, time:"20:00" });
  tests.setFailures([]);
  tests.resetCalls();
  const [worldDelivered, guildDelivered] = await Promise.all([
    tests.checkBossNotifications(orchestrationSettings, sharedNow, {
      date:sharedSpawnDate,
      bosses:["Kzarka"]
    }),
    tests.checkGuildBossNotifications(orchestrationSettings, sharedNow)
  ]);
  const orchestratedDelivery = tests.getSavedDelivery();
  if (!worldDelivered
    || !guildDelivered
    || !orchestratedDelivery.notified[`boss|${sharedSpawnDate.toISOString()}|10`]
    || !orchestratedDelivery.notified[`guild|${sharedSpawnDate.toISOString()}|10`]
    || tests.getCalls().join(",") !== "showDesktopNotification,showDesktopNotification") {
    throw new Error(`World and guild alerts did not persist independent milestones at the same timestamp: ${JSON.stringify({worldDelivered,guildDelivered,orchestratedDelivery,calls:tests.getCalls()})}`);
  }

  const spawningNowDate = new Date("2026-07-29T13:00:00.000Z");
  const spawningNowCheck = new Date(spawningNowDate.getTime() + 10 * 1000);
  const retrySettings = {
    masterNotifications:true,
    leadMinutes:0,
    soundEnabled:false,
    ttsEnabled:false,
    bosses:{ Kzarka:true },
    notified:{}
  };
  const retryKey = `boss|${spawningNowDate.toISOString()}|0`;
  tests.setSaved(retrySettings);
  tests.setFailures(["showDesktopNotification"]);
  tests.resetCalls();
  if (await tests.checkBossNotifications(retrySettings, spawningNowCheck, {
    date:spawningNowDate,
    bosses:["Kzarka"]
  }) || retrySettings.notified[retryKey]) {
    throw new Error("A failed Spawning Now delivery must remain unmarked and retryable.");
  }
  tests.setFailures([]);
  if (!await tests.checkBossNotifications(retrySettings, spawningNowCheck, {
    date:spawningNowDate,
    bosses:["Kzarka"]
  }) || !retrySettings.notified[retryKey]) {
    throw new Error("A failed Spawning Now delivery did not retry successfully during its grace window.");
  }

  const spawningNowSettings = {
    masterNotifications:true,
    guildBossNotifications:true,
    leadMinutes:0,
    soundEnabled:false,
    ttsEnabled:true,
    bosses:{ Kzarka:true },
    notified:{}
  };
  tests.setAudioSaved({ volumePercent:23, voiceId:"voice-production" });
  tests.setSaved(spawningNowSettings);
  tests.setGuildTarget({ date:spawningNowDate, day:3, time:"20:00" });
  tests.setFailures([]);
  tests.resetCalls();
  const [worldSpawningNow, guildSpawningNow] = await Promise.all([
    tests.checkBossNotifications(spawningNowSettings, spawningNowCheck, {
      date:spawningNowDate,
      bosses:["Kzarka"]
    }),
    tests.checkGuildBossNotifications(spawningNowSettings, spawningNowCheck)
  ]);
  const spawningNowDelivery = tests.getSavedDelivery();
  const spawningNowPayloads = tests.getPayloads();
  const desktopCopy = spawningNowPayloads
    .filter(call => call.command === "showDesktopNotification")
    .map(call => `${call.payload?.title || ""} ${call.payload?.message || ""}`);
  const spokenCopy = spawningNowPayloads
    .filter(call => call.command === "speakText")
    .map(call => call.payload?.text || "");
  const spokenPayloads = spawningNowPayloads.filter(call => call.command === "speakText");
  if (!worldSpawningNow
    || !guildSpawningNow
    || !spawningNowDelivery.notified[`boss|${spawningNowDate.toISOString()}|0`]
    || !spawningNowDelivery.notified[`guild|${spawningNowDate.toISOString()}|0`]
    || desktopCopy.length !== 2
    || spokenCopy.length !== 2
    || spokenPayloads.some(call => call.payload?.volumePercent !== 23 || call.payload?.voiceId !== "voice-production")
    || [...desktopCopy, ...spokenCopy].some(copy => !/spawning now/i.test(copy))
    || [...desktopCopy, ...spokenCopy].some(copy => /minute warning|spawning in 1 minute/i.test(copy))) {
    throw new Error(`Spawning Now alerts used the wrong delivery, ledger key, or copy: ${JSON.stringify({worldSpawningNow,guildSpawningNow,spawningNowDelivery,spawningNowPayloads})}`);
  }

  const stagedDeliveryKeys = appScript.match(/const key=`\$\{keyBase\}\|\$\{stage\}`/g) ?? [];
  if (stagedDeliveryKeys.length !== 3) {
    throw new Error("World boss, guild boss, and Node War alerts must persist separate keys for every milestone.");
  }

  if (/s\.notified=\{\}/.test(appScript)
    || /homeEl\.sound\.disabled=settings\.ttsEnabled/.test(appScript)) {
    throw new Error("Legacy ledger-reset or mutually exclusive alert behavior remains.");
  }

  console.log("Boss alert JavaScript verification passed.");
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
