#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const defaultScriptPath = fileURLToPath(
  new URL("../Source Code/BlackSpiritHub.Resources.Black_Spirit_Hub.js", import.meta.url),
);
const scriptPath = path.resolve(process.argv[2] || defaultScriptPath);
const sourceRoot = path.dirname(scriptPath);
const htmlPath = scriptPath.replace(/\.js$/i, ".html");
const cssPath = scriptPath.replace(/\.js$/i, ".css");
const nativePath = path.join(sourceRoot, "BlackSpiritHub", "CalculatorForm.cs");
const navigationIconsPath = path.join(sourceRoot, "NavigationAssets", "nav-icons.svg");

for (const requiredPath of [scriptPath, htmlPath, cssPath, nativePath, navigationIconsPath]) {
  assert.ok(fs.existsSync(requiredPath), `Required Weeklies source is missing: ${requiredPath}`);
}

const source = fs.readFileSync(scriptPath, "utf8");
const html = fs.readFileSync(htmlPath, "utf8");
const css = fs.readFileSync(cssPath, "utf8");
const nativeSource = fs.readFileSync(nativePath, "utf8");
const navigationIcons = fs.readFileSync(navigationIconsPath, "utf8");
const startMarker = "/* WEEKLY_PLANNER_START */";
const endMarker = "/* WEEKLY_PLANNER_END */";
const start = source.indexOf(startMarker);
const end = source.indexOf(endMarker, start);
assert.ok(start >= 0 && end > start, "Could not isolate the Weeklies JavaScript block.");
const weekliesSource = source.slice(start, end + endMarker.length);

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function createHarness({ browserState = {}, initializeResult, bridgeHandler } = {}) {
  const settingStore = new Map([["weekliesSettings", clone(browserState)]]);
  const persisted = [];
  const bridgeCalls = [];
  const notifications = [];
  let clockMs = Date.parse("2026-09-03T00:00:00.000Z");

  class ControlledDate extends Date {
    constructor(...args) {
      super(...(args.length ? args : [clockMs]));
    }
    static now() { return clockMs; }
    static parse(value) { return Date.parse(value); }
    static UTC(...args) { return Date.UTC(...args); }
  }

  const classList = { add() {}, remove() {}, toggle() {} };
  const document = {
    activeElement: null,
    body: { dataset: {}, classList },
    getElementById() { return null; },
    querySelector() { return null; },
    addEventListener() {},
  };

  const context = vm.createContext({
    Date: ControlledDate,
    document,
    window: { matchMedia: () => ({ matches: false }) },
    requestAnimationFrame: callback => callback(),
    setTimeout,
    clearTimeout,
    readSetting(key, fallback) {
      return settingStore.has(key) ? clone(settingStore.get(key)) : clone(fallback);
    },
    persistSetting(key, value) {
      const saved = clone(value);
      settingStore.set(key, saved);
      persisted.push({ key, value: saved });
    },
    flushSetting() {},
    async bridgeCall(command, payload = {}) {
      const call = { command, payload: clone(payload) };
      bridgeCalls.push(call);
      if (bridgeHandler) {
        const handled = await bridgeHandler(command, clone(payload), call);
        if (handled !== undefined) return handled;
      }
      if (command === "initializeWeeklyPlanner") {
        return clone(initializeResult ?? { stateExists: false, state: null });
      }
      if (command === "saveWeeklyPlannerState") {
        return { state: clone(payload) };
      }
      if (command === "showDesktopNotification") return { shown: true };
      if (command === "flashTaskbarAttention") return { flashed: true };
      if (command === "setWeekliesBadgeCount") return { count: payload.count ?? 0 };
      return {};
    },
    NotificationService: {
      ShowInfo(message, title) { notifications.push({ kind: "info", message, title }); },
      ShowSuccess(message, title) { notifications.push({ kind: "success", message, title }); },
    },
    escapeHtml(value) { return String(value ?? ""); },
    activateAppView() {},
    console,
    Promise,
    Map,
    Set,
  });

  const expose = `
    globalThis.__weekliesTest = {
      normalize: value => normalizeWeeklyState(value),
      state: () => weeklyStatePayload(),
      setState: value => { weeklySettings = normalizeWeeklyState(value); },
      task: id => WEEKLY_CATALOG_BY_ID.get(id),
      catalog: () => WEEKLY_CATALOG.map(task => ({ id: task.id, accent: task.accent })),
      formatCountdown: value => weeklyFormatCountdown(value),
      countdownState: (id, now) => weeklyTaskCountdownState(WEEKLY_CATALOG_BY_ID.get(id), new Date(now)),
      cardMarkup: (id, now) => weeklyCardMarkup(WEEKLY_CATALOG_BY_ID.get(id), new Date(now)),
      targetIso: (id, now) => weeklyTaskTarget(WEEKLY_CATALOG_BY_ID.get(id), new Date(now))?.toISOString() || null,
      periodKey: (id, now) => weeklyTaskPeriodKey(WEEKLY_CATALOG_BY_ID.get(id), new Date(now)),
      isDone: (id, now) => weeklyTaskIsDone(WEEKLY_CATALOG_BY_ID.get(id), new Date(now)),
      renderSignature: (id, now) => weeklyTaskRenderSignature(WEEKLY_CATALOG_BY_ID.get(id), new Date(now)),
      activeGroups: now => weeklyActiveReminderGroups(new Date(now)).map(group => ({
        target: group.target.toISOString(),
        ids: group.tasks.map(task => task.id),
      })),
      markAll: () => markAllWeekliesDone(),
      checkNotifications: now => checkWeeklyNotifications(new Date(now)),
      hydrate: () => hydrateWeeklyState(),
      persist: () => persistWeeklyState({ render: false }),
      setHydrated: value => { weekliesRuntime.hydrated = value === true; },
      drainWrites: () => weekliesRuntime.writeQueue,
    };
  `;
  new vm.Script(`${weekliesSource}\n${expose}`, { filename: scriptPath }).runInContext(context);

  return {
    api: context.__weekliesTest,
    bridgeCalls,
    notifications,
    persisted,
    storedState: () => clone(settingStore.get("weekliesSettings")),
    setClock(value) {
      const parsed = Date.parse(value);
      assert.ok(Number.isFinite(parsed), `Invalid test clock: ${value}`);
      clockMs = parsed;
    },
  };
}

