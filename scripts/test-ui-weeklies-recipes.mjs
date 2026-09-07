import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

// Exercise production reset rules, bulk completion, Undo, recipe filtering,
// persisted preferences and detail rendering. No browser profile or network.
const root = path.resolve(process.argv[2] || path.join(import.meta.dirname, "..", "Source Code"));
const main = fs.readFileSync(path.join(root, "BlackSpiritHub.Resources.Black_Spirit_Hub.js"), "utf8");
const enhancement = fs.readFileSync(path.join(root, "Assets", "UiRefresh", "weeklies-recipes.js"), "utf8");
const css = fs.readFileSync(path.join(root, "Assets", "UiRefresh", "weeklies-recipes.css"), "utf8");
const clone = value => JSON.parse(JSON.stringify(value));
const noop = () => {};
function between(source, start, end) {
  const first = source.indexOf(start), last = source.indexOf(end, first + start.length);
  assert.ok(first >= 0 && last > first, `Missing production boundary ${start}`);
  return source.slice(first + start.length, last);
}
function productionFunction(name) {
  const first = main.indexOf(`function ${name}(`); assert.ok(first >= 0, name);
  const next = main.slice(first + 1).search(/^function /m);
  return main.slice(first, next < 0 ? main.length : first + 1 + next);
}
class FakeElement {
  constructor(owner) {
    this.owner = owner; this.dataset = {}; this.style = {setProperty: noop}; this.hidden = false;
    this.children = []; this.attributes = new Map(); this.listeners = new Map(); this.parts = new Map();
    this.classList = {add: noop, remove: noop, toggle: noop}; this.innerHTML = ""; this.textContent = ""; this.open = false;
    this.isConnected = true;
  }
  setAttribute(name, value) {this.attributes.set(name, String(value));}
  removeAttribute(name) {this.attributes.delete(name);}
  addEventListener(name, callback) {this.listeners.set(name, callback);}
  appendChild(element) {this.children.push(element); element.parentNode = this; return element;}
  querySelector(selector) {
    // The test replaces only DOM layout, not the markup-producing functions.
    if (!this.parts.has(selector)) this.parts.set(selector, new FakeElement(this.owner));
    return this.parts.get(selector);
  }
  querySelectorAll() {return [];}
  focus() {this.owner.activeElement = this;}
  showModal() {this.open = true;}
  close() {this.open = false;}
  contains(element) {return this.children.includes(element);}
}
function harness(initialStore = new Map()) {
  let now = Date.parse("2026-09-05T12:00:00Z"), timerId = 0;
  const timers = new Map(), store = new Map(initialStore), calls = [], documentListeners = new Map(), windowListeners = new Map();
  class Clock extends Date {
    constructor(...args) {super(...(args.length ? args : [now]));}
    static now() {return now;}
  }
  const document = {activeElement: null, getElementById: () => null, querySelector: () => null, querySelectorAll: () => [],
    addEventListener: (name, callback) => documentListeners.set(name, callback)};
  document.body = new FakeElement(document); document.body.dataset = {uiRefresh: "on", motion: "reduced"};
  document.createElement = () => new FakeElement(document);
  const ui = {}, recipeState = {data: null, filtered: [], resources: {}, craftPlans: {}, section: "catalog", page: 1, query: "", mode: "name", type: ""};
  const context = vm.createContext({console, Date: Clock, document, CSS: {escape: String}, HTMLImageElement: class {},
    window: {matchMedia: () => ({matches: false}), addEventListener: (name, callback) => windowListeners.set(name, callback)},
    setTimeout: (callback, delay) => {const id = ++timerId; timers.set(id, {callback, due: now + delay}); return id;},
    clearTimeout: id => timers.delete(id), requestAnimationFrame: callback => callback(),
    readSetting: (key, fallback) => clone(store.has(key) ? store.get(key) : fallback),
    persistSetting: (key, value) => store.set(key, clone(value)), flushSetting: noop,
    bridgeCall: async (command, payload) => {calls.push({command, payload: payload && clone(payload)}); return command === "saveWeeklyPlannerState" ? {state: clone(payload)} : {};},
    NotificationService: {ShowSuccess: noop, ShowInfo: noop},
    recipeBookState: recipeState, recipeBookEl: ui, recipeBookHideTooltip: noop, recipeBookFitIcon: noop,
    RECIPE_BOOK_CRAFT_PLANS_SETTING: "recipeBookCraftPlans",
    recipeBookRenderCraftables: noop, recipeBookSetSection: noop,
    escapeHtml: value => String(value ?? "").replace(/[&<>"']/g, character => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[character]))
  });
  vm.runInContext(between(main, "/* WEEKLY_PLANNER_START */", "/* WEEKLY_PLANNER_END */"), context);
  vm.runInContext(between(main, "/* RECIPE_BOOK_CORE_START */", "/* RECIPE_BOOK_CORE_END */"), context);
  for (const name of ["recipeBookFormatCount", "recipeBookOutputYieldLabel", "recipeBookEnhancementLabel", "recipeBookItemTargetAttributes", "recipeBookIconMarkup", "recipeBookCandidateName", "recipeBookCardMarkup", "recipeBookCraftableCardMarkup", "recipeBookPageWindow", "recipeBookRender", "recipeBookPersistCraftPlans", "recipeBookUpdateCraftPlanner"]) vm.runInContext(productionFunction(name), context);
  vm.runInContext(enhancement.replace(/\}\)\(\);\s*$/, 'globalThis.__trial = {state, undoAllDone, toggleFavorite, setCompact, rememberSearch, uiCreateBulkUndo, uiApplyBulkUndo, uiWeeklyOrder, uiRecentRecipeSearches, uiRecipeIds};})();'), context);
  vm.runInContext(`globalThis.__weekly = {state:()=>weeklyStatePayload(),setState:value=>{weeklySettings=normalizeWeeklyState(value);weekliesRuntime.hydrated=true;},task:id=>WEEKLY_CATALOG_BY_ID.get(id),done:id=>weeklyTaskIsDone(WEEKLY_CATALOG_BY_ID.get(id)),markAll:markAllWeekliesDone,toggle:toggleWeeklyDone,target:weeklyTaskTarget,key:weeklyTaskPeriodKey,lookup:WEEKLY_CATALOG_BY_ID};`, context);
  return {context, document, store, calls, ui, recipeState, trial: context.__trial, weekly: context.__weekly,
    now: () => new Clock(), setClock: timestamp => {now = Date.parse(timestamp);},
    flushTimers: () => {for (const [id, timer] of timers) if (timer.due <= now) {timers.delete(id); timer.callback();}},
    refresh: enabled => {document.body.dataset.uiRefresh = enabled ? "on" : "off"; documentListeners.get("bsh:ui-refresh")({detail: {enabled}});},
    recipeEvent: recipeId => windowListeners.get("bsh:recipe-open")({detail: {recipeId}})
  };
}

