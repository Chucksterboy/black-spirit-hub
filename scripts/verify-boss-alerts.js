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
  "function pruneHomeNotifications(){}",
  "function saveHomeSettings(settings){ savedDeliverySettings = JSON.parse(JSON.stringify(settings)); }",
  "function bridgeCall(command){ bridgeCalls.push(command); return bridgeFailures.has(command) ? Promise.reject(new Error(command + ' failed')) : Promise.resolve({ok:true}); }",
  "const NotificationService={ShowInfo(){},ShowWarning(){},ShowError(){}};",
  extractFunction("normalizedHomeSettings", "saveHomeSettings"),
  requireMatch(/const homeAlertInFlight=new Set\(\);/, "the in-flight delivery guard"),
  extractFunction("alertStage", "alertLeadText"),
  extractFunction("nextAlertableBossSpawn", "sendHomeAlert"),
  extractFunction("sendHomeAlert", "persistDeliveredHomeAlert"),
  extractFunction("persistDeliveredHomeAlert", "checkBossNotifications"),
  "globalThis.alertTests={normalizedHomeSettings,alertStage,nextAlertableBossSpawn,sendHomeAlert,persistDeliveredHomeAlert,setSaved:value=>{savedHomeSettings=value},setSpawns:value=>{scheduleSpawns=value},setFailures:value=>{bridgeFailures=new Set(value)},resetCalls:()=>{bridgeCalls=[]},getCalls:()=>bridgeCalls.slice(),getSavedDelivery:()=>savedDeliverySettings};"
].join("\n");

const context = { console:{ warn(){}, log(){}, error(){} } };
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

const alertKey = "boss|2026-07-29T12:00:00.000Z";
settings = { leadMinutes:10, notified:{} };
if (tests.alertStage(settings, 10 * 60 * 1000, alertKey) !== 10
  || tests.alertStage(settings, 9 * 60 * 1000 + 1, alertKey) !== 10
  || tests.alertStage(settings, 10 * 60 * 1000 + 1, alertKey) !== null) {
  throw new Error("The selected lead time must produce one accurately rounded warning window.");
}
settings.notified[alertKey] = true;
if (tests.alertStage(settings, 5 * 60 * 1000, alertKey) !== null) {
  throw new Error("A delivered spawn must not produce additional staged warnings.");
}

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

  if (/HOME_ALERT_STAGES/.test(appScript)
    || /s\.notified=\{\}/.test(appScript)
    || /homeEl\.sound\.disabled=settings\.ttsEnabled/.test(appScript)) {
    throw new Error("Legacy multi-stage, ledger-reset, or mutually exclusive alert behavior remains.");
  }

  console.log("Boss alert JavaScript verification passed.");
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
