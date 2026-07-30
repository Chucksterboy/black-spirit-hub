"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const repoRoot = path.resolve(__dirname, "..");
const appScriptPath = path.join(
  repoRoot,
  "Source Code",
  "BlackSpiritHub.Resources.Black_Spirit_Hub.js");
const appCssPath = path.join(
  repoRoot,
  "Source Code",
  "BlackSpiritHub.Resources.Black_Spirit_Hub.css");
const appScript = fs.readFileSync(appScriptPath, "utf8");
const appCss = fs.readFileSync(appCssPath, "utf8");

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
  requireMatch(
    /const HOME_DAY_INDEX = \{[^\r\n]+\};/,
    "the weekly day index"),
  requireMatch(
    /const BUNDLED_HOME_BOSSES = \[[^\r\n]+\];/,
    "the bundled boss color manifest"),
  requireMatch(
    /const HOME_EVENT_BOSS_COLORS = Object\.freeze\(\[[\s\S]*?\]\);/,
    "the event boss color palette"),
  extractFunction("bossClass", "bossEventColor"),
  extractFunction("bossEventColor", "renderBossName"),
  extractFunction("zonedParts", "zonedOffsetMs"),
  extractFunction("zonedOffsetMs", "zonedTimeToDate"),
  extractFunction("zonedTimeToDate", "serverWeekMondayUtc"),
  extractFunction("serverWeekMondayUtc", "serverDateFor"),
  extractFunction("bossSpawnKey", "localScheduleContext"),
  extractFunction("localScheduleContext", "bossScheduleMaterializationKey"),
  extractFunction("bossScheduleMaterializationKey", "localDayName"),
  extractFunction("normalizeBossScheduleDashboard", "applyBossScheduleDashboard"),
  "let homeBossScheduleState = { contentHash: 'test-content' };",
  "let bossScheduleRenderState = { materializationKey: '', nextSpawnKey: '' };",
  "let bossScheduleRenderCount = 0;",
  "function renderBossSchedule(settings, now, next, context) { bossScheduleRenderCount += 1; bossScheduleRenderState = { materializationKey: bossScheduleMaterializationKey(settings, now, next, context), nextSpawnKey: bossSpawnKey(next) }; return true; }",
  extractFunction("refreshBossScheduleIfNeeded", "renderBossToggles"),
  "globalThis.bossScheduleTest = { bossEventColor, zonedTimeToDate, normalizeBossScheduleDashboard, bossSpawnKey, localScheduleContext, bossScheduleMaterializationKey, refreshBossScheduleIfNeeded, getBossScheduleRenderCount: () => bossScheduleRenderCount };"
].join("\n");

const context = {};
vm.createContext(context);
vm.runInContext(extractedCode, context);

const {
  bossEventColor,
  zonedTimeToDate,
  normalizeBossScheduleDashboard,
  bossSpawnKey,
  bossScheduleMaterializationKey,
  refreshBossScheduleIfNeeded,
  getBossScheduleRenderCount
} = context.bossScheduleTest;
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

const babyVellColor = bossEventColor("Baby Vell");
const wingedMermaidColor = bossEventColor("Winged Mermaid");
if (!/^#[0-9a-f]{6}$/i.test(babyVellColor)
  || !/^#[0-9a-f]{6}$/i.test(wingedMermaidColor)
  || babyVellColor.toLowerCase() === "#ffffff"
  || wingedMermaidColor.toLowerCase() === "#ffffff"
  || babyVellColor === wingedMermaidColor
  || bossEventColor("Baby Vell") !== babyVellColor
  || bossEventColor("Vell") !== null) {
  throw new Error("Unknown event bosses must receive stable, distinct, non-white colors without replacing existing boss colors.");
}
if (!appScript.includes("function renderBossName(name)")
  || !appScript.includes("boss-event")
  || !appCss.includes(".bossName.boss-event")
  || !appCss.includes("--boss-event-color")) {
  throw new Error("The dynamic event-boss palette is no longer connected to schedule rendering and styling.");
}
if (!appScript.includes("refreshBossScheduleIfNeeded(settings,now,next)")
  || !appScript.includes("bossScheduleRenderState={materializationKey:\"\",nextSpawnKey:\"\"}")
  || !appScript.includes("cell.spawnKeys.has(nextKey)")) {
  throw new Error("The active boss-cell refresh is no longer wired into the one-second Home timer path.");
}
if (!appScript.includes('title="${escapeHtml(name)}"')
  || !appCss.includes("#homeView .bossScheduleCell>.bossName")
  || !appCss.includes("overflow-wrap:anywhere")
  || !appCss.includes("-webkit-line-clamp:3")) {
  throw new Error("Long future boss names must remain contained and discoverable in fixed-width schedule cells.");
}

const nextA = {
  date: new Date("2026-07-30T12:00:00.000Z"),
  serverDay: "Thursday",
  serverTime: "14:00",
  bosses: ["Garmoth"]
};
const nextB = {
  date: new Date("2026-07-30T14:00:00.000Z"),
  serverDay: "Thursday",
  serverTime: "16:00",
  bosses: ["Sangoon", "Karanda"]
};
if (bossSpawnKey(nextA) === bossSpawnKey(nextB)
  || bossSpawnKey(nextA) !== bossSpawnKey({ ...nextA })
  || bossSpawnKey(null) !== "none") {
  throw new Error("Next-spawn identity must be stable between ticks and change when the highlighted spawn changes.");
}

const serverSettings = { timeFormat: "12", showLocalTime: false };
const localSettings = { timeFormat: "12", showLocalTime: true };
const renderNow = new Date("2026-07-30T09:00:00.000Z");
const baseContext = {
  serverWeekMondayUtc: Date.UTC(2026, 6, 27),
  timeZone: "Europe/Vienna",
  localOffsetMinutes: -120,
  serverOffsetMinutes: 120
};
const baseLocalKey = bossScheduleMaterializationKey(localSettings, renderNow, nextA, baseContext);
const changedContexts = [
  { ...baseContext, serverWeekMondayUtc: Date.UTC(2026, 7, 3) },
  { ...baseContext, timeZone: "Europe/London" },
  { ...baseContext, localOffsetMinutes: -60 },
  { ...baseContext, serverOffsetMinutes: 60 }
];
if (changedContexts.some(value =>
  bossScheduleMaterializationKey(localSettings, renderNow, nextA, value) === baseLocalKey)) {
  throw new Error("Local schedule materialization must refresh across week, timezone, and DST offset boundaries.");
}
const baseServerKey = bossScheduleMaterializationKey(serverSettings, renderNow, nextA, baseContext);
if (changedContexts.some(value =>
  bossScheduleMaterializationKey(serverSettings, renderNow, nextA, value) !== baseServerKey)) {
  throw new Error("Local timezone context must not force unnecessary server-time table rerenders.");
}
if (!refreshBossScheduleIfNeeded(localSettings, renderNow, nextA, baseContext)
  || getBossScheduleRenderCount() !== 1
  || refreshBossScheduleIfNeeded(localSettings, new Date(renderNow.getTime() + 1000), nextA, baseContext)
  || getBossScheduleRenderCount() !== 1
  || !refreshBossScheduleIfNeeded(localSettings, renderNow, nextB, baseContext)
  || getBossScheduleRenderCount() !== 2
  || !refreshBossScheduleIfNeeded(localSettings, renderNow, nextB, changedContexts[2])
  || getBossScheduleRenderCount() !== 3) {
  throw new Error("The schedule must rerender only when the next spawn or Local-time materialization context changes.");
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
