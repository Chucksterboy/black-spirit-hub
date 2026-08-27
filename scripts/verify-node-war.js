"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const repoRoot = path.resolve(__dirname, "..");
const appScript = fs.readFileSync(path.join(repoRoot, "Source Code", "BlackSpiritHub.Resources.Black_Spirit_Hub.js"), "utf8");
const appHtml = fs.readFileSync(path.join(repoRoot, "Source Code", "BlackSpiritHub.Resources.Black_Spirit_Hub.html"), "utf8");
const appCss = fs.readFileSync(path.join(repoRoot, "Source Code", "BlackSpiritHub.Resources.Black_Spirit_Hub.css"), "utf8");

function extractFunction(name) {
  let start = appScript.indexOf(`function ${name}(`);
  if (start >= 6 && appScript.slice(start - 6, start) === "async ") start -= 6;
  if (start < 0) throw new Error(`Could not extract ${name}.`);
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
  if (!match) throw new Error(`Missing ${description}.`);
  return match[0];
}

const extracted = [
  requireMatch(/const HOME_SERVER_TIME_ZONE\s*=\s*"Europe\/Berlin";/, "EU server timezone"),
  requireMatch(/const HOME_SERVER_TIME_ZONE_LABEL\s*=\s*"CET\/CEST";/, "EU timezone fallback label"),
  requireMatch(/const NODE_WAR_HOUR=20;/, "Node War start hour"),
  requireMatch(/const NODE_WAR_ALERT_MILESTONES=Object\.freeze\(\[0,5,15,30\]\);/, "Node War milestones"),
  requireMatch(/const NODE_WAR_NOTIFICATION_MODES=Object\.freeze\(\["off","tts","alarm"\]\);/, "Node War notification modes"),
  requireMatch(/const HOME_SPAWNING_NOW_GRACE_MS=60\*1000;/, "start grace"),
  requireMatch(/const DEFAULT_NOTIFICATION_VOLUME_PERCENT=50;/, "default notification volume"),
  requireMatch(/const MAX_TTS_VOICE_ID_LENGTH=\d+;/, "voice-token length limit"),
  "let savedResetSettings={};",
  "let savedNotificationAudioSettings={};",
  "let bridgeCalls=[];",
  "let bridgePayloads=[];",
  "let failedCommands=new Set();",
  "function readSetting(name,fallback){if(name==='resetTimerSettings')return savedResetSettings;if(name==='notificationAudioSettings')return savedNotificationAudioSettings;return fallback}",
  "function persistSetting(name,value){if(name==='resetTimerSettings')savedResetSettings=JSON.parse(JSON.stringify(value));if(name==='notificationAudioSettings')savedNotificationAudioSettings=JSON.parse(JSON.stringify(value))}",
  "function normalizedHomeSettings(){return {timeFormat:'12'}}",
  "function saveResetSettings(settings){persistSetting('resetTimerSettings',settings)}",
  "function resetTimerServerLabel(){return '08:00 PM CET'}",
  extractFunction("normalizeNotificationVolumePercent"),
  extractFunction("normalizeTtsVoiceId"),
  extractFunction("normalizedNotificationAudioSettings"),
  extractFunction("saveNotificationAudioSettings"),
  extractFunction("alertLeadText"),
  "const HOME_TIMER_CONFIG={region:'EU'};",
  "function bridgeCall(command,payload){bridgeCalls.push(command);bridgePayloads.push({command,payload});return failedCommands.has(command)?Promise.reject(new Error(command+' failed')):Promise.resolve({ok:true})}",
  "const NotificationService={ShowInfo(){},ShowError(){},ShowWarning(){}};",
  "const nodeWarAlertInFlight=new Set();",
  requireMatch(/function serverTimeZoneLabel\(date=new Date\(\)\)\{\r?\n[\s\S]*?\r?\n\}/, "CET/CEST label helper"),
  extractFunction("zonedParts"),
  extractFunction("zonedOffsetMs"),
  extractFunction("zonedTimeToDate"),
  extractFunction("nextNodeWarOccurrence"),
  extractFunction("normalizedResetSettings"),
  extractFunction("notificationKeyDate"),
  extractFunction("nodeWarAlertStage"),
  extractFunction("pruneNodeWarNotifications"),
  extractFunction("sendNodeWarAlert"),
  extractFunction("persistDeliveredNodeWarAlert"),
  extractFunction("checkNodeWarNotifications"),
  "globalThis.tests={serverTimeZoneLabel,nextNodeWarOccurrence,normalizedNotificationAudioSettings,saveNotificationAudioSettings,normalizedResetSettings,nodeWarAlertStage,sendNodeWarAlert,persistDeliveredNodeWarAlert,checkNodeWarNotifications,setSaved:value=>{savedResetSettings=JSON.parse(JSON.stringify(value))},getSaved:()=>JSON.parse(JSON.stringify(savedResetSettings)),setAudioSaved:value=>{savedNotificationAudioSettings=JSON.parse(JSON.stringify(value))},getAudioSaved:()=>JSON.parse(JSON.stringify(savedNotificationAudioSettings)),setFailures:value=>{failedCommands=new Set(value)},resetCalls:()=>{bridgeCalls=[];bridgePayloads=[];failedCommands=new Set()},getCalls:()=>bridgeCalls.slice(),getPayloads:()=>bridgePayloads.slice()};"
].join("\n");

