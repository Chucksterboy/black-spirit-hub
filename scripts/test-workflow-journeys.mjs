import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

// Nonvisual integration journeys: execute production functions, replace only
// their UI/network/storage boundaries. Never read or write a user's profile.
const root = path.resolve(process.argv[2] || path.join(import.meta.dirname, "..", "Source Code"));
const source = fs.readFileSync(path.join(root, "BlackSpiritHub.Resources.Black_Spirit_Hub.js"), "utf8");
const clone = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
const between = (start, end) => {
  const first = source.indexOf(start), last = source.indexOf(end, first + start.length);
  assert.ok(first >= 0 && last > first, `Missing production source boundary: ${start}`);
  return source.slice(first, last);
};
const line = prefix => {
  const result = source.split(/\r?\n/).find(value => value.trimStart().startsWith(prefix));
  assert.ok(result, `Missing production statement: ${prefix}`);
  return result;
};
const noop = () => {};
const element = () => ({hidden:false, value:"", textContent:"", dataset:{}, style:{},
  listeners:new Map(), classList:{add:noop, remove:noop, toggle:noop},
  addEventListener(type, callback) { this.listeners.set(type, callback); },
  setAttribute:noop, removeAttribute:noop, focus:noop, select:noop, querySelector:() => null});
const settle = async () => { for (let i=0; i<8; i++) await Promise.resolve(); };

// Select a chart, refresh all market data, keep the selected ID/enhancement and
// display fresh analytics. A removed identity must close it, not select a peer.
{
  const item = {itemId:11653, enhancement:0, name:"Deboreka Necklace"};
  const other = {...item, enhancement:1};
  let regionItems = [item, other], rejectRegion = false, pendingRegion = null;
  const calls = [], statuses = [];
  const marketState = {items:[], outfits:null, selected:null, analytics:null, outfitRequestNumber:0};
  const marketEl = {empty:element(), detail:element(), range:{value:"30"}};
  const context = vm.createContext({marketState, marketEl, console,
    getMarketRegion:() => "eu", renderTrackedItems:noop, renderOutfitReport:noop,
    setMarketStatus:(message, error) => statuses.push({message, error}),
    outfitSalesStatusMessage:() => "Ready",
    renderAnalytics:() => {marketEl.detail.hidden=false; marketEl.empty.hidden=true;},
    async bridgeCall(command, payload) {
      calls.push({command, payload:clone(payload)});
      if(command === "getRegionState") {
        if(rejectRegion) throw new Error("Test connection unavailable");
        if(pendingRegion) return pendingRegion;
        return {items:clone(regionItems), outfits:{sampleCount:8}};
      }
      assert.equal(command,"getAnalytics");
      return {item:clone(payload), currentPrice:123456};
    }
  });
  vm.runInContext([
    between("async function refreshMarketState()", "const storedCouponKnownCodes="),
    between("function selectTrackedItem(item)", "function renderAnalytics()"),
    between("function clearMarketDetail()", 'marketEl.range.addEventListener("change"'),
    between("async function loadMarketRegionState(", "marketEl.regionButtons.forEach(button => {")
  ].join("\n"), context);
  context.item = clone(item);
  vm.runInContext("selectTrackedItem(item)", context);
  await settle();
  assert.equal(marketEl.detail.hidden, false, "selecting a tracked item must open its chart");
  regionItems = [{...item, name:"Updated tracked record"}, other];
  await vm.runInContext("refreshMarketState()", context);
  assert.equal(marketState.selected.itemId, item.itemId);
  assert.equal(marketState.selected.enhancement, 0);
  assert.equal(marketState.selected.name, "Updated tracked record");
  assert.equal(marketEl.detail.hidden, false, "refresh must not close the chart");
  assert.equal(calls.filter(call => call.command === "getAnalytics").length, 2, "refresh must reload the retained chart");
  assert.equal(marketState.analytics.currentPrice, 123456);

  // A different selection made during the request wins over an older selection.
  let resolveRegion;
  pendingRegion = new Promise(resolve => {resolveRegion = resolve;});
  const refreshing = vm.runInContext("refreshMarketState()", context);
  context.other = clone(other);
  vm.runInContext("selectTrackedItem(other)", context);
  resolveRegion({items:clone(regionItems), outfits:null});
  await refreshing;
  pendingRegion = null;
  assert.equal(marketState.selected.enhancement, 1, "a pending refresh must respect the user's newer selection");

  rejectRegion = true;
  await vm.runInContext("refreshMarketState()", context);
  assert.equal(marketState.selected.enhancement, 1, "failed refresh must retain last-good selection");
  assert.ok(statuses.some(status => status.error && /connection unavailable/.test(status.message)));
  assert.equal(statuses.at(-1).error,true,"failed refresh must not be overwritten by an unrelated Ready status");
  rejectRegion = false;
  regionItems = [item];
  await vm.runInContext("refreshMarketState()", context);
  assert.equal(marketState.selected, null, "the same item at another enhancement must not replace a removed selection");
  assert.equal(marketEl.detail.hidden, true);
}