// Actual All done captures only changes it owns. Manual changes and prior
// completions survive Undo, including toggle-away-and-back in the same cycle.
{
  const h = harness(), ids = ["pit-of-the-undying", "altar-of-blood", "garmoth-weekly-loot"];
  h.weekly.setState({onboardingComplete: true, selectedIds: ids});
  h.weekly.toggle(ids[0]);
  const prior = h.weekly.state().doneById[ids[0]];
  h.weekly.markAll();
  assert.equal(h.trial.state.undo.entries.length, 2);
  assert.ok(ids.every(id => h.weekly.done(id)));
  h.weekly.toggle(ids[1]); h.weekly.toggle(ids[1]);
  h.trial.undoAllDone();
  assert.equal(h.weekly.state().doneById[ids[0]], prior, "a completion preceding All done must survive");
  assert.equal(h.weekly.done(ids[1]), true, "a later manual completion must survive");
  assert.equal(h.weekly.done(ids[2]), false, "only the untouched bulk completion is undone");
  const saved = h.store.get("weekliesSettings");
  assert.equal(saved.doneById[ids[0]], prior, "Undo must use the normal durable persistence path");
  assert.equal(saved.doneById[ids[2]], undefined);
}

// Crossing reset within the Undo window must not resurrect last-cycle keys.
for (const [id, before, after] of [
  ["altar-of-blood", "2026-09-05T23:59:40Z", "2026-09-06T00:00:01Z"],
  ["pit-of-the-undying", "2026-09-09T23:59:40Z", "2026-09-10T00:00:01Z"],
  ["sailing-dailies", "2026-09-05T23:59:40Z", "2026-09-06T00:00:01Z"]
]) {
  const h = harness(); h.setClock(before); h.weekly.setState({onboardingComplete: true, selectedIds: [id]});
  h.weekly.markAll(); const key = h.weekly.state().doneById[id];
  h.setClock(after); assert.equal(h.weekly.done(id), false, `${id} must automatically reset`);
  h.trial.undoAllDone();
  assert.equal(h.weekly.state().doneById[id], key, "Undo must not write previous-cycle state after reset");
  assert.equal(h.weekly.done(id), false);
}
{
  const h = harness(); h.weekly.setState({onboardingComplete: true, selectedIds: ["pit-of-the-undying"]});
  h.weekly.markAll(); h.setClock("2026-09-05T12:01:00Z"); h.flushTimers();
  h.trial.undoAllDone(); assert.equal(h.weekly.done("pit-of-the-undying"), true, "Undo expires at 60 seconds");
}
{
  const h = harness(); h.weekly.setState({onboardingComplete: true, selectedIds: ["dark-rifts-sweep"]});
  h.weekly.markAll(); assert.equal(h.weekly.done("dark-rifts-sweep"), true);
  h.setClock("2026-09-05T12:00:20Z"); h.trial.undoAllDone();
  assert.equal(h.weekly.done("dark-rifts-sweep"), false, "rolling personal timers can be safely undone within the action window");
  h.weekly.markAll(); h.setClock("2026-09-05T11:59:20Z"); h.trial.undoAllDone();
  assert.equal(h.weekly.done("dark-rifts-sweep"), true, "clock rollback must not broaden the Undo window");
}
{
  const h = harness(); h.weekly.setState({onboardingComplete: true, selectedIds: ["pit-of-the-undying", "altar-of-blood"]});
  h.weekly.markAll();
  const saved = h.weekly.state(); saved.selectedIds = ["altar-of-blood"]; h.weekly.setState(saved);
  h.trial.undoAllDone();
  assert.equal(h.weekly.done("pit-of-the-undying"), true, "removed route items must not be mutated by Undo");
  assert.equal(h.weekly.done("altar-of-blood"), false);
  h.refresh(false); h.weekly.markAll(); assert.equal(h.trial.state.undo, null, "master OFF disables new Undo behavior");
}
{
  const h = harness(), tasks = [h.weekly.task("pit-of-the-undying"), h.weekly.task("altar-of-blood")];
  const order = h.trial.uiWeeklyOrder(tasks, "reset", h.now(), () => false, h.weekly.target);
  assert.equal(order[0].id, "altar-of-blood", "Sunday reset precedes Thursday");
  assert.equal(h.trial.uiWeeklyOrder(tasks, "route", h.now(), () => false, h.weekly.target)[0].id, tasks[0].id);
  assert.equal(h.trial.uiWeeklyOrder(tasks, "reset", h.now(), task => task.id === "altar-of-blood", h.weekly.target)[0].id, "pit-of-the-undying", "pending activities sort ahead of completed activities");
}

