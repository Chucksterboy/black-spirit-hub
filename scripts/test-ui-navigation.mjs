import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

// Production navigation functions run against memory-only boundaries. No
// desktop automation, external requests, installation, or user-profile writes.
const root = path.resolve(process.argv[2] || path.join(import.meta.dirname, "..", "Source Code"));
const source = fs.readFileSync(path.join(root, "Assets", "UiRefresh", "navigation.js"), "utf8");
const css = fs.readFileSync(path.join(root, "Assets", "UiRefresh", "navigation.css"), "utf8");
const html = fs.readFileSync(path.join(root, "BlackSpiritHub.Resources.Black_Spirit_Hub.html"), "utf8");
const context = vm.createContext({console});
vm.runInContext(source, context, {filename:"navigation.js"});
const core = context.BshNavigationRefresh;
const clone = value => JSON.parse(JSON.stringify(value));
const tools = [...html.matchAll(/class="navButton[^\"]*" data-app-view="([^"]+)"[\s\S]*?<span class="navLabel">([^<]+)<\/span>/g)].map(match => ({id:match[1], name:match[2].replaceAll("&amp;", "&")}));
assert.equal(tools.length, 16, "All sixteen navigation tiles must remain discoverable");
assert.equal(tools.some(tool => tool.id === "settingsView"), false, "Settings must remain in the title bar, not reappear as a tile");

const defaults = clone(core.normalizePreferences(null, tools));
assert.deepEqual(defaults, {order:tools.map(tool => tool.id), favorites:[], favoritesOnly:false});
for (const invalid of ["bad", true, 42, [], {order:"homeView", favorites:null, favoritesOnly:true}]) {
  assert.deepEqual(clone(core.normalizePreferences(invalid, tools)), defaults);
}
const saved = {order:["weekliesView", "unknown", "weekliesView", 17], favorites:["weekliesView", "unknown", "weekliesView"], favoritesOnly:true};
const normalized = clone(core.normalizePreferences(saved, tools));
assert.equal(normalized.order[0], "weekliesView");
assert.equal(normalized.order.length, 16);
assert.equal(new Set(normalized.order).size, 16);
assert.deepEqual(normalized.favorites, ["weekliesView"]);
assert.equal(normalized.favoritesOnly, true);
assert.equal(core.normalizePreferences({favorites:[], favoritesOnly:true}, tools).favoritesOnly, false, "Empty favorites cannot hide every tool");
assert.deepEqual(clone(core.normalizePreferences(normalized, [...tools, {id:"futureToolView", name:"Future tool"}])).order.slice(-1), ["futureToolView"], "New tools must survive old saved preferences");
const moved = clone(core.moveTool(defaults.order, "weekliesView", -1));
assert.equal(moved.indexOf("weekliesView"), defaults.order.indexOf("weekliesView") - 1);
assert.deepEqual(defaults.order, tools.map(tool => tool.id), "Moving a draft cannot mutate live preferences");
assert.deepEqual(clone(core.moveTool(defaults.order, defaults.order[0], -1)), defaults.order);
assert.deepEqual(clone(core.moveTool(defaults.order, "missing", 1)), defaults.order);

const recipeData = {
  items:{100:{id:100, name:"Balenos Meal"}, 101:{id:101, name:"Délotia Pudding"}},
  recipes:[{id:"meal-cooking", outputId:100, type:"COOK", station:"Cooking"}, {id:"meal-workshop", outputId:100, type:"HOUSE", station:"Workshop"}, {id:"delotia", outputId:101, type:"COOK", station:"Cooking"}]
};
const zones = [{id:78, name:"Zephyros Castle", zone:"Edania", primaryTrash:"Hardened Lava Chunk"}, {id:80, name:"Aphrodon Temple", zone:"Inner Edania"}];
const index = core.buildIndex([...tools, {id:"settingsView", name:"Settings", aliases:"volume startup text size"}], zones, recipeData);
assert.equal(index.length, 22);
assert.equal(core.searchEntries(index, "").length, 17, "Empty search shows tools, including title-bar Settings");
assert.equal(core.searchEntries(index, "volume")[0].id, "settingsView");
assert.equal(core.searchEntries(index, "zeph castle")[0].id, "78");
assert.equal(core.searchEntries(index, "hardened lava")[0].id, "78");
assert.equal(core.searchEntries(index, "inner edania")[0].id, "80");
assert.equal(core.searchEntries(index, "delotia")[0].id, "delotia", "Accented names match plain keyboard input");
assert.deepEqual(clone(core.searchEntries(index, "balenos")).map(item => item.id).sort(), ["meal-cooking", "meal-workshop"], "Recipes with the same output retain distinct stable identities");
assert.equal(core.searchEntries(index, "balenos workshop")[0].id, "meal-workshop");
assert.equal(core.searchEntries(index, "delotia cooking")[0].kind, "recipe");
assert.equal(core.searchEntries(index, "does-not-exist").length, 0);
assert.equal(core.searchEntries(index, "balenos", 1).length, 1);
const huge = Array.from({length:12000}, (_, i) => ({kind:"recipe", id:String(i), name:`Meal ${i}`, detail:"Cooking", search:`meal ${i}`}));
assert.equal(core.searchEntries(huge, "meal").length, 24, "Large catalogs must never create an unbounded result DOM");

