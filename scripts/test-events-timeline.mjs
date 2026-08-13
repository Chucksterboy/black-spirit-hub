import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const sourceRoot = process.argv[2];
if (!sourceRoot) throw new Error("Pass the Source Code directory.");

const js = fs.readFileSync(path.join(sourceRoot, "BlackSpiritHub.Resources.Black_Spirit_Hub.js"), "utf8");
const css = fs.readFileSync(path.join(sourceRoot, "BlackSpiritHub.Resources.Black_Spirit_Hub.css"), "utf8");
const html = fs.readFileSync(path.join(sourceRoot, "BlackSpiritHub.Resources.Black_Spirit_Hub.html"), "utf8");

const functionLine = name => {
  const start = js.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `Missing ${name}().`);
  const end = js.indexOf("\n", start);
  return js.slice(start, end < 0 ? js.length : end).trim();
};

const labelContext = vm.createContext({});
new vm.Script(functionLine("eventTimelineLabel")).runInContext(labelContext);
const longTitle = "[Summer Refresh] Packages and exceptionally long official event rewards for every adventurer";
labelContext.longTitle = longTitle;
assert.equal(vm.runInContext("eventTimelineLabel(longTitle)", labelContext), longTitle, "timeline labels must never be shortened");
assert.equal(vm.runInContext("eventTimelineLabel('  One   complete   title  ')", labelContext), "One complete title");
assert.doesNotMatch(functionLine("eventTimelineLabel"), /slice\(|\.\.\.|length\s*>/, "timeline labels must not contain a character cap");

const timelineConstants = js.match(/const EVENT_TIMELINE_PAST_DAYS=[^;]+;/)?.[0] || "";
assert.ok(timelineConstants, "Missing shared Events timeline window constants.");
const windowContext = vm.createContext({ Date });
new vm.Script(`${functionLine("eventDateValue")}\n${functionLine("eventDayStart")}\n${timelineConstants}\n${functionLine("eventTimelineWindow")}`).runInContext(windowContext);
assert.equal(vm.runInContext("eventDateValue(null)", windowContext), null, "a missing event date must not become the Unix epoch");
assert.equal(vm.runInContext("eventDateValue(undefined)", windowContext), null);
assert.equal(vm.runInContext("eventDateValue('   ')", windowContext), null, "a blank event date must stay missing");
const augustWindow = vm.runInContext("eventTimelineWindow(new Date(2026,7,13,12,0,0))", windowContext);
assert.equal(augustWindow.firstDay.getFullYear(), 2026);
assert.equal(augustWindow.firstDay.getMonth(), 7);
assert.equal(augustWindow.firstDay.getDate(), 1, "August 1 must remain available when today is August 13");
assert.equal(augustWindow.totalDays, 31, "the expanded timeline must cover the full August window");
const augustWindowEnd = new Date(augustWindow.firstDay);
augustWindowEnd.setDate(augustWindowEnd.getDate() + augustWindow.totalDays - 1);
assert.equal(augustWindowEnd.getMonth(), 7);
assert.equal(augustWindowEnd.getDate(), 31, "the August 13 window must continue through August 31");
assert.doesNotMatch(js, /firstDay\.setDate\(firstDay\.getDate\(\)-5\)|eventNowPercent\(firstDay,21\)/, "rendering and the live clock must use the shared timeline window");

const countdownContext = vm.createContext({ Date });
new vm.Script(`${functionLine("eventDateValue")}\n${functionLine("eventCompactTimeLeft")}\n${functionLine("eventTimeLeftText")}`).runInContext(countdownContext);
countdownContext.freshEnd = { endUtc: new Date(Date.now() + 10 * 60 * 60 * 1000).toISOString(), remainingHours: 240, timeLeftText: "10d" };
assert.equal(vm.runInContext("eventCompactTimeLeft(freshEnd)", countdownContext), "10h", "the live end date must win over a frozen cached countdown");
assert.equal(vm.runInContext("eventTimeLeftText(freshEnd)", countdownContext), "10h left", "the detail countdown must also age locally");
countdownContext.expiredEnd = { endUtc: new Date(Date.now() - 60 * 1000).toISOString(), remainingHours: 240, timeLeftText: "10d" };
assert.equal(vm.runInContext("eventCompactTimeLeft(expiredEnd)", countdownContext), "Ends soon", "an expired end date must not display stale remaining days");

const positionContext = vm.createContext({ Date });
new vm.Script(`${functionLine("eventDateValue")}\n${functionLine("eventDayStart")}\n${functionLine("eventOfficialDayStart")}\n${functionLine("eventHasOpenEndedSchedule")}\n${functionLine("eventClamp")}\n${functionLine("eventTimelinePosition")}`).runInContext(positionContext);
positionContext.firstDay = new Date(2026, 7, 1);
positionContext.today = new Date(2026, 7, 13, 12);
positionContext.undatedOngoing = { timeLeftText: "Ongoing", startUtc: null, endUtc: null };
assert.equal(vm.runInContext("eventTimelinePosition(undatedOngoing,firstDay,31,today)", positionContext), null, "an undated ongoing item must not fabricate a calendar marker");
assert.equal(vm.runInContext("eventHasOpenEndedSchedule(undatedOngoing)", positionContext), true, "an undated ongoing item belongs in the separate ongoing section");
positionContext.startedOngoing = { timeLeftText: "Ongoing", startUtc: "2026-08-05T00:00:00Z", endUtc: null };
assert.equal(vm.runInContext("eventTimelinePosition(startedOngoing,firstDay,31,today)", positionContext), null, "an event without a fixed end belongs outside the dated calendar even when its start is known");
assert.equal(vm.runInContext("eventHasOpenEndedSchedule(startedOngoing)", positionContext), true);
positionContext.undated = { startUtc: null, endUtc: null, publishedUtc: "2025-01-01T00:00:00Z" };
assert.equal(vm.runInContext("eventTimelinePosition(undated,firstDay,31,today)", positionContext), null, "unknown dates must not fabricate a month-long event strip");
positionContext.exactRange = { startUtc: "2026-08-05T00:00:00Z", endUtc: "2026-08-08T23:59:00Z" };
assert.deepEqual({ ...vm.runInContext("eventTimelinePosition(exactRange,firstDay,31,today)", positionContext) }, { start: 5, end: 9 }, "known event dates must retain their exact inclusive duration");
positionContext.startOnly = { startUtc: "2026-08-05T00:00:00Z", endUtc: null };
assert.deepEqual({ ...vm.runInContext("eventTimelinePosition(startOnly,firstDay,31,today)", positionContext) }, { start: 5, end: 6 }, "a one-sided date must render as a one-day marker instead of an invented duration");

assert.match(html, /id="eventsTimelineScroller"[^>]*class="eventsTimeline"[^>]*aria-label="[^"]*Drag horizontally[^>]*tabindex="0"/);
assert.match(css, /\.eventsTimeline\{[^}]*overflow-x:auto;[^}]*overflow-y:hidden;[^}]*scrollbar-width:none;[^}]*touch-action:pan-x pan-y;[^}]*cursor:grab/);
assert.match(css, /\.eventsTimeline\.isDragging,[^{]+\{[^}]*cursor:grabbing!important;[^}]*user-select:none!important/);
assert.match(css, /\.eventsTimelineBar\{[^}]*overflow:visible/);
assert.match(css, /\.eventsTimelineBarText\{[^}]*min-width:max-content;[^}]*overflow:visible;[^}]*text-overflow:clip;[^}]*max-width:none/);
assert.match(css, /\.eventsTimelineBarText\{[^}]*position:relative;[^}]*transform:translateX\(var\(--event-label-shift,0px\)\)/, "event titles must use the measured visible-viewport offset rather than unreliable sticky positioning");
assert.match(js, /function eventsSyncTimelineLabels\([^)]*\)[^{]*\{[^\n]*--event-label-shift/, "horizontal scrolling must update the title's visible offset");
assert.match(js, /addEventListener\("scroll",onScroll,\{passive:true\}\)/, "label visibility must update for drag, wheel, and keyboard scrolling");
assert.match(css, /\.eventsTimelinePill\{[^}]*position:sticky;[^}]*right:10px/, "event countdown pills must remain attached to the visible part of long strips");
assert.doesNotMatch(css, /\.eventsTimelineBarText\{[^}]*text-overflow:ellipsis/);
assert.doesNotMatch(css, /#calculatorView #originSelect,\.eventsTimeline/, "the late global scrollbar rule must not expose the Events scrollbar");
assert.match(css, /#eventsView \.eventsTimeline\{[^}]*scrollbar-width:none!important/);
assert.match(css, /#eventsView \.eventsTimeline::-webkit-scrollbar\{[^}]*display:none!important;[^}]*height:0!important/);
assert.match(css, /\.eventsShell\{[^}]*width:calc\(100% - 32px\);[^}]*max-width:1900px/, "Events must use the wider desktop workspace without overflowing the client");
assert.match(css, /\.eventsLayout\{[^}]*grid-template-columns:minmax\(0,1fr\) clamp\(330px,22vw,360px\);[^}]*grid-template-areas:"timeline detail" "ongoing detail"/, "the schedule and ongoing section must share the first column while detail stays on the right");
assert.match(css, /@media\(max-width:1280px\)\{\.eventsLayout\{grid-template-columns:1fr;grid-template-areas:"timeline" "ongoing" "detail"\}/, "the wider two-column layout must stack in a deliberate order before becoming cramped");
assert.match(css, /\.eventsTimelineTop\{[^}]*min-width:var\(--events-timeline-min-width,1344px\)/);
assert.match(css, /\.eventsTimelineBars\{[^}]*var\(--events-timeline-column-width,4\.761905%\)/);
assert.match(js, /--events-timeline-min-width",`\$\{totalDays\*64\}px`/);
assert.match(js, /--events-timeline-column-width",`\$\{100\/totalDays\}%`/);
assert.match(js, /addEventListener\("click",onClick,true\)/, "drag click suppression must run in capture phase before event selection");
assert.match(js, /eventsBindTimelineScroller\(eventsEl\.timeline\)/);
assert.match(css, /\.eventsStatus\.maintenance i\{[^}]*var\(--ui-warning\)/, "maintenance must be visibly distinct without using the error state");
assert.match(css, /\.eventsStatus\.cached i\{[^}]*#60a5fa/, "a cached snapshot must use a neutral blue state instead of the live green state");
assert.match(html, /id="eventsOngoing"[^>]*class="eventsOngoing"[^>]*aria-labelledby="eventsOngoingTitle"[^>]*hidden/);
assert.match(html, /id="eventsOngoingTitle">Ongoing — no fixed end date</);
assert.match(css, /\.eventsOngoingList\{[^}]*grid-template-columns:repeat\(auto-fit,minmax\(390px,1fr\)\)/);
assert.match(css, /\.eventsOngoingCopy strong\{[^}]*white-space:normal;[^}]*overflow-wrap:anywhere/, "ongoing titles must wrap in complete cards without cropping");
assert.match(js, /eventsState\.events\.filter\(event=>!eventHasOpenEndedSchedule\(event\)\)/, "undated ongoing events must be excluded from dated bars");
assert.match(js, /eventsState\.events\.filter\(eventHasOpenEndedSchedule\)/, "undated ongoing events must render in their dedicated section");
assert.match(js, /eventsEl\.ongoingList\?\.addEventListener\("click",selectEvent\)/, "ongoing cards must select and render their event details");

const dashboardContext = vm.createContext({ Date, eventsState: { events: [], lastStatus: "" }, capturedStatus: null });
dashboardContext.setEventsStatus = (message, error, state) => { dashboardContext.capturedStatus = { message, error, state }; };
dashboardContext.renderEvents = () => {};
dashboardContext.eventCacheAgeText = () => "1h old";
new vm.Script(`${functionLine("eventDateValue")}\n${functionLine("applyEventsDashboard")}`).runInContext(dashboardContext);
dashboardContext.maintenanceData = { status: "MAINTENANCE", events: [{ id: "cached" }], lastRefreshed: "2026-08-13T07:42:00Z", lastAttempt: "2026-08-13T08:15:00Z", isStale: true, message: "Maintenance detected." };
vm.runInContext("applyEventsDashboard(maintenanceData)", dashboardContext);
assert.equal(dashboardContext.capturedStatus.error, false, "official maintenance is an expected cached-data state, not an app error");
assert.equal(dashboardContext.capturedStatus.state, "maintenance");
assert.match(dashboardContext.capturedStatus.message, /under maintenance/i);
assert.match(dashboardContext.capturedStatus.message, /showing cached events from/i, "maintenance status must identify the cached snapshot time");
dashboardContext.cachedData = { status: "CACHED", events: [{ id: "cached" }], lastRefreshed: "2026-08-13T07:42:00Z", message: "Using cached events." };
vm.runInContext("applyEventsDashboard(cachedData)", dashboardContext);
assert.equal(dashboardContext.capturedStatus.error, false, "a usable cached snapshot must not be presented as an application error");
assert.equal(dashboardContext.capturedStatus.state, "cached", "a cached snapshot must receive its neutral visual state");
assert.match(js, /status!=="MAINTENANCE"&&data\?\.isStale/, "maintenance must not trigger an immediate redundant stale-cache refresh");

class FakeClassList {
  constructor() { this.values = new Set(); }
  add(...values) { values.forEach(value => this.values.add(value)); }
  remove(...values) { values.forEach(value => this.values.delete(value)); }
  contains(value) { return this.values.has(value); }
}

class FakeScroller {
  constructor() {
    this.listeners = new Map();
    this.classList = new FakeClassList();
    this.scrollLeft = 0;
    this.scrollWidth = 1200;
    this.clientWidth = 500;
    this.captured = new Set();
    this.lastScroll = null;
  }
  addEventListener(type, handler, options) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push({ handler, options });
  }
  removeEventListener(type, handler) {
    this.listeners.set(type, (this.listeners.get(type) || []).filter(item => item.handler !== handler));
  }
  dispatch(type, event = {}) {
    event.target ??= this;
    event.currentTarget = this;
    event.defaultPrevented ??= false;
    event.preventDefault ??= function preventDefault() { this.defaultPrevented = true; };
    event.stopImmediatePropagation ??= function stopImmediatePropagation() { this.immediatePropagationStopped = true; };
    for (const item of this.listeners.get(type) || []) {
      item.handler(event);
      if (event.immediatePropagationStopped) break;
    }
    return event;
  }
  setPointerCapture(id) { this.captured.add(id); }
  hasPointerCapture(id) { return this.captured.has(id); }
  releasePointerCapture(id) { this.captured.delete(id); }
  scrollTo(options) { this.scrollLeft = Number(options.left) || 0; this.lastScroll = options; }
}

const start = js.indexOf("function eventsBindTimelineScroller(");
const end = js.indexOf("\nfunction renderEventTimeline", start);
assert.ok(start >= 0 && end > start, "Could not isolate Events timeline drag binding.");
const scroller = new FakeScroller();
const dragContext = vm.createContext({ scroller, setTimeout, clearTimeout });
new vm.Script(`${js.slice(start, end)}\nglobalThis.cleanup=eventsBindTimelineScroller(scroller);`).runInContext(dragContext);

scroller.dispatch("pointerdown", { pointerId: 7, pointerType: "mouse", button: 0, isPrimary: true, clientX: 220, target: { className: "eventsTimelineDay" } });
const move = scroller.dispatch("pointermove", { pointerId: 7, pointerType: "mouse", clientX: 130 });
assert.equal(move.defaultPrevented, true);
assert.equal(scroller.scrollLeft, 90, "dragging left on a date must move the full timeline right");
assert.equal(scroller.classList.contains("isDragging"), true);
assert.equal(scroller.hasPointerCapture(7), true);
scroller.dispatch("pointerup", { pointerId: 7 });
assert.equal(scroller.classList.contains("isDragging"), false);
assert.equal(scroller.hasPointerCapture(7), false);
const suppressedClick = scroller.dispatch("click", {});
assert.equal(suppressedClick.defaultPrevented, true, "the click synthesized after a drag must be suppressed");

await new Promise(resolve => setTimeout(resolve, 5));
const normalClick = scroller.dispatch("click", {});
assert.equal(normalClick.defaultPrevented, false, "later clicks and keyboard activation must remain available");

scroller.scrollLeft = 50;
scroller.dispatch("pointerdown", { pointerId: 8, pointerType: "mouse", button: 0, isPrimary: true, clientX: 100 });
scroller.dispatch("pointermove", { pointerId: 8, pointerType: "mouse", clientX: 96 });
scroller.dispatch("pointerup", { pointerId: 8 });
assert.equal(scroller.scrollLeft, 50, "movement below the drag threshold must remain a click");
assert.equal(scroller.dispatch("click", {}).defaultPrevented, false);

scroller.dispatch("pointerdown", { pointerId: 9, pointerType: "touch", button: 0, isPrimary: true, clientX: 180 });
scroller.dispatch("pointermove", { pointerId: 9, pointerType: "touch", clientX: 100 });
assert.equal(scroller.scrollLeft, 50, "touch input must retain native scrolling instead of manual pointer dragging");

scroller.dispatch("pointerdown", { pointerId: 10, pointerType: "mouse", button: 0, isPrimary: true, clientX: 180 });
scroller.dispatch("pointermove", { pointerId: 10, pointerType: "mouse", clientX: 120 });
scroller.dispatch("pointercancel", { pointerId: 10 });
assert.equal(scroller.classList.contains("isDragging"), false, "pointer cancellation must clear the drag state");

scroller.scrollLeft = 0;
const key = scroller.dispatch("keydown", { target: scroller, key: "ArrowRight" });
assert.equal(key.defaultPrevented, true);
assert.equal(scroller.scrollLeft, 96, "keyboard users must be able to browse the hidden-scrollbar timeline");
assert.equal(scroller.lastScroll?.behavior, "smooth");

vm.runInContext("cleanup()", dragContext);
assert.equal(scroller.classList.contains("isDragging"), false);
assert.equal((scroller.listeners.get("pointerdown") || []).length, 0);

console.log("Events timeline full-title and drag-scroll verification passed.");
