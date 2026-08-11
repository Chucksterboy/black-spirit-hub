"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const repoRoot = path.resolve(__dirname, "..");
const appScript = fs.readFileSync(path.join(
  repoRoot,
  "Source Code",
  "BlackSpiritHub.Resources.Black_Spirit_Hub.js"), "utf8");

function extractFunction(name, nextName) {
  let start = appScript.indexOf(`function ${name}(`);
  if (start >= 6 && appScript.slice(start - 6, start) === "async ") {
    start -= 6;
  }
  const remainder = start < 0 ? "" : appScript.slice(start);
  const nextMatch = remainder.match(new RegExp(`\\n(?:async\\s+)?function ${nextName}\\(`));
  const end = nextMatch ? start + nextMatch.index : -1;
  if (start < 0 || end < 0) {
    throw new Error(`Could not extract ${name} from the application script.`);
  }
  return appScript.slice(start, end);
}

function requireMatch(pattern, description) {
  const match = appScript.match(pattern);
  if (!match) {
    throw new Error(`Could not locate ${description} in the application script.`);
  }
  return match[0];
}

const extractedCode = [
  "let savedHomeSettings = {};",
  "let savedDeliverySettings = null;",
  "let bridgeCalls = [];",
  "let bridgeFailures = new Set();",
  "let scheduleSpawns = [];",
  "function readSetting(){ return savedHomeSettings; }",
  "function defaultBossSelection(){ return { Kzarka:true, Garmoth:true, Vell:true }; }",
  "function allBossSpawns(){ return scheduleSpawns; }",
  "let guildTargetValue = null;",
  "function guildBossTarget(){ return guildTargetValue; }",
  "function guildBossDayName(){ return 'Wednesday'; }",
  "function fmtSpawnDateTime(){ return 'Wednesday 20:00 CEST'; }",
  "const HOME_TIMER_CONFIG={region:'EU'};",
  "function pruneHomeNotifications(){}",
  "function saveHomeSettings(settings){ savedHomeSettings = JSON.parse(JSON.stringify(settings)); savedDeliverySettings = JSON.parse(JSON.stringify(settings)); }",
  "function bridgeCall(command){ bridgeCalls.push(command); return bridgeFailures.has(command) ? Promise.reject(new Error(command + ' failed')) : Promise.resolve({ok:true}); }",
  "const NotificationService={ShowInfo(){},ShowWarning(){},ShowError(){}};",
  extractFunction("normalizedHomeSettings", "saveHomeSettings"),
  requireMatch(/const homeAlertInFlight=new Set\(\);/, "the in-flight delivery guard"),
  requireMatch(/const HOME_ALERT_MILESTONES=Object\.freeze\(\[5,10,15,30\]\);/, "the ordered boss alert milestones"),
  extractFunction("alertStage", "alertLeadText"),
  extractFunction("alertLeadText", "spokenBossList"),
  extractFunction("spokenBossList", "notificationKeyDate"),
  extractFunction("nextAlertableBossSpawn", "sendHomeAlert"),
  extractFunction("sendHomeAlert", "persistDeliveredHomeAlert"),
  extractFunction("persistDeliveredHomeAlert", "checkBossNotifications"),
  extractFunction("checkBossNotifications", "checkGuildBossNotifications"),
  extractFunction("checkGuildBossNotifications", "runBackgroundNotifications"),
  "globalThis.alertTests={normalizedHomeSettings,alertStage,nextAlertableBossSpawn,sendHomeAlert,persistDeliveredHomeAlert,migrateLegacyHomeAlert,checkBossNotifications,checkGuildBossNotifications,setSaved:value=>{savedHomeSettings=value},setSpawns:value=>{scheduleSpawns=value},setGuildTarget:value=>{guildTargetValue=value},setFailures:value=>{bridgeFailures=new Set(value)},resetCalls:()=>{bridgeCalls=[]},getCalls:()=>bridgeCalls.slice(),getSavedDelivery:()=>savedDeliverySettings};"
].join("\n");

const context = { console:{ debug(){}, warn(){}, log(){}, error(){} } };
vm.createContext(context);
vm.runInContext(extractedCode, context);
const tests = context.alertTests;

tests.setSaved({ ttsEnabled:true, soundEnabled:true, leadMinutes:10 });
let settings = tests.normalizedHomeSettings();
if (!settings.ttsEnabled || !settings.soundEnabled || settings.leadMinutes !== 10) {
  throw new Error("TTS and Alarm.mp3 must remain independently enabled.");
}

tests.setSaved({ leadMinutes:999 });
settings = tests.normalizedHomeSettings();
if (settings.leadMinutes !== 15) {
  throw new Error("Unsupported alert lead times must fall back to 15 minutes.");
}

const alertKeyBase = "boss|2026-07-29T12:00:00.000Z";
const expectedMilestones = new Map([
  [5, [5]],
  [10, [10, 5]],
  [15, [15, 10, 5]],
  [30, [30, 15, 10, 5]]
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
}

(async () => {
  await verifyChannels(false, false, ["showDesktopNotification"]);
  await verifyChannels(true, false, ["showDesktopNotification", "playAlarmSound"]);
  await verifyChannels(false, true, ["showDesktopNotification", "speakText"]);
  await verifyChannels(true, true, ["showDesktopNotification", "playAlarmSound", "speakText"]);

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

  const stagedDeliveryKeys = appScript.match(/const key=`\$\{keyBase\}\|\$\{stage\}`/g) ?? [];
  if (stagedDeliveryKeys.length !== 2) {
    throw new Error("World and guild boss alerts must persist separate keys for every milestone.");
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
