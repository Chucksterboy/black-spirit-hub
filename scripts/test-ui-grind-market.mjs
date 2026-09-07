import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const root = path.resolve(process.argv[2] || path.join(import.meta.dirname, "..", "Source Code"));
const source = fs.readFileSync(path.join(root, "Assets", "UiRefresh", "grind-market.js"), "utf8");
const main = fs.readFileSync(path.join(root, "BlackSpiritHub.Resources.Black_Spirit_Hub.js"), "utf8");
const css = fs.readFileSync(path.join(root, "Assets", "UiRefresh", "grind-market.css"), "utf8");
const pure = vm.createContext({ window: {} });
vm.runInContext(source, pure);
const core = pure.window.BshGrindMarketCore;
const plain = value => JSON.parse(JSON.stringify(value));
const spots = [
  {id:1, name:"Ash Forest", zone:"Kamasylvia", ap:300, dp:400, players:"1", drops:[{id:"11", name:"Deboreka Necklace", icon:"item.png"}]},
  {id:2, name:"Olun’s Valley", zone:"Odyllita", ap:310, dp:410, players:"3", drops:[{id:"12", name:"Golem Heart"}]},
  {id:3, name:"Elvia Café", zone:"Serendia", ap:270, dp:360, players:"1", drops:[{id:"13", name:"Black Stone"}]},
  {id:4, name:"Unverified requirements", zone:"Unknown", players:"1", drops:[]}
];
assert.deepEqual(plain(core.cleanIds([1,"1",2,"bad"], new Set(["1","2"]), 1)), ["1"]);
assert.deepEqual(plain(core.matchingSpots(spots, {query:"deboreka necklace"})).map(x => x.id), [1], "search includes the full drop pool");
assert.deepEqual(plain(core.matchingSpots(spots, {query:"cafe"})).map(x => x.id), [3], "accent-insensitive search");
assert.deepEqual(plain(core.matchingSpots(spots, {region:"Odyllita", players:"group"})).map(x => x.id), [2]);
assert.deepEqual(plain(core.matchingSpots(spots, {list:"favorites", favorites:["3"]})).map(x => x.id), [3]);
assert.deepEqual(plain(core.matchingSpots(spots, {list:"recent", recent:["3","1"]})).map(x => x.id), [3,1]);
assert.deepEqual(plain(core.matchingSpots(spots, {withinGear:true, ap:300, dp:400})).map(x => x.id), [1,3]);
assert.equal(core.matchingSpots(spots, {withinGear:true, ap:300, dp:""}).length, 0, "missing gear must not invent a filter threshold");
assert.equal(core.matchingSpots(spots, {list:"favorites", favorites:[]}).length, 0);
assert.equal(core.priceInfo({}, {price:123456, source:"fixed-vendor"}).fixed, true);
assert.match(core.priceInfo({}, {price:100, source:"reference-fallback"}).source, /not a live/);
assert.match(core.priceInfo({}, {price:100, source:"arsha-sublist-cache"}).source, /cached/);
assert.equal(core.priceInfo({}, {price:100, source:"market", capturedUtc:"bad"}).capturedUtc, null);
assert.equal(core.priceInfo({}, {price:100}, false, true).amount, "Not listed on Central Market");
assert.equal(core.priceInfo({}, {price:100}, true).amount, "No market value available");
assert.match(core.priceInfo({}, {price:123456, source:"market"}).amount, /123.456 silver/);
const points = core.chartPoints([{time:"2026-09-02",value:2},{time:"bad",value:4},{time:"2026-09-01",value:1},{time:"2026-09-03",value:NaN}]);
assert.equal(points.length, 2);
assert.equal(points[0].value, 1);
assert.equal(core.nearestPoint(points, Date.parse("2026-09-02")).value, 2);
assert.equal(core.nearestPoint([], 0), null);
assert.notEqual(core.chartMessage("error", 0), core.chartMessage("ready", 0));
assert.match(core.chartMessage("ready", 0, true), /two snapshots/);
assert.match(core.chartMessage("ready", 1), /One sample/);
assert.equal(core.chartMessage("ready", 2), "");