function plain(value) {
  return clone(value);
}

// Requested catalogue, colour, card-copy, and countdown presentation must remain stable.
{
  const { api } = createHarness();
  const catalog = plain(api.catalog());
  const ids = catalog.map(task => task.id);
  const accents = catalog.map(task => task.accent);

  assert.equal(ids.includes("vell-attendance"), false, "Vell Attendance must stay removed");
  assert.equal(ids.includes("guild-gumiho-duoksini"), false, "Guild Gumiho + Duoksini must stay removed");
  assert.equal(new Set(accents).size, catalog.length, "every weekly activity needs a unique accent colour");
  assert.ok(accents.every(accent => /^#[0-9a-f]{6}$/i.test(accent)), "weekly accents must be valid full hex colours");

  const normalized = plain(api.normalize({
    selectedIds: ["vell-attendance", "guild-gumiho-duoksini", "pit-of-the-undying"],
  }));
  assert.deepEqual(normalized.selectedIds, ["pit-of-the-undying"], "removed activities must be pruned from saved selections");

  const card = api.cardMarkup("pit-of-the-undying", "2026-09-04T00:00:00.000Z");
  assert.doesNotMatch(card, /weeklyTaskCategory|weeklyResetPill/, "task cards must not restore the removed info pills");
  assert.doesNotMatch(card, /<small\b|Weekly quest/, "dashboard cards must not restore the removed metadata line");
  assert.match(card, /--weekly-task-accent:#[0-9a-f]{6}/i, "task cards must expose their unique accent");

  const day = 86400000;
  assert.equal(api.formatCountdown(5 * day + 16 * 3600000 + 50 * 60000 + 21000), "5 days remaining");
  assert.equal(api.formatCountdown(4 * day + 23 * 3600000), "4 days remaining");
  assert.equal(api.formatCountdown(day + 15 * 3600000 + 50 * 60000 + 10000), "1 day remaining");
  assert.equal(api.formatCountdown(day), "24:00:00", "the live clock must begin at the 24-hour boundary");
  assert.equal(api.formatCountdown(day - 1000), "23:59:59");
  assert.equal(api.formatCountdown(0), "00:00:00");
  assert.equal(api.countdownState("pit-of-the-undying", "2026-09-08T23:59:59.000Z"), "standard");
  assert.equal(api.countdownState("pit-of-the-undying", "2026-09-09T00:00:00.000Z"), "urgent", "the timer must turn urgent at exactly 24 hours");
  assert.match(api.cardMarkup("pit-of-the-undying", "2026-09-09T00:00:00.000Z"), /data-weekly-countdown-state="urgent"/);
}

// Fixed weekly policies must be UTC-based and advance at the exact boundary.
{
  const { api } = createHarness();
  assert.equal(
    api.targetIso("pit-of-the-undying", "2026-09-02T23:59:59.999Z"),
    "2026-09-03T00:00:00.000Z",
    "Thursday activities must reset at Thursday 00:00 UTC",
  );
  assert.equal(
    api.targetIso("pit-of-the-undying", "2026-09-03T00:00:00.000Z"),
    "2026-09-10T00:00:00.000Z",
    "the next Thursday cycle must begin exactly at the reset boundary",
  );
  assert.equal(
    api.targetIso("black-shrine-donghae", "2026-09-05T23:59:59.999Z"),
    "2026-09-06T00:00:00.000Z",
    "Sunday activities must reset at Sunday 00:00 UTC",
  );
  assert.equal(
    api.targetIso("guild-boss-raid", "2026-09-06T23:59:59.999Z"),
    "2026-09-07T00:00:00.000Z",
    "guild activities must reset at Monday 00:00 UTC",
  );
  assert.equal(
    api.targetIso("weekly-fishing-contest", "2026-09-07T00:19:59.999Z"),
    "2026-09-07T00:20:00.000Z",
    "the fishing contest must roll over at Monday 00:20 UTC",
  );
  assert.equal(
    api.targetIso("weekly-fishing-contest", "2026-09-07T00:20:00.000Z"),
    "2026-09-14T00:20:00.000Z",
    "the fishing target must advance a week at its exact rollover",
  );
}

// A rolling Dark Rift completion keeps one stable 120-hour target until it expires.
{
  const { api } = createHarness();
  const completed = "2026-09-01T12:34:56.000Z";
  const expires = "2026-09-06T12:34:56.000Z";
  api.setState({
    onboardingComplete: true,
    selectedIds: ["dark-rifts-sweep"],
    notificationsEnabled: true,
    reminderDays: 3,
    doneById: { "dark-rifts-sweep": completed },
  });
  assert.equal(api.targetIso("dark-rifts-sweep", "2026-09-01T12:35:00.000Z"), expires);
  assert.equal(api.targetIso("dark-rifts-sweep", "2026-09-05T23:59:59.000Z"), expires);
  assert.equal(api.periodKey("dark-rifts-sweep", "2026-09-04T00:00:00.000Z"), "2026-09-04T00:00:00.000Z");
  assert.equal(api.isDone("dark-rifts-sweep", "2026-09-06T12:34:55.999Z"), true);
  assert.equal(api.renderSignature("dark-rifts-sweep", "2026-09-06T12:34:55.999Z"), `active:${completed}`);
  assert.equal(api.isDone("dark-rifts-sweep", expires), false, "rolling completion must expire at exactly 120 hours");
  assert.equal(api.renderSignature("dark-rifts-sweep", expires), "ready");
}

// All done marks only unfinished activities so it cannot postpone an active rolling reset.
{
  const { api, setClock } = createHarness();
  const rollingCompleted = "2026-09-01T12:34:56.000Z";
  setClock("2026-09-04T12:00:00.000Z");
  api.setState({
    onboardingComplete: true,
    selectedIds: ["dark-rifts-sweep", "pit-of-the-undying", "sailing-dailies"],
    doneById: { "dark-rifts-sweep": rollingCompleted },
  });
  api.markAll();
  const state = plain(api.state());
  assert.equal(state.doneById["dark-rifts-sweep"], rollingCompleted, "All done must preserve an active rolling completion anchor");
  assert.equal(state.doneById["pit-of-the-undying"], "2026-09-10T00:00:00.000Z");
  assert.equal(state.doneById["sailing-dailies"], "2026-09-05T00:00:00.000Z");
  assert.equal(api.isDone("pit-of-the-undying", "2026-09-09T23:59:59.999Z"), true);
  assert.equal(api.isDone("pit-of-the-undying", "2026-09-10T00:00:00.000Z"), false, "weekly completion must clear at reset");
  assert.equal(api.isDone("sailing-dailies", "2026-09-04T23:59:59.999Z"), true);
  assert.equal(api.isDone("sailing-dailies", "2026-09-05T00:00:00.000Z"), false, "daily completion must clear at reset");
}

// Reminders are opt-in. Merely selecting activities must not enable them.
{
  const { api, bridgeCalls } = createHarness({
    browserState: {
      onboardingComplete: true,
      selectedIds: ["pit-of-the-undying"],
      reminderDays: 3,
    },
  });
  const normalizedDefault = plain(api.normalize({}));
  assert.equal(normalizedDefault.notificationsEnabled, false);
  assert.equal(normalizedDefault.reminderDays, 1);
  assert.deepEqual(plain(api.activeGroups("2026-09-09T00:00:00.000Z")), []);
  await api.hydrate();
  assert.equal(await api.checkNotifications("2026-09-09T00:00:00.000Z"), false);
  assert.equal(bridgeCalls.filter(call => call.command === "showDesktopNotification").length, 0);
}

async function verifyReminderCascade(reminderDays) {
  const harness = createHarness({
    browserState: {
      onboardingComplete: true,
      selectedIds: ["pit-of-the-undying", "garmoth-weekly-loot"],
      reminderDays,
      notificationsEnabled: true,
      doneById: {},
      notified: {},
    },
  });
  const { api, bridgeCalls } = harness;
  await api.hydrate();
  await api.drainWrites();
  const resetMs = Date.parse("2026-09-10T00:00:00.000Z");
  const beforeWindow = new Date(resetMs - (reminderDays + 1) * 86400000).toISOString();
  harness.setClock(beforeWindow);
  assert.equal(await api.checkNotifications(beforeWindow), false);

  let expectedDeliveries = 0;
  for (let days = reminderDays; days >= 1; days--) {
    const stageMs = resetMs - days * 86400000;
    const stage = new Date(stageMs).toISOString();
    harness.setClock(stage);

    const groups = plain(api.activeGroups(stage));
    assert.equal(groups.length, 1, `${days}-day stage should combine activities with the same reset`);
    assert.deepEqual(groups[0].ids, ["pit-of-the-undying", "garmoth-weekly-loot"]);

    assert.equal(await api.checkNotifications(stage), true, `${days}-day reminder should be delivered`);
    expectedDeliveries++;
    const desktopCalls = bridgeCalls.filter(call => call.command === "showDesktopNotification");
    assert.equal(desktopCalls.length, expectedDeliveries, "one grouped desktop reminder is expected per stage");
    assert.equal(
      desktopCalls.at(-1).payload.title,
      days === 1 ? "Weeklies reset tomorrow" : `Weeklies reset in ${days} days`,
    );
    assert.match(desktopCalls.at(-1).payload.message, /^2 unfinished:/);

    const expectedKey = `weekly|2026-09-10T00:00:00.000Z|${days}`;
    assert.equal(plain(api.state()).notified[expectedKey], true, "the delivered stage must be persisted for deduplication");
    assert.equal(await api.checkNotifications(stage), false, "the exact same reminder check must be deduplicated");

    const laterSameStage = new Date(stageMs + 60 * 60 * 1000).toISOString();
    harness.setClock(laterSameStage);
    assert.equal(await api.checkNotifications(laterSameStage), false, "repeated checks in the same remaining-day bucket must be deduplicated");
    assert.equal(
      bridgeCalls.filter(call => call.command === "showDesktopNotification").length,
      expectedDeliveries,
    );
  }

  assert.equal(expectedDeliveries, reminderDays, `a ${reminderDays}-day window must cascade through every remaining day`);
}

await verifyReminderCascade(1);
await verifyReminderCascade(2);
await verifyReminderCascade(3);

// Background reminders must wait for native hydration and clear stale badges
// when a reset or completion leaves nothing due.
{
  const state = {
    schemaVersion: 1,
    revision: 4,
    onboardingComplete: true,
    selectedIds: ["pit-of-the-undying"],
    reminderDays: 3,
    notificationsEnabled: true,
    doneById: {},
    notified: {},
  };
  const harness = createHarness({
    browserState: state,
    initializeResult: { stateExists: true, state },
  });
  const { api, bridgeCalls } = harness;
  harness.setClock("2026-09-09T00:00:00.000Z");
  assert.equal(await api.checkNotifications("2026-09-09T00:00:00.000Z"), false);
  assert.equal(
    bridgeCalls.filter(call => call.command === "showDesktopNotification").length,
    0,
    "a stale browser copy must not notify before native hydration",
  );
  await api.hydrate();
  assert.equal(await api.checkNotifications("2026-09-09T00:00:00.000Z"), true);
  assert.equal(
    bridgeCalls.filter(call => call.command === "setWeekliesBadgeCount").at(-1).payload.count,
    1,
  );
  api.setState({
    ...state,
    revision: 5,
    doneById: {
      "pit-of-the-undying": api.periodKey("pit-of-the-undying", "2026-09-09T00:00:00.000Z"),
    },
  });
  assert.equal(await api.checkNotifications("2026-09-09T00:00:00.000Z"), false);
  assert.equal(
    bridgeCalls.filter(call => call.command === "setWeekliesBadgeCount").at(-1).payload.count,
    0,
    "an empty reminder group must clear the red native badge",
  );
}

// The newest revision wins hydration, protecting a browser-side change when a
// forced close interrupted its native write while still accepting newer native data.
{
  const browserState = {
    schemaVersion: 1,
    revision: 20,
    onboardingComplete: true,
    selectedIds: ["pit-of-the-undying"],
    reminderDays: 2,
    notificationsEnabled: false,
    doneById: {},
    notified: {},
  };
  const olderNative = { ...browserState, revision: 10, selectedIds: ["altar-of-blood"] };
  const localWins = createHarness({
    browserState,
    initializeResult: { stateExists: true, state: olderNative },
  });
  await localWins.api.hydrate();
  await localWins.api.drainWrites();
  assert.deepEqual(plain(localWins.api.state()).selectedIds, ["pit-of-the-undying"]);
  assert.equal(
    localWins.bridgeCalls.filter(call => call.command === "saveWeeklyPlannerState").at(-1).payload.revision,
    20,
    "the newer browser revision must repair stale native state",
  );

  const newerNative = { ...browserState, revision: 30, selectedIds: ["altar-of-blood"] };
  const nativeWins = createHarness({
    browserState,
    initializeResult: { stateExists: true, state: newerNative },
  });
  await nativeWins.api.hydrate();
  assert.equal(plain(nativeWins.api.state()).revision, 30);
  assert.deepEqual(plain(nativeWins.api.state()).selectedIds, ["altar-of-blood"]);
  assert.equal(
    nativeWins.bridgeCalls.filter(call => call.command === "saveWeeklyPlannerState").length,
    0,
  );

  const invalidNative = createHarness({
    browserState,
    initializeResult: { stateExists: false, state: { ...browserState, revision: 0, selectedIds: [] } },
  });
  await invalidNative.api.hydrate();
  await invalidNative.api.drainWrites();
  assert.deepEqual(plain(invalidNative.api.state()).selectedIds, ["pit-of-the-undying"]);
  assert.equal(
    invalidNative.bridgeCalls.filter(call => call.command === "saveWeeklyPlannerState").at(-1).payload.revision,
    20,
    "invalid native data must not replace the browser fallback",
  );
}

// Every local mutation advances the revision before its native save is queued.
{
  const { api } = createHarness();
  api.setHydrated(true);
  api.setState({ revision: 7 });
  api.persist();
  assert.ok(plain(api.state()).revision > 7);
}

// An intentionally empty configured route is valid and must survive both migration and native hydration.
{
  const emptyRoute = {
    schemaVersion: 1,
    onboardingComplete: true,
    selectedIds: [],
    reminderDays: 2,
    notificationsEnabled: false,
    doneById: {},
    notified: {},
  };
  const migrationHarness = createHarness({
    browserState: emptyRoute,
    initializeResult: { stateExists: false, state: null },
  });
  await migrationHarness.api.hydrate();
  await migrationHarness.api.drainWrites();
  const migrationSave = migrationHarness.bridgeCalls.find(call => call.command === "saveWeeklyPlannerState");
  assert.ok(migrationSave, "a browser-only empty configured route must be migrated to native storage");
  assert.equal(migrationSave.payload.onboardingComplete, true);
  assert.deepEqual(migrationSave.payload.selectedIds, []);
  assert.deepEqual(plain(migrationHarness.api.state()).selectedIds, []);

  const nativeHarness = createHarness({
    browserState: { ...emptyRoute, selectedIds: ["pit-of-the-undying"] },
    initializeResult: { stateExists: true, state: emptyRoute },
  });
  await nativeHarness.api.hydrate();
  assert.equal(plain(nativeHarness.api.state()).onboardingComplete, true);
  assert.deepEqual(plain(nativeHarness.api.state()).selectedIds, []);
  assert.deepEqual(nativeHarness.storedState().selectedIds, []);
  assert.equal(
    nativeHarness.bridgeCalls.filter(call => call.command === "saveWeeklyPlannerState").length,
    0,
    "a durable empty route must not be mistaken for missing state",
  );
}

// The HTML, navigation sprite, JavaScript startup, and native bridge must remain wired together.
{
  const requiredElementIds = [
    "weekliesView",
    "weekliesDashboardActions",
    "weekliesOnboarding",
    "weekliesOnboardingSearch",
    "weekliesOnboardingCategories",
    "weekliesOnboardingList",
    "weekliesOnboardingCount",
    "weekliesOnboardingHint",
    "weekliesSelectRecommended",
    "weekliesFinishOnboarding",
    "weekliesDashboard",
    "weekliesCompletedCount",
    "weekliesCompletedLabel",
    "weekliesRemainingCount",
    "weekliesNextReset",
    "weekliesNextResetLabel",
    "weekliesProgressPercent",
    "weekliesProgressBar",
    "weekliesDashboardList",
    "weekliesLiveStatus",
    "weekliesAllDone",
    "weekliesOpenSettings",
    "weekliesSettingsOverlay",
    "weekliesCloseSettings",
    "weekliesCancelSettings",
    "weekliesSaveSettings",
    "weekliesSettingsSearch",
    "weekliesSettingsList",
    "weekliesSettingsCount",
    "weekliesReminderEnabled",
    "weekliesReminderDays",
    "weekliesStatusAlert",
  ];
  for (const id of requiredElementIds) {
    assert.match(html, new RegExp(`id=["']${id}["']`), `Weeklies markup lost #${id}`);
  }
  assert.match(html, /data-app-view=["']weekliesView["']/);
  assert.match(html, /href=["']NavigationAssets\/nav-icons\.svg[^"']*#nav-icon-weeklies["']/);
  assert.match(html, /class=["'][^"']*weekliesSettingsDialog[^"']*["'][^>]*role=["']dialog["']/);
  assert.match(html, /id=["']weekliesReminderEnabled["'][^>]*type=["']checkbox["']/);
  assert.doesNotMatch(html, /id=["']weekliesResetLegend["']/, "the dashboard reset-policy pills must remain removed");
  for (const days of [1, 2, 3]) {
    assert.match(html, new RegExp(`<option value=["']${days}["']>${days} day${days === 1 ? "" : "s"} before reset<\\/option>`));
  }
  assert.match(navigationIcons, /id=["']nav-icon-weeklies["']/);
  assert.match(source, /initializeWeeklies\(\);/);
  assert.match(source, /if\(viewId === ["']weekliesView["']\)\{initializeWeeklies\(\);tickWeeklies\(\)\}/);
  assert.match(source, /checkWeeklyNotifications\(now\)/);
  assert.match(css, /#weekliesSettingsOverlay \.weekliesSearch>input/);
  assert.match(css, /#weekliesSettingsOverlay \.weekliesReminderSelect select/);
  assert.match(css, /body\[data-style\] #weekliesView \.weeklyTaskCopy h3\{[^}]*color:var\(--weekly-task-accent\)!important/);
  assert.match(css, /\.weeklyTaskCopy p\{[^}]*color:var\(--text\)/);
  assert.match(css, /body\[data-style\] #weekliesView \.weeklyTaskCopy h3\{[^}]*font:900 17px/);
  assert.match(css, /\.weeklyTaskCopy p\{[^}]*font-size:11px/);
  assert.doesNotMatch(css, /\.weeklyTaskCopy>small\{/);
  assert.match(css, /\.weekliesDashboardGrid\{[^}]*grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(css, /\.weeklyTaskClock strong\{[^}]*color:var\(--weekly-timer\)/);
  assert.match(css, /\.weeklyTaskClock strong\[data-weekly-countdown-state="urgent"\]\{[^}]*color:var\(--weekly-timer-urgent\)/);
  assert.match(css, /#weekliesNextReset\{[^}]*color:var\(--weekly-timer\)/);
  assert.match(css, /#weekliesNextReset\[data-weekly-countdown-state="urgent"\]\{[^}]*color:var\(--weekly-timer-urgent\)/);
  assert.doesNotMatch(css, /\.weeklyTaskClock strong\{[^}]*weekly-task-accent/);
  assert.doesNotMatch(css, /weekliesResetLegend|weekliesDashboardGroup/);
  assert.doesNotMatch(weekliesSource, /weekliesResetLegend|weekliesDashboardGroup|weekliesEl\.legend/);
  assert.match(weekliesSource, /class="weekliesDashboardGrid"/);
  assert.match(weekliesSource, /countdown\.dataset\.weeklyCountdownState=weeklyTaskCountdownState\(task,now\)/);

  for (const command of [
    "initializeWeeklyPlanner",
    "saveWeeklyPlannerState",
    "setWeekliesBadgeCount",
    "showDesktopNotification",
    "flashTaskbarAttention",
  ]) {
    assert.ok(weekliesSource.includes(`bridgeCall("${command}"`), `Weeklies JavaScript lost bridge call ${command}`);
    assert.ok(nativeSource.includes(`case "${command}"`), `Native bridge lost command ${command}`);
  }
}

console.log("Weeklies JavaScript regression verification passed.");