const routes = [], host = {
  activate:async id => {routes.push(["activate", id]); return true;},
  selectZone:async id => routes.push(["zone", id]),
  selectRecipe:async id => routes.push(["recipe", id])
};
for (const query of ["settings", "zephyros", "balenos workshop"]) await core.navigateToEntry(core.searchEntries(index, query)[0], host);
assert.deepEqual(routes, [["activate", "settingsView"], ["activate", "grindTrackerView"], ["zone", "78"], ["activate", "recipeBookView"], ["recipe", "meal-workshop"]]);
routes.length = 0;
assert.equal(await core.navigateToEntry({kind:"recipe", view:"recipeBookView", id:"meal-cooking"}, {...host, activate:async () => false}), false);
assert.deepEqual(routes, [], "Failed tab activation must not mutate another tool's selection");
assert.equal(await core.navigateToEntry({kind:"unknown"}, host), false);

// Legacy overlays use div/section role=dialog, not <dialog>. Opening Ctrl+K over
// them would let their document Escape/Tab handler intercept palette keys.
const modal = (options = {}) => ({hidden:false, getClientRects:() => [{}], closest:() => null, ...options});
const nativeModal = modal(), weeklyModal = modal(), grindModal = modal(), ocrModal = modal();
const ownSearch = modal(), ownCustomize = modal();
const modalRoot = candidates => ({querySelectorAll(selector) {
  assert.ok(selector.includes('dialog[open]') && selector.includes('[role="dialog"]') && selector.includes('[aria-modal="true"]'));
  return candidates;
}});
for (const active of [nativeModal, weeklyModal, grindModal, ocrModal]) {
  assert.equal(core.hasBlockingModal(modalRoot([active]), [ownSearch, ownCustomize]), true, "Every visible legacy or native modal must block search");
}
assert.equal(core.hasBlockingModal(modalRoot([ownSearch, ownCustomize]), [ownSearch, ownCustomize]), false, "Own popups may switch to each other");
assert.equal(core.hasBlockingModal(modalRoot([modal({hidden:true}), modal({closest:() => ({hidden:true})}), modal({getClientRects:() => []})])), false, "Closed overlays must not disable global search");
for (const style of [{display:"none", visibility:"visible"}, {display:"block", visibility:"hidden"}, {display:"block", visibility:"collapse"}]) {
  assert.equal(core.hasBlockingModal(modalRoot([modal()]), [], () => style), false);
}
assert.equal(core.hasBlockingModal(modalRoot([modal()]), [], () => ({display:"block", visibility:"visible"})), true);
const openSearchSource = source.slice(source.indexOf("    function openSearch()"), source.indexOf("    const host = {"));
assert.ok(openSearchSource.indexOf("hasBlockingModal") < openSearchSource.indexOf("openDialog(commandDialog"), "Modal guard must run before native focus/inert changes");

// Exercise the actual application's route adapter as well as the pure dispatch.
const hostStart = source.indexOf("    const host = {"), hostEnd = source.indexOf("    async function chooseResult", hostStart);
assert.ok(hostStart >= 0 && hostEnd > hostStart);
const element = () => ({value:"", checked:false, focused:false, focus(){this.focused=true}});
const recipeBookEl = {type:element(), search:element()}, modeInputs = [{value:"name"}, {value:"ingredient", checked:true}];
const recipeBookState = {data:recipeData, mode:"ingredient", type:"OLD", page:7, filtered:[]};
const target = {classList:{contains:() => true}}, events = [], selectedZones = [];
const adapterContext = vm.createContext({
  console, recipeBookEl, recipeBookState, GRIND_SPOTS:zones, RECIPE_BOOK_PAGE_SIZE:12,
  document:{getElementById:() => target, querySelector:() => ({dataset:{appView:"recipeBookView"}}), querySelectorAll:() => modeInputs},
  activateAppView(){}, performance:{now:() => 0}, setTimeout(){},
  grindSelectSpot:id => selectedZones.push(id),
  recipeBookSetSection:section => events.push(["section", section]),
  recipeBookSetMode:mode => events.push(["mode", mode]),
  recipeBookApplySearch(){recipeBookState.filtered = recipeData.recipes.filter(recipe => recipe.type === recipeBookState.type && recipeData.items[recipe.outputId].name === recipeBookEl.search.value);},
  recipeBookRender:() => events.push(["render", recipeBookState.page]),
  CustomEvent:class {constructor(type, options){this.type=type;this.detail=options.detail}},
  window:{dispatchEvent:event => events.push([event.type, event.detail.recipeId])}
});
vm.runInContext(source.slice(hostStart, hostEnd) + "\nglobalThis.productionHost = host;", adapterContext);
await adapterContext.productionHost.selectRecipe("meal-workshop");
assert.equal(recipeBookState.mode, "name");
assert.equal(recipeBookState.type, "HOUSE");
assert.equal(recipeBookEl.type.value, "HOUSE");
assert.equal(recipeBookEl.search.value, "Balenos Meal");
assert.equal(recipeBookState.page, 1);
assert.equal(modeInputs[0].checked, true);
assert.equal(modeInputs[1].checked, false);
assert.equal(recipeBookEl.search.focused, true);
assert.deepEqual(events.at(-1), ["bsh:recipe-open", "meal-workshop"], "Exact recipe identity must reach the detail drawer");
await assert.rejects(adapterContext.productionHost.selectRecipe("removed-recipe"), /not available/);
await adapterContext.productionHost.selectZone("78");
assert.deepEqual(selectedZones, ["78"]);
await assert.rejects(adapterContext.productionHost.selectZone("removed-zone"), /no longer available/);