// A deliberately small DOM boundary, not a browser or screenshot test. The
// real production module executes; only layout/canvas drawing are stubbed.
const noop = () => {};
const decode = value => value.replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">");
let document;
class Element {
  constructor(tag = "div") {
    this.tagName = tag.toUpperCase(); this.children = []; this.attributes = {}; this.dataset = {}; this.listeners = new Map();
    this.hidden = false; this.disabled = false; this.value = ""; this.parentElement = null; this._text = "";
    this.style = {removeProperty(name) {delete this[name];}};
    this.classList = {toggle:(name, on) => {const names = new Set(this.className.split(" ").filter(Boolean)); on ? names.add(name) : names.delete(name); this.className = [...names].join(" ");}};
  }
  get className() { return this.attributes.class || ""; }
  set className(value) { this.attributes.class = value; }
  get id() { return this.attributes.id || ""; }
  set id(value) { this.attributes.id = value; }
  get isConnected() { return this === document.body || Boolean(this.parentElement?.isConnected); }
  get textContent() { return this._text + this.children.map(x => x.textContent).join(""); }
  set textContent(value) { this.replaceChildren(); this._text = String(value); }
  get innerHTML() { return this._html || ""; }
  set innerHTML(value) {
    this._html = value; this.replaceChildren();
    const stack = [this], tokens = value.match(/<\/?[\w-]+\b[^>]*>|[^<]+/g) || [];
    for(const token of tokens) {
      if(token.startsWith("</")) { stack.pop(); continue; }
      if(token.startsWith("<")) {
        const tag = /^<([\w-]+)/.exec(token)[1], child = new Element(tag);
        const attrs = token.slice(tag.length + 1, -1);
        for(const match of attrs.matchAll(/([\w-]+)(?:="([^"]*)"|='([^']*)')?/g)) child.setAttribute(match[1], decode(match[2] ?? match[3] ?? ""));
        stack.at(-1).append(child);
        if(!["input","img","br","hr"].includes(tag)) stack.push(child);
      } else stack.at(-1)._text += decode(token);
    }
  }
  setAttribute(name, value) {
    this.attributes[name] = String(value);
    if(name.startsWith("data-")) this.dataset[name.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = String(value);
    if(name === "value") this.value = String(value);
  }
  getAttribute(name) { return this.attributes[name] ?? null; }
  removeAttribute(name) { delete this.attributes[name]; }
  append(...values) { for(const node of values) { node.remove(); node.parentElement = this; this.children.push(node); } }
  prepend(node) { node.remove(); node.parentElement = this; this.children.unshift(node); }
  replaceChildren(...values) { for(const child of this.children) child.parentElement = null; this.children = []; this._text = ""; this.append(...values); }
  remove() { if(this.parentElement) {this.parentElement.children = this.parentElement.children.filter(x => x !== this); this.parentElement = null;} }
  replaceWith(node) { const parent = this.parentElement, index = parent.children.indexOf(this); node.remove(); parent.children[index] = node; node.parentElement = parent; this.parentElement = null; }
  insertAdjacentElement(where, node) {
    const parent = this.parentElement, index = parent.children.indexOf(this); node.remove(); node.parentElement = parent;
    parent.children.splice(index + (where === "afterend" ? 1 : 0), 0, node);
  }
  matches(selector) {
    if(selector.startsWith("#")) return this.id === selector.slice(1);
    if(selector.startsWith(".")) return this.className.split(" ").includes(selector.slice(1));
    if(selector.startsWith("[")) { const match = /^\[([^=\]]+)(?:="([^"]*)")?\]$/.exec(selector); return Boolean(match && this.attributes[match[1]] !== undefined && (match[2] === undefined || this.attributes[match[1]] === match[2])); }
    return this.tagName.toLowerCase() === selector;
  }
  querySelectorAll(selector) {
    if(selector.includes(",")) return [...new Set(selector.split(",").flatMap(part => this.querySelectorAll(part)))];
    const parts = selector.trim().split(/\s+/);
    if(parts.length > 1) return this.querySelectorAll(parts[0]).flatMap(element => element.querySelectorAll(parts.slice(1).join(" ")));
    return this.children.flatMap(child => [...(child.matches(selector) ? [child] : []), ...child.querySelectorAll(selector)]);
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  closest(selector) { return this.matches(selector) ? this : this.parentElement?.closest(selector) || null; }
  addEventListener(type, listener) { if(!this.listeners.has(type)) this.listeners.set(type, []); this.listeners.get(type).push(listener); }
  fire(type, extra = {}) { const event = {target:this,currentTarget:this,preventDefault:noop,stopPropagation:noop,...extra}; for(const listener of this.listeners.get(type) || []) listener(event); }
  focus() { document.activeElement = this; }
  click() { this.fire("click"); }
  showModal() { this.open = true; }
  close() { this.open = false; this.fire("close"); }
  getBoundingClientRect() { return {left:0,top:0,right:600,bottom:300,width:600,height:300}; }
  getContext() { return {scale:noop,clearRect:noop,beginPath:noop,moveTo:noop,lineTo:noop,stroke:noop,fill:noop,arc:noop,setLineDash:noop,fillText:noop,measureText:text => ({width:String(text).length * 7})}; }
}
document = {
  body:new Element("body"), activeElement:null, listeners:new Map(),
  createElement:tag => new Element(tag), createComment:() => new Element("comment"),
  getElementById(id) {return this.body.querySelector("#" + id);},
  querySelector(selector) {return this.body.querySelector(selector);},
  querySelectorAll(selector) {return this.body.querySelectorAll(selector);},
  addEventListener(type, listener) {if(!this.listeners.has(type)) this.listeners.set(type,[]); this.listeners.get(type).push(listener);},
  fire(type) {for(const listener of this.listeners.get(type) || []) listener({detail:{enabled:this.body.dataset.uiRefresh === "on"}});}
};
document.body.dataset.uiRefresh = "off";
document.body.innerHTML = '<div id="grindTrackerView"><button id="grindChangeZone">Choose zone</button><div id="grindSpotDetail"></div><div id="grindSpotPicker"><input id="grindSpotPickerSearch"><span id="grindPowerHeader"></span><div id="grindSpotPickerList"></div></div></div><div class="marketPane"><div id="marketDetail"><div id="detailName">Sample item</div><div class="graphGrid"><div class="graphPanel"><canvas id="priceChart"></canvas><div class="graphTooltip"></div></div><div class="graphPanel"><canvas id="salesChart"></canvas><div class="graphTooltip"></div></div></div></div></div>';
const storage = new Map(), bridgeCalls = [], chartStatus = [];
const context = vm.createContext({ window:{devicePixelRatio:1,innerHeight:900}, document, console, GRIND_SPOTS:spots,
  readSetting:(key,fallback) => storage.get(key) ?? fallback, persistSetting:(key,value) => storage.set(key,plain(value)),
  escapeHtml:value => String(value).replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;"),
  grindState:{initialized:false,selectedSpotId:"1",powerMode:"recommended",pickerSearch:""},
  grindEl:{spotDetail:document.getElementById("grindSpotDetail")},
  marketState:{analytics:null,items:[]}, marketEl:{range:{value:"30",innerHTML:'<option value="30">30 days</option>'}},
  grindRenderSpotPicker:() => {document.getElementById("grindSpotPickerList").innerHTML = "<button>Legacy picker</button>";},
  grindSelectSpot:id => {context.grindState.selectedSpotId = String(id);},
  grindRenderSpotDetail:() => {context.grindEl.spotDetail.innerHTML = '<div class="grindSpotTop"></div><div class="grindLootCard"></div>';},
  grindSpotById:id => spots.find(spot => String(spot.id) === String(id)),
  grindTrashDrop:spot => spot.drops[0], grindMonsterMeta:() => ({icon:"monster.png",label:"Normal",type:"normal"}),
  grindSpotCcs:() => [], grindPowerForSpot:() => ({label:"Recommended"}), grindPowerText:spot => `${spot.ap} AP | ${spot.dp} DP`,
  grindEmpty:message => `<div>${message}</div>`, grindPriceRecordForDrop:() => ({price:100,source:"arsha-sublist-cache",capturedUtc:"2026-09-01",region:"eu"}),
  grindDropHasNoValue:() => false, grindDropIsUnmarketable:() => false, grindDropMarketId:drop => drop.id,
  enhancedName:item => item.name, renderTrackedItems:noop, selectTrackedItem:noop, setMarketStatus:noop,
  initializeMarket:async () => {}, loadAnalytics:noop, activateAppView:noop,
  bridgeCall:async (command, payload) => {bridgeCalls.push({command,payload}); return [{itemId:11,enhancement:0,name:"Deboreka Necklace"}];},
  renderAnalytics:noop,
  requestAnimationFrame:callback => callback(),
  getComputedStyle:() => ({getPropertyValue:name => name === "--ui-caption-size" ? "14px" : "#abcdef"})
});
context.grindRender = () => {context.grindRenderSpotDetail();context.grindRenderSpotPicker();};
vm.runInContext(source, context);
const api = context.window.BshGrindMarket;
document.body.dataset.uiRefresh = "on";
context.grindState.initialized = true;
document.fire("bsh:ui-refresh");
assert.ok(document.getElementById("gmBrowseControls"));
assert.equal(document.querySelectorAll("[data-gm-favorite]").length, 4);
const list = document.getElementById("grindSpotPickerList");
const star = document.querySelector('[data-gm-favorite="1"]');
list.fire("click", {target:star});
assert.deepEqual(storage.get("uiRefreshGrindFavorites"), ["1"]);
context.grindSelectSpot("3");
context.grindSelectSpot("1");
assert.deepEqual(storage.get("uiRefreshGrindRecent"), ["1","3"]);
context.grindState.pickerSearch = "deboreka";
context.grindRenderSpotPicker();
assert.equal(list.querySelectorAll(".grindPickerRow").length, 1);
context.grindState.pickerSearch = "";

context.grindRenderSpotDetail();
const card = document.querySelector(".grindLootCard");
assert.equal(card.getAttribute("role"), "button");
card.focus();
card.click();
const drawer = document.querySelector(".gmItemDrawer");
assert.equal(drawer.open, true);
assert.match(drawer.textContent, /Arsha cached Central Market/);
assert.match(drawer.textContent, /100 silver/);
assert.equal(bridgeCalls.length, 0, "inspecting an item must not make a remote call or track anything");
drawer.querySelector(".gmTrackButton").click();
for(let i=0;i<8;i++) await Promise.resolve();
assert.equal(bridgeCalls[0].command, "getVariants");
assert.equal(bridgeCalls.length, 1, "variants must not be tracked without the explicit confirmation");
drawer.querySelector(".gmClose").click();
assert.equal(document.activeElement, card, "closing returns keyboard focus to the originating item");

const price = document.getElementById("priceChart"), sales = document.getElementById("salesChart");
assert.equal(api.drawChart(price, [{time:"2026-09-01",value:100},{time:"2026-09-02",value:120}], String), true);
api.drawChart(sales, [{time:"2026-09-02",value:20}], String);
price.onkeydown({key:"End",preventDefault:noop});
assert.match(price.getAttribute("aria-label"), /120/);
assert.match(sales.getAttribute("aria-label"), /20/);
price.onmouseleave();
assert.equal(price.parentElement.querySelector(".graphTooltip").style.display, "none");
api.setAnalyticsState("error", "Simulated connection failure");
assert.match(document.getElementById("gmAnalyticsStatus").textContent, /Simulated connection failure/);
assert.ok(document.getElementById("gmAnalyticsStatus").querySelector("button"));
api.setAnalyticsState("ready");
assert.equal(document.getElementById("gmAnalyticsStatus").hidden, true);
document.getElementById("gmExpandCharts").click();
const expanded = document.querySelector(".gmExpandedCharts");
assert.equal(expanded.open, true);
assert.equal(expanded.querySelectorAll("canvas").length, 2);
expanded.querySelector(".gmClose").click();
assert.equal(document.getElementById("marketDetail").querySelectorAll("canvas").length, 2, "close restores the original chart nodes");

document.body.dataset.uiRefresh = "off";
document.fire("bsh:ui-refresh");
assert.equal(document.getElementById("gmBrowseControls"), null);
assert.equal(document.getElementById("gmExpandCharts"), null);
assert.equal(document.querySelector(".grindLootCard").getAttribute("role"), null);
assert.equal(api.drawChart(price, [], String), false, "off mode delegates back to the unchanged legacy chart");
document.body.dataset.uiRefresh = "on";
document.fire("bsh:ui-refresh");
assert.equal(list.listeners.get("click").length, 1, "repeated off/on must not duplicate favourites handlers");
assert.deepEqual(storage.get("uiRefreshGrindFavorites"), ["1"]);

// Production asynchronous chart selection: late responses must not overwrite
// the chart the user selected more recently, and real failures get a Retry state.
const begin = main.indexOf("async function loadAnalytics()"), end = main.indexOf("function renderAnalytics()", begin);
const deferred = [], states = [], analyticsState = {selected:{itemId:1,enhancement:0}};
const asyncContext = vm.createContext({marketState:analyticsState,marketEl:{range:{value:"30"}},getMarketRegion:() => "eu",
  BshGrindMarket:{setAnalyticsState:(...args) => states.push(args)},setMarketStatus:noop,renderAnalytics:noop,
  bridgeCall:() => new Promise((resolve,reject) => deferred.push({resolve,reject}))});
vm.runInContext(main.slice(begin,end), asyncContext);
const first = vm.runInContext("loadAnalytics()", asyncContext);
analyticsState.selected = {itemId:2,enhancement:0};
const second = vm.runInContext("loadAnalytics()", asyncContext);
deferred[1].resolve({item:{itemId:2},currentPrice:22});
await second;
deferred[0].resolve({item:{itemId:1},currentPrice:11});
await first;
assert.equal(analyticsState.analytics.currentPrice, 22);
const failure = vm.runInContext("loadAnalytics()", asyncContext);
deferred[2].reject(new Error("Test failure"));
await failure;
assert.deepEqual(states.at(-1), ["error","Test failure"]);
assert.match(css, /body\[data-ui-refresh="on"\]\[data-motion="reduced"\]/);
assert.match(source, /showModal\(\)/, "drawer and expanded charts use native modal focus containment");
console.log("UI grind/market tests passed: drop search, filters, favourites/recents, item inspection, explicit tracking confirmation, linked charts, error states, async races, and reversible presentation. No network, user storage, or visual QA.");