const recipeFixture = {schemaVersion: 1, source: {}, counts: {},
  items: {"1":{name:"Test Bread <safe>",grade:0,icon:"icons/item-fallback.svg"},"2":{name:"Test Grain",grade:0,icon:"icons/item-fallback.svg"},"3":{name:"Test Salt",grade:0,icon:"icons/item-fallback.svg"}},
  recipes: [{id:"test-bread",outputId:"1",type:"COOK",inputs:[{itemId:"2",count:5},{itemId:"3",count:1}]}, {id:"test-bread-alt",outputId:"1",type:"COOK",inputs:[{itemId:"2",count:10},{itemId:"3",count:1}]}]};
function installRecipes(h) {
  h.context.fixture = recipeFixture;
  h.recipeState.data = vm.runInContext("recipeBookPrepareData(fixture)", h.context);
  h.recipeState.resources = {"2:0":50,"3:0":10};
}
{
  const h = harness(); installRecipes(h);
  assert.equal(h.trial.state.compact, false, "detailed recipe view remains the initial default");
  const resourcesBefore = clone(h.recipeState.resources);
  h.trial.toggleFavorite("test-bread"); h.trial.toggleFavorite("unknown");
  h.trial.state.favoritesOnly = true; vm.runInContext("recipeBookRender()", h.context);
  assert.deepEqual(clone(h.recipeState.filtered.map(recipe => recipe.id)), ["test-bread"], "favorite filtering precedes pagination in the production render");
  h.trial.setCompact(true); assert.equal(h.store.get("uiRecipeCompact"), true);
  const reopened = harness(h.store); installRecipes(reopened);
  assert.equal(reopened.trial.state.compact, true); assert.deepEqual([...reopened.trial.state.favorites], ["test-bread"]);
  h.ui.search = {value:"grain"}; h.recipeState.mode = "ingredient"; h.trial.rememberSearch();
  h.ui.search.value = "GRAIN"; h.trial.rememberSearch();
  assert.equal(h.trial.state.recentSearches.length, 1, "recent searches deduplicate case-insensitively");
  const searches = harness(h.store).trial.state.recentSearches;
  assert.equal(searches[0].mode, "ingredient"); assert.equal(searches[0].query, "GRAIN");
  h.refresh(false); assert.equal(h.recipeState.filtered.length, 2, "master OFF restores unfiltered original catalog");
  assert.deepEqual(h.recipeState.resources, resourcesBefore, "browsing and presentation controls never write inventory");
  assert.equal(h.store.has("recipeBookResources"), false);
}
{
  const h = harness(); installRecipes(h);
  const focus = new FakeElement(h.document); h.document.activeElement = focus;
  h.recipeEvent("test-bread");
  const drawer = h.trial.state.drawer;
  assert.equal(drawer.open, true, "global recipe search opens the detail modal");
  assert.equal(drawer.querySelector("#bshRecipeDrawerTitle").textContent, "Test Bread <safe>");
  const markup = drawer.querySelector(".bshRecipeDrawerBody").innerHTML;
  assert.ok(markup.includes("Test Bread &lt;safe&gt;"), "detail markup escapes recipe names");
  assert.ok(markup.includes("data-craft-plan-number"), "available resource planning remains accessible in the drawer");
  assert.ok(markup.includes('data-max-crafts="10"'), "drawer uses the existing exact recipe calculation");
  assert.ok(markup.includes("Test Grain") && markup.includes("Test Salt"), "all ingredients appear");
  assert.equal(h.store.has("recipeBookCraftPlans"), false, "opening a recipe never saves a craft plan");
  const planner = new FakeElement(h.document), row = new FakeElement(h.document), resources = clone(h.recipeState.resources);
  planner.dataset = {maxCrafts:"10", craftAmount:"1", recipeId:"test-bread"};
  row.dataset = {perCraft:"5", owned:"50"};
  planner.closest = () => ({querySelectorAll: () => [row]});
  const control = {value:"3", closest: selector => selector === "[data-craft-plan]" ? planner : control};
  drawer.listeners.get("input")({target:control});
  assert.equal(h.recipeState.craftPlans["test-bread"], 3);
  assert.equal(row.querySelector("[data-craft-used]").textContent, "15 used");
  assert.equal(row.querySelector("[data-craft-remaining]").textContent, "35 left");
  assert.equal(h.store.has("recipeBookCraftPlans"), false, "live planner previews are not committed until change");
  drawer.listeners.get("change")({target:control});
  assert.equal(h.store.get("recipeBookCraftPlans")["test-bread"], 3, "drawer delegates to the existing persisted planner on user change");
  assert.deepEqual(h.recipeState.resources, resources, "planning does not consume inventory");
  h.context.BshWeekliesRecipes.closeDrawer(); assert.equal(drawer.open, false); assert.equal(h.document.activeElement, focus);
  h.context.BshWeekliesRecipes.openRecipe("test-bread"); h.refresh(false);
  assert.equal(drawer.open, false, "disabling the trial must close the modal immediately");
  assert.equal(h.context.BshWeekliesRecipes.openRecipe("test-bread"), false);
}
{
  const h = harness();
  assert.equal(h.trial.uiRecentRecipeSearches(Array.from({length:20},(_,index)=>({query:`query ${index}`}))).length, 6);
  assert.deepEqual(clone(h.trial.uiRecipeIds([null,"a","a",1,"", "b"])), ["a","b"]);
}
assert.ok(enhancement.includes('dialog.addEventListener("cancel"'), "native dialog Escape handling is present");
assert.ok(enhancement.includes("drawer.showModal()"), "modal background and focus behavior use the platform primitive");
assert.ok(css.includes("prefers-reduced-motion:reduce"));
assert.ok(!css.includes("--weekly-task-accent:"), "UI trial must not replace unique quest title colors");
assert.ok(css.split(/\r?\n/).filter(line=>line.trim()&&!line.trim().startsWith("/*")).every(line=>line.includes('body[data-ui-refresh="on"]')), "every style is scoped to the reversible trial");
console.log("Weeklies/Recipes UI tests passed: reset-safe Undo, later-change protection, route sorting, favorite persistence/filtering, compact opt-in, search history, accessible detail rendering and master-OFF restoration. No user data or network used.");