// The shipped catalog must index without changing data, relying on output IDs,
// not guessing identities from names shared by many crafting methods.
const shippedData = JSON.parse(fs.readFileSync(path.join(root, "Assets", "RecipeBook", "recipes.json"), "utf8"));
const shippedIndex = core.buildIndex(tools, [], shippedData);
assert.equal(shippedIndex.filter(entry => entry.kind === "recipe").length, shippedData.recipes.length);
for (const entry of shippedIndex.filter(item => item.kind === "recipe").slice(0, 20)) {
  assert.ok(shippedData.recipes.some(recipe => String(recipe.id) === entry.id));
}
assert.ok(source.includes('document.addEventListener("bsh:ui-refresh"'), "Global refresh toggle must restore original navigation");
assert.ok(source.includes('original.element.hidden = enabled ?'), "Original visibility is remembered for rollback");
assert.ok(source.includes('nav.appendChild(original.element)'), "Reordering must preserve existing click handlers, not replace tiles");
assert.ok(source.includes('localStorage.setItem(STORAGE_KEY'), "New preferences must use their own versioned storage key");
assert.ok(!source.includes("fetch("), "Search must not introduce a remote or duplicate data fetch");
assert.ok(source.includes('role="combobox"') && source.includes('aria-activedescendant') && source.includes('dialog.showModal()'));
assert.ok(source.includes('event.key !== "Tab"') && source.includes('dialog.addEventListener("cancel"'));
assert.ok(source.includes('searchTimer = 0; renderSearch()'), "Settled search must not erase arrow-key selection on Enter");
assert.ok(css.includes('body:not([data-ui-refresh="on"])') && css.includes('prefers-reduced-motion:reduce'));
assert.ok(css.includes('.navButton.bshNavFiltered[data-app-view] {display:none!important}'), "Favorites must beat existing unconditional grid display rules");
assert.ok(!source.includes("bshNavSearchTrigger"), "Search button must be removed from the navigation toolbar, including its event binding");
assert.ok(source.includes('toolbar.querySelector(".bshNavCustomizeTrigger").addEventListener'), "Customize must remain wired");
assert.ok(css.includes('.bshNavCustomizeTrigger {margin-left:auto!important}'), "Customize stays on the right after removing Search");
assert.ok(!/var\(--panel(?:2)?[,)]/.test(css), "Dialogs must not use the legacy white panel tokens");
assert.ok(css.includes('background:linear-gradient(var(--surface),var(--surface)),var(--bg0)!important'), "Themed modal surface needs an opaque theme underlay");
const commandFieldRule = css.match(/body\[data-ui-refresh="on"\]\[data-style\] \.bshNavDialog #bshCommandInput \{([^}]+)\}/)?.[1];
assert.ok(commandFieldRule, "Search input must outrank legacy theme artwork even while focused");
for (const declaration of ['background-image:none!important','clip-path:none!important','-webkit-mask:none!important']) assert.ok(commandFieldRule.includes(declaration));
const coreCss = fs.readFileSync(path.join(root, 'Assets/UiRefresh/core.css'), 'utf8');
assert.ok(coreCss.includes(':is(.bshNavDialog,.gmDialog,.bshRecipeDrawer)'), "Rectangular controls must also cover body-mounted dialogs");
console.log(`Navigation refresh: preference recovery, reordering, ${shippedData.recipes.length} recipe IDs, bounded search, exact routing, keyboard and rollback contracts passed.`);
