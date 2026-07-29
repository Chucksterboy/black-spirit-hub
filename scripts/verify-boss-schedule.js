"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const repoRoot = path.resolve(__dirname, "..");
const appScriptPath = path.join(
  repoRoot,
  "Source Code",
  "BlackSpiritHub.Resources.Black_Spirit_Hub.js");
const appScript = fs.readFileSync(appScriptPath, "utf8");

function requireMatch(pattern, description) {
  const match = appScript.match(pattern);
  if (!match) {
    throw new Error(`Could not locate ${description} in the application script.`);
  }
  return match[0];
}

function extractFunction(name, nextName) {
  const startMarker = `function ${name}(`;
  const endMarker = `\nfunction ${nextName}(`;
  const start = appScript.indexOf(startMarker);
  const end = appScript.indexOf(endMarker, start);
  if (start < 0 || end < 0) {
    throw new Error(`Could not extract ${name} from the application script.`);
  }
  return appScript.slice(start, end);
}

const extractedCode = [
  requireMatch(
    /const HOME_SERVER_TIME_ZONE = "Europe\/Berlin";/,
    "the EU server time-zone constant"),
  requireMatch(
    /const HOME_DAYS = \[[^\r\n]+\];/,
    "the weekly day manifest"),
  extractFunction("zonedParts", "zonedOffsetMs"),
  extractFunction("zonedOffsetMs", "zonedTimeToDate"),
  extractFunction("zonedTimeToDate", "serverWeekMondayUtc"),
  extractFunction("normalizeBossScheduleDashboard", "applyBossScheduleDashboard"),
  "globalThis.bossScheduleTest = { zonedTimeToDate, normalizeBossScheduleDashboard };"
].join("\n");

const context = {};
vm.createContext(context);
vm.runInContext(extractedCode, context);

const { zonedTimeToDate, normalizeBossScheduleDashboard } = context.bossScheduleTest;
const days = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday"
];
const schedule = Object.fromEntries(days.map((day, index) => [
  day,
  [{ time: "02:00", bosses: index === 1 ? [] : ["Kzarka"] }]
]));
schedule.Monday.push(
  { time: "18:30", bosses: ["Winged Mermaid"] },
  { time: "19:30", bosses: ["Baby Vell"] });

const normalized = normalizeBossScheduleDashboard({
  status: "LIVE",
  source: "BDO Alerts",
  sourceTimeZone: "Europe/Berlin",
  fetchedAtUtc: "2026-07-29T10:00:00Z",
  contentHash: "test",
  schedule
});

if (!normalized
  || normalized.schedule.Tuesday["02:00"].length !== 0
  || normalized.times.join(",") !== "02:00,18:30,19:30"
  || !normalized.bosses.includes("Winged Mermaid")
  || !normalized.bosses.includes("Baby Vell")) {
  throw new Error("Dynamic event columns or legitimate empty schedule cells were not normalized correctly.");
}

const springGap = zonedTimeToDate("Europe/Berlin", 2026, 3, 29, 2, 0);
if (springGap.toISOString() !== "2026-03-29T01:00:00.000Z") {
  throw new Error("The CET/CEST spring gap must advance the nonexistent 02:00 slot to 03:00 CEST.");
}

const autumnFold = zonedTimeToDate("Europe/Berlin", 2026, 10, 25, 2, 0);
if (autumnFold.toISOString() !== "2026-10-25T01:00:00.000Z") {
  throw new Error("The CET/CEST autumn fold must resolve the 02:00 slot to the post-transition occurrence.");
}

const mondayServerSpawn = zonedTimeToDate("Europe/Berlin", 2026, 7, 27, 0, 15);
const losAngelesDay = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Los_Angeles",
  weekday: "long"
}).format(mondayServerSpawn);
if (losAngelesDay !== "Sunday") {
  throw new Error("Local-time rendering must allow a server Monday spawn to roll back into local Sunday.");
}

console.log("Boss schedule JavaScript verification passed.");