const NativeDate = Date;
class FixedDate extends NativeDate { static now() { return NativeDate.parse("2026-01-12T19:00:00.000Z"); } }
const context = { console:{warn(){},debug(){},error(){},log(){}}, Intl, Date:FixedDate, Promise, Set };
vm.createContext(context);
vm.runInContext(extracted, context);
const tests = context.tests;

function sameJson(actual, expected) {
  if (!actual || !expected || typeof actual !== "object" || typeof expected !== "object") return actual === expected;
  const actualKeys = Object.keys(actual).sort();
  const expectedKeys = Object.keys(expected).sort();
  return actualKeys.join("\u0000") === expectedKeys.join("\u0000")
    && actualKeys.every(key => actual[key] === expected[key]);
}

function iso(value) { return tests.nextNodeWarOccurrence(new Date(value), false)?.toISOString(); }
const scheduleCases = new Map([
  ["2026-01-12T18:59:59.000Z", "2026-01-12T19:00:00.000Z"],
  ["2026-01-12T19:00:00.000Z", "2026-01-13T19:00:00.000Z"],
  ["2026-01-16T19:00:01.000Z", "2026-01-18T19:00:00.000Z"],
  ["2026-01-17T09:00:00.000Z", "2026-01-18T19:00:00.000Z"],
  ["2026-03-29T17:59:59.000Z", "2026-03-29T18:00:00.000Z"],
  ["2026-07-27T17:59:59.000Z", "2026-07-27T18:00:00.000Z"],
  ["2026-10-25T18:59:59.000Z", "2026-10-25T19:00:00.000Z"]
]);
for (const [now, expected] of scheduleCases) {
  if (iso(now) !== expected) throw new Error(`Node War schedule mismatch for ${now}: expected ${expected}, received ${iso(now)}.`);
}
if (tests.serverTimeZoneLabel(new Date("2026-01-12T19:00:00.000Z")) !== "CET"
  || tests.serverTimeZoneLabel(new Date("2026-08-24T18:00:00.000Z")) !== "CEST") {
  throw new Error("Node War times must display literal CET/CEST labels.");
}
const exactStart = new Date("2026-01-12T19:00:00.000Z");
if (tests.nextNodeWarOccurrence(exactStart, true)?.toISOString() !== exactStart.toISOString()
  || tests.nextNodeWarOccurrence(new Date(exactStart.getTime() + 59_999), true)?.toISOString() !== exactStart.toISOString()
  || tests.nextNodeWarOccurrence(new Date(exactStart.getTime() + 60_001), true)?.toISOString() !== "2026-01-13T19:00:00.000Z") {
  throw new Error("Node War starting-now grace must last exactly 60 seconds.");
}

tests.setSaved({});
let settings = tests.normalizedResetSettings();
if (settings.nodeWarNotificationMode !== "off" || settings.nodeWarLeadMinutes !== 15) throw new Error("Node War settings defaults are unsafe.");
tests.setSaved({nodeWarNotificationMode:"invalid",nodeWarLeadMinutes:10});
settings = tests.normalizedResetSettings();
if (settings.nodeWarNotificationMode !== "off" || settings.nodeWarLeadMinutes !== 15) throw new Error("Invalid Node War settings were not normalized.");

const keyBase = "node-war|2026-01-12T19:00:00.000Z";
const stages = [[30,30],[14,15],[4,5],[0,0]];
settings = {nodeWarLeadMinutes:30,nodeWarNotified:{}};
for (const [remaining, expected] of stages) {
  const stage = tests.nodeWarAlertStage(settings, remaining * 60_000, keyBase);
  if (stage !== expected) throw new Error(`Expected ${expected}-minute Node War stage at ${remaining} minutes; received ${stage}.`);
  settings.nodeWarNotified[`${keyBase}|${stage}`] = true;
}
if (tests.nodeWarAlertStage(settings, 10 * 60_000, keyBase) !== null
  || tests.nodeWarAlertStage(settings, -60_001, keyBase) !== null) {
  throw new Error("Node War alerts must never add a 10-minute stage or exceed the starting grace.");
}