// Resource form submit -> production persistence -> new runtime -> production
// catalog loader. The test owns both the timer queue and localStorage map.
{
  const storage = new Map();
  const fixture = {schemaVersion:1, source:{kind:"workflow-test"}, counts:{recipes:1, items:3},
    items:{"1":{name:"Test Recipe",grade:0,icon:"icons/item-fallback.svg"},"5":{name:"Test Ingredient",grade:0,icon:"icons/item-fallback.svg"},"3":{name:"Test Salt",grade:0,icon:"icons/item-fallback.svg"}},
    recipes:[{id:"journey-recipe",outputId:"1",type:"COOK",inputs:[{itemId:"5",count:5},{itemId:"3",count:1}]}]};
  function openRecipeBook() {
    const timers = new Map(); let timerId=0;
    const state={loading:false,data:null,resources:{},craftPlans:{},section:"resources"};
    const ui={resourceForm:element(),resourceQuantity:element(),resourceAdd:element()};
    const context=vm.createContext({console,recipeBookState:state,recipeBookEl:ui,window:{addEventListener:noop},
      localStorage:{getItem:key => storage.get(key) ?? null, setItem:(key,value) => storage.set(key,value)},
      setTimeout:callback => {timers.set(++timerId,callback); return timerId;},
      clearTimeout:id => timers.delete(id),
      fetch:async url => {assert.equal(url,"https://recipebook.bdo.local/recipes.json"); return {ok:true,json:async () => clone(fixture)};},
      recipeBookPopulateTypes:noop,recipeBookSetStatus:noop,recipeBookRender:noop,recipeBookRenderResources:noop,
      recipeBookSetSection:noop,recipeBookRenderResourceSelection:noop,recipeBookFormatCount:String,
      recipeBookCandidateName:candidate => candidate.name,
      recipeBookShowError:message => {throw new Error(message);},
      NotificationService:{ShowSuccess:noop,ShowWarning:noop}
    });
    vm.runInContext([
      'const settingNamespace="blackSpiritHub";',
      between("const settingMemory = new Map();", "const NotificationService="),
      between("/* RECIPE_BOOK_CORE_START */", "/* RECIPE_BOOK_CORE_END */"),
      line('const RECIPE_BOOK_RESOURCES_SETTING='), line('const RECIPE_BOOK_CRAFT_PLANS_SETTING='),
      line('function recipeBookPersistResources()'), line('function recipeBookPersistCraftPlans()'),
      between("async function recipeBookLoadData()", "function initializeRecipeBook()"),
      line('recipeBookEl.resourceForm?.addEventListener("submit"')
    ].join("\n"),context);
    return {state,ui,context,async load(){await vm.runInContext("recipeBookLoadData()",context);},
      flush(){for(const callback of [...timers.values()])callback(); timers.clear();}};
  }
  const first = openRecipeBook(); await first.load();
  first.state.selectedResourceKey="5:0"; first.ui.resourceQuantity.value="39000";
  first.ui.resourceForm.listeners.get("submit")({preventDefault:noop});
  first.state.craftPlans={"journey-recipe":25};
  vm.runInContext("recipeBookPersistCraftPlans()",first.context);
  first.flush();
  assert.ok(storage.size >= 2, "resources and craft plans must reach the persistence boundary");
  const reopened = openRecipeBook(); await reopened.load();
  assert.deepEqual(clone(reopened.state.resources),{"5:0":39000},"reopening must restore exact resource identity and quantity");
  assert.deepEqual(clone(reopened.state.craftPlans),{"journey-recipe":25});
  reopened.state.selectedResourceKey="5:0"; reopened.ui.resourceQuantity.value="2.5";
  reopened.ui.resourceForm.listeners.get("submit")({preventDefault:noop});
  reopened.flush();
  const third=openRecipeBook(); await third.load();
  assert.equal(third.state.resources["5:0"],39000,"invalid form input must not overwrite saved inventory");
}