(async () => {
  tests.setAudioSaved({volumePercent:0,voiceId:"voice-en-us"});
  tests.resetCalls();
  if (await tests.sendNodeWarAlert("title","message","Nodewar starting in 30 minutes.",{nodeWarNotificationMode:"off"}) !== false
    || tests.getCalls().length !== 0) throw new Error("Off mode must not deliver a Node War alert.");
  await tests.sendNodeWarAlert("title","message","Nodewar starting in 30 minutes.",{nodeWarNotificationMode:"tts"});
  if (tests.getCalls().join(",") !== "speakText"
    || !sameJson(tests.getPayloads()[0]?.payload, {
      text:"Nodewar starting in 30 minutes.",
      volumePercent:0,
      voiceId:"voice-en-us"
    })) throw new Error("TTS mode must speak the exact wording once using the shared mute volume and installed voice ID.");
  tests.resetCalls();
  tests.setAudioSaved({volumePercent:100,voiceId:"voice-en-us"});
  await tests.sendNodeWarAlert("title","message","Nodewar starting in 30 minutes.",{nodeWarNotificationMode:"alarm"});
  if (tests.getCalls().join(",") !== "playAlarmSound"
    || !sameJson(tests.getPayloads()[0]?.payload, {volumePercent:100})) throw new Error("Alarm mode must play only Alarm.mp3 once at the shared maximum volume.");

  tests.resetCalls();
  tests.setSaved({nodeWarNotificationMode:"tts",nodeWarLeadMinutes:30,nodeWarNotified:{},showLocalTime:false,timeFormat:"12"});
  tests.setFailures(["speakText"]);
  settings = tests.normalizedResetSettings();
  const failedAttemptNow = new Date("2026-01-12T18:30:00.000Z");
  if (await tests.checkNodeWarNotifications(settings, failedAttemptNow)
    || Object.keys(tests.getSaved().nodeWarNotified || {}).length !== 0) {
    throw new Error("A failed Node War channel must not consume its milestone.");
  }
  tests.setFailures([]);
  if (!await tests.checkNodeWarNotifications(tests.normalizedResetSettings(), failedAttemptNow)) {
    throw new Error("A failed Node War milestone must retry after its channel recovers.");
  }

  const concurrentKey = "node-war|2026-01-13T19:00:00.000Z|15";
  tests.setSaved({nodeWarNotificationMode:"tts",nodeWarLeadMinutes:30,nodeWarNotified:{existing:true},showLocalTime:false,timeFormat:"12"});
  settings = tests.normalizedResetSettings();
  await tests.persistDeliveredNodeWarAlert(concurrentKey, settings, async () => {
    tests.setSaved({nodeWarNotificationMode:"alarm",nodeWarLeadMinutes:5,nodeWarNotified:{concurrent:true},showLocalTime:true,timeFormat:"24"});
    return true;
  });
  const merged = tests.getSaved();
  if (merged.nodeWarNotificationMode !== "alarm" || merged.nodeWarLeadMinutes !== 5
    || !merged.nodeWarNotified.existing || !merged.nodeWarNotified.concurrent || !merged.nodeWarNotified[concurrentKey]) {
    throw new Error("Node War delivery persistence overwrote settings changed while an alert was in flight.");
  }

  tests.resetCalls();
  tests.setAudioSaved({volumePercent:37,voiceId:"voice-production"});
  tests.setSaved({nodeWarNotificationMode:"tts",nodeWarLeadMinutes:30,nodeWarNotified:{},showLocalTime:false,timeFormat:"12"});
  if (!await tests.checkNodeWarNotifications(tests.normalizedResetSettings(), new Date("2026-01-12T18:40:00.000Z"))
    || !sameJson(tests.getPayloads().at(-1)?.payload, {
      text:"Nodewar starting in 20 minutes.",
      volumePercent:37,
      voiceId:"voice-production"
    })) {
    throw new Error("A late Node War alert must speak the actual remaining time, not its missed milestone.");
  }
  tests.resetCalls();
  tests.setSaved({nodeWarNotificationMode:"tts",nodeWarLeadMinutes:30,nodeWarNotified:{},showLocalTime:false,timeFormat:"12"});
  if (!await tests.checkNodeWarNotifications(tests.normalizedResetSettings(), new Date("2026-01-12T18:59:00.000Z"))
    || !sameJson(tests.getPayloads().at(-1)?.payload, {
      text:"Nodewar starting in 1 minute.",
      volumePercent:37,
      voiceId:"voice-production"
    })) {
    throw new Error("A one-minute late Node War alert must use singular wording.");
  }

  tests.resetCalls();
  tests.setSaved({nodeWarNotificationMode:"tts",nodeWarLeadMinutes:30,nodeWarNotified:{},showLocalTime:false,timeFormat:"12"});
  const occurrence = new Date("2026-01-12T19:00:00.000Z");
  for (const [minutes, wording] of [[30,"Nodewar starting in 30 minutes."],[15,"Nodewar starting in 15 minutes."],[5,"Nodewar starting in 5 minutes."],[0,"Nodewar starting now."]]) {
    const now = new Date(occurrence.getTime() - minutes * 60_000);
    settings = tests.normalizedResetSettings();
    if (!await tests.checkNodeWarNotifications(settings, now)) throw new Error(`Node War ${minutes}-minute alert was not delivered.`);
    if (!sameJson(tests.getPayloads().at(-1)?.payload, {
      text:wording,
      volumePercent:37,
      voiceId:"voice-production"
    })) throw new Error(`Unexpected Node War TTS wording, volume, or voice at ${minutes} minutes.`);
  }
  if (tests.getCalls().some(command => command !== "speakText") || tests.getCalls().length !== 4) throw new Error("Node War TTS cascade must be exactly 30, 15, 5, and starting.");
  if (await tests.checkNodeWarNotifications(tests.normalizedResetSettings(), occurrence)) throw new Error("A persisted Node War stage repeated.");

  if (!/data-app-view="resetTimersView"[^>]*>[\s\S]*?<span class="navLabel">Timers<\/span>/.test(appHtml)
    || /<span class="navLabel">Reset Timers<\/span>/.test(appHtml)
    || (appHtml.match(/class="nodeWarSettingLabel"/g) || []).length !== 2
    || !/id="resetTimersGrid"[^>]*aria-label="Black Desert timers"/.test(appHtml)
    || !/<span class="nodeWarSettingLabel">Nodewar Notification<\/span>/.test(appHtml)
    || !/<span class="nodeWarSettingLabel">First Alert<\/span>/.test(appHtml)
    || !/id="nodeWarNotificationMode"[^>]*class="settingSelect resetTimerSelect"[^>]*>[\s\S]*?<option value="off" selected>Off<\/option>/.test(appHtml)
    || !/id="nodeWarLeadTime"[^>]*class="settingSelect resetTimerSelect"[^>]*disabled/.test(appHtml)
    || !/<option value="0">Nodewar Starting<\/option>[\s\S]*?<option value="5">5 minutes<\/option>[\s\S]*?<option value="15" selected>15 minutes<\/option>[\s\S]*?<option value="30">30 minutes<\/option>/.test(appHtml)) {
    throw new Error("Timers navigation or Node War controls are malformed.");
  }
  if (!/\.resetTimersShell\{--node-war-accent:#ef4444;--node-war-label-color:color-mix\(in srgb,var\(--node-war-accent\) 74%,#fff\)/.test(appCss)
    || !/\.resetTimerCard\[data-reset-id="nodewar"\]\{--reset-accent:var\(--node-war-accent\)\}/.test(appCss)
    || !/\.resetTimerSetting\{[^}]*font-size:10px/.test(appCss)
    || !/\.resetTimerSetting>\.nodeWarSettingLabel\{[^}]*color:var\(--node-war-label-color\)[^}]*font-size:11px[^}]*text-transform:none/.test(appCss)
    || !/body\[data-style="caravan"\] \.resetTimerSetting>\.nodeWarSettingLabel\{--node-war-label-color:color-mix\(in srgb,var\(--node-war-accent\) 74%,#fff\);[^}]*background:rgba\(5,7,10,\.9\)/.test(appCss)
    || !/\.resetTimerSetting \.(?:resetTimerSelect|settingSelect)|\.resetTimerSetting \.resetTimerSelect/.test(appCss)
    || !/checkNodeWarNotifications\(resetSettings,now\)/.test(appScript)) {
    throw new Error("Node War card, dropdown styling, or background scheduler wiring is missing.");
  }
  console.log("Node War timer and notification verification passed.");
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