// All done -> persisted state -> reopen -> Thursday and Sunday resets. This
// exercises the real independent reset policies, not a simulated shared reset.
{
  const store=new Map(), native={state:null};
  let clock=Date.parse("2026-09-09T23:59:59Z");
  class TestDate extends Date {constructor(...args){super(...(args.length?args:[clock]));} static now(){return clock;}}
  function openWeeklies() {
    const document={body:{dataset:{},classList:{add:noop,remove:noop}},getElementById:() => null,
      querySelector:() => null,addEventListener:noop};
    const context=vm.createContext({console,Date:TestDate,document,
      window:{matchMedia:() => ({matches:false})},requestAnimationFrame:noop,setTimeout,clearTimeout,
      readSetting:(key,fallback) => clone(store.has(key)?store.get(key):fallback),
      persistSetting:(key,value) => store.set(key,clone(value)),flushSetting:noop,escapeHtml:String,
      NotificationService:{ShowInfo:noop,ShowSuccess:noop},activateAppView:noop,
      async bridgeCall(command,payload){
        if(command==="initializeWeeklyPlanner")return {stateExists:Boolean(native.state),state:clone(native.state)};
        if(command==="saveWeeklyPlannerState"){native.state=clone(payload);return {state:clone(native.state)};}
        return {};
      }
    });
    vm.runInContext(between("/* WEEKLY_PLANNER_START */","/* WEEKLY_PLANNER_END */"),context);
    return {context,run:expression => vm.runInContext(expression,context)};
  }
  const first=openWeeklies();
  first.run('weeklySettings=normalizeWeeklyState({onboardingComplete:true,selectedIds:["pit-of-the-undying","black-shrine-donghae"]});');
  await first.run("hydrateWeeklyState()"); await first.run("weekliesRuntime.writeQueue");
  first.run("markAllWeekliesDone()"); await first.run("weekliesRuntime.writeQueue");
  assert.equal(first.run("weeklySelectedTasks().every(task=>weeklyTaskIsDone(task))"),true);
  const reopened=openWeeklies(); await reopened.run("hydrateWeeklyState()");
  assert.equal(reopened.run("weeklySelectedTasks().every(task=>weeklyTaskIsDone(task))"),true,"completion must survive reopening before reset");
  clock=Date.parse("2026-09-10T00:00:00Z");
  assert.equal(reopened.run('weeklyTaskIsDone(WEEKLY_CATALOG_BY_ID.get("pit-of-the-undying"))'),false,"Thursday task resets exactly at its boundary");
  assert.equal(reopened.run('weeklyTaskIsDone(WEEKLY_CATALOG_BY_ID.get("black-shrine-donghae"))'),true,"Sunday task must remain done on Thursday");
  clock=Date.parse("2026-09-13T00:00:00Z");
  const afterReset=openWeeklies(); await afterReset.run("hydrateWeeklyState()");
  assert.equal(afterReset.run("weeklySelectedTasks().every(task=>!weeklyTaskIsDone(task))"),true,"reopening after both resets needs no manual unchecking");
}

console.log("Workflow journeys passed: chart refresh; resource save/reopen; weekly completion/reset. No user storage or network was used.");
