import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const scriptPath = process.argv[2];
if (!scriptPath) throw new Error("Pass the Black Spirit Hub JavaScript path.");

const source = fs.readFileSync(scriptPath, "utf8");
const cssPath = scriptPath.replace(/\.js$/i, ".css");
const htmlPath = scriptPath.replace(/\.js$/i, ".html");
const css = fs.readFileSync(cssPath, "utf8");
const html = fs.readFileSync(htmlPath, "utf8");
const cssAssetVersion = html.match(/BlackSpiritHub\.Resources\.Black_Spirit_Hub\.css\?v=([^"\s>]+)/)?.[1];
const jsAssetVersion = html.match(/BlackSpiritHub\.Resources\.Black_Spirit_Hub\.js\?v=([^"\s>]+)/)?.[1];
assert.match(cssAssetVersion ?? "", /^v\d+\.\d+\.\d+(?:-[A-Za-z0-9.-]+)?$/, "CSS must use a versioned cache buster");
assert.equal(jsAssetVersion, cssAssetVersion, "CSS and JavaScript cache busters must stay aligned");
assert.match(html, /data-app-view="playerGuildView"[^>]*>[\s\S]*?<span class="navLabel">Player &amp; Guild Search<\/span>/);
assert.doesNotMatch(html, /playerGuildWelcome|Start with a family or guild name/);
assert.doesNotMatch(css, /playerGuildWelcome/);
assert.match(html, /id="playerGuildProfileNotice"[^>]*hidden/);
assert.match(html, /class="playerGuildNameRow">[\s\S]*?id="playerGuildFamilyName"[\s\S]*?id="playerGuildProfileNotice"/);
assert.match(html, /id="playerGuildPlayerUpdated"[\s\S]*?id="playerGuildReloadPlayer"[^>]*type="button"[^>]*>Refresh Profile<\/button>/);
assert.match(css, /\.playerGuildPanelGlyph\.life::before\{[^}]*mask-image:url\(/);
assert.doesNotMatch(css, /\.playerGuildPanelGlyph\.life::before\{[^}]*\\2726/);
assert.match(css, /\.playerGuildCharacterGrid,[^{]+\{[^}]*grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
assert.match(css, /\.playerGuildCharacterCard\{[^}]*min-height:74px;[^}]*grid-template-columns:58px minmax\(0,1fr\)/);
assert.match(css, /\.playerGuildClassIcon\{[^}]*width:54px;height:54px/);
assert.match(css, /\.playerGuildClassIcon img\{[^}]*width:50px;height:50px;object-fit:contain/);
assert.match(css, /#playerGuildView \.playerGuildHeroCopy h2\{[^}]*margin:4px 0 0;[^}]*padding-bottom:1px;[^}]*font:900 clamp\(23px,2\.4vw,36px\)\/1\.12 var\(--style-heading,"Segoe UI",sans-serif\)/);
assert.match(css, /\.playerGuildCharacterCard strong\{[^}]*font-size:12px;[^}]*line-height:1\.3;[^}]*padding-bottom:1px;[^}]*white-space:nowrap/);
assert.match(css, /\.playerGuildCharacterCard span\{[^}]*font-size:10px/);
assert.match(css, /\.playerGuildCharacterCard small\{[^}]*font-size:9px/);
assert.match(css, /\.playerGuildLifeSkillCard strong\{[^}]*color:var\(--pg-life-color\);[^}]*font-size:14px;[^}]*font-weight:950;[^}]*line-height:1\.15/);
assert.match(css, /\.playerGuildLifeSkillCard span\{[^}]*color:color-mix\(in srgb,var\(--pg-text\) 88%,var\(--pg-accent-hi\)\);[^}]*font-size:12px;[^}]*font-weight:850;[^}]*line-height:1\.2/);
assert.match(css, /\.playerGuildLifeSkillCard b\{[^}]*color:color-mix\(in srgb,var\(--pg-accent2\) 58%,#fff\);[^}]*font-size:10px;[^}]*font-weight:900;[^}]*letter-spacing:\.02em/);
const lifeSkillNameSize = Number(css.match(/(?:^|})\.playerGuildLifeSkillCard strong\{[^}]*font-size:(\d+)px/)?.[1]);
const lifeSkillRankSize = Number(css.match(/\.playerGuildLifeSkillCard span\{[^}]*font-size:(\d+)px/)?.[1]);
const lifeSkillMasterySize = Number(css.match(/\.playerGuildLifeSkillCard b\{[^}]*font-size:(\d+)px/)?.[1]);
assert.ok(lifeSkillNameSize > lifeSkillRankSize && lifeSkillRankSize > lifeSkillMasterySize, "life-skill text hierarchy must be name > rank/level > mastery");
assert.doesNotMatch(css, /\.playerGuildLifeSkillCard:nth-child/, "life-skill colors must not depend on card order");
for (const [skill, color] of Object.entries({
  gathering: "#8af55b", fishing: "#52cdff", hunting: "#ffc247", cooking: "#ff6f61", alchemy: "#c98cff",
  processing: "#7cf2e8", training: "#ff8fbd", trade: "#ff9f43", farming: "#4fe08a", sailing: "#788cff", barter: "#f065e6",
})) {
  assert.match(css, new RegExp(`\\.playerGuildLifeSkillCard\\[data-life-skill="${skill}"\\]\\{--pg-life-color:${color}\\}`));
}
assert.match(css, /\.playerGuildPanelTitle strong\{[^}]*font-size:13px/);
assert.match(css, /\.playerGuildPanelTitle small\{[^}]*font-size:10px/);
assert.match(css, /\.playerGuildResultRow strong\{[^}]*font-size:12px/);
assert.match(css, /\.playerGuildResultRow small\{[^}]*font-size:10px/);
assert.match(css, /\.playerGuildResultRow b\{[^}]*font-size:11px/);
assert.match(css, /#playerGuildGuildResults \.playerGuildResultRow\{[^}]*min-height:70px;[^}]*border-left:3px solid var\(--pg-accent2\);[^}]*linear-gradient/);
assert.match(css, /#playerGuildGuildResults \.playerGuildResultRow strong\{[^}]*font-size:14px/);
assert.match(css, /#playerGuildGuildResults \.playerGuildResultRow small\{[^}]*font-size:11px/);
assert.match(css, /#playerGuildGuildResults \.playerGuildResultRow b\{[^}]*font-size:12px/);
assert.match(css, /\.playerGuildRosterGrid\{[^}]*max-height:600px/);
assert.match(css, /\.playerGuildMemberCard\.nameOnly\{[^}]*grid-template-columns:minmax\(0,1fr\) auto/);
assert.match(css, /\.playerGuildRosterAvatar\.hasClassArtwork img\{[^}]*width:34px;height:34px;[^}]*object-fit:contain/);
assert.match(css, /#playerGuildView \.playerGuildRecentPill\{[^}]*min-height:31px;[^}]*padding:0 12px;[^}]*font-size:10px/);
assert.match(css, /#playerGuildView \.playerGuildRecentPill small\{[^}]*font-size:9px/);
assert.match(css, /\.playerGuildRecentPill::before\{[^}]*width:7px;height:7px;[^}]*background:var\(--recent-color\)/);
assert.match(css, /\.playerGuildRecents\{[^}]*overflow-x:auto;[^}]*overflow-y:hidden;[^}]*scrollbar-width:none;[^}]*touch-action:pan-x;[^}]*cursor:grab/);
assert.match(css, /\.playerGuildRecents::-webkit-scrollbar\{[^}]*display:none;[^}]*height:0/);
assert.match(css, /\.playerGuildRecents\.canScrollRight\{[^}]*mask-image:linear-gradient/);
assert.match(css, /\.playerGuildRecents\.canScrollLeft\.canScrollRight\{[^}]*mask-image:linear-gradient/);
assert.match(css, /\.playerGuildRecents\.isDragging,[^{]+\{[^}]*cursor:grabbing!important;[^}]*user-select:none/);
assert.match(css, /#playerGuildReloadPlayer\{[^}]*min-width:118px/);
for (const [index, color] of ["#38d9ff", "#ff5fb7", "#ffbd3d", "#a78bfa", "#38e59b", "#ff7a45", "#5c8dff", "#b7e534"].entries()) {
  assert.match(css, new RegExp(`#playerGuildView \\.playerGuildRecentPill:nth-child\\(8n\\+${index + 1}\\)\\{--recent-color:${color}\\}`));
}
assert.doesNotMatch(source, /class="playerGuildRecentPill"[^>]*\sstyle=/);
for (const [command, expectedTimeout] of Object.entries({
  searchBdoPlayersGuilds: 40_000,
  getBdoGuildProfile: 40_000,
  getBdoPlayerProfile: 75_000,
})) {
  const match = source.match(new RegExp(`${command}:(\\d+)`));
  assert.ok(match, `Missing explicit frontend timeout for ${command}.`);
  const timeout = Number(match[1]);
  assert.equal(timeout, expectedTimeout, `${command} must retain its coordinated frontend timeout.`);
}
const start = source.indexOf("const PLAYER_GUILD_REGIONS=");
const dehkiaStart = source.indexOf("const DEHKIA_", start);
const appInitializationStart = source.indexOf("initializeAppVersion();", start);
const end = dehkiaStart > start ? dehkiaStart : appInitializationStart;
if (start < 0 || end <= start) throw new Error("Could not isolate the Player & Guild JavaScript block.");
const playerGuildSource = source.slice(start, end);
assert.doesNotMatch(playerGuildSource, /BDO Alerts/i, "Player & Guild UI copy must not expose provider branding");
assert.doesNotMatch(playerGuildSource, /profile_?target/i, "Opaque profile targets must remain backend-only");
assert.match(playerGuildSource, /Only part of this profile is publicly available\. Missing values are shown as unavailable\./);
const rosterRenderStart = playerGuildSource.indexOf("function playerGuildRenderRoster(");
const rosterRenderEnd = playerGuildSource.indexOf("function playerGuildRenderGuild(", rosterRenderStart);
assert.ok(rosterRenderStart >= 0 && rosterRenderEnd > rosterRenderStart, "Could not isolate guild roster rendering.");
assert.doesNotMatch(
  playerGuildSource.slice(rosterRenderStart, rosterRenderEnd),
  /bridgeCall|getBdoPlayerProfile|playerGuildLoadPlayer/,
  "guild roster rendering must remain a local-only operation",
);

class FakeClassList {
  constructor() { this.values = new Set(); }
  add(...names) { names.forEach(name => this.values.add(name)); }
  remove(...names) { names.forEach(name => this.values.delete(name)); }
  contains(name) { return this.values.has(name); }
  toggle(name, force) {
    const enabled = force === undefined ? !this.values.has(name) : Boolean(force);
    if (enabled) this.values.add(name); else this.values.delete(name);
    return enabled;
  }
}

class FakeElement {
  constructor(id = "") {
    this.id = id;
    this.listeners = new Map();
    this.classList = new FakeClassList();
    this.dataset = {};
    this.hidden = false;
    this.disabled = false;
    this.readOnly = false;
    this.inert = false;
    this.value = "";
    this.textContent = "";
    this.innerHTML = "";
    this.attributes = new Map();
    this.form = null;
    this.type = "";
    this.tagName = "";
    this.ownerHarness = null;
    this.scrollLeft = 0;
    this.scrollWidth = 0;
    this.clientWidth = 0;
    this.capturedPointers = new Set();
  }
  addEventListener(type, handler) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type).add(handler);
  }
  removeEventListener(type, handler) { this.listeners.get(type)?.delete(handler); }
  listenerCount(type) { return this.listeners.get(type)?.size ?? 0; }
  dispatch(type, event = {}) {
    event.target ??= this;
    event.currentTarget = this;
    event.defaultPrevented ??= false;
    event.preventDefault ??= function preventDefault() { this.defaultPrevented = true; };
    event.immediatePropagationStopped ??= false;
    event.stopImmediatePropagation ??= function stopImmediatePropagation() { this.immediatePropagationStopped = true; };
    for (const handler of [...(this.listeners.get(type) ?? [])]) {
      handler(event);
      if (event.immediatePropagationStopped) break;
    }
    return event;
  }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  querySelector(selector) {
    if (selector === "span" && this.statusLabel) return this.statusLabel;
    return null;
  }
  querySelectorAll(selector) {
    if ((selector === "button" || selector === "[data-player-guild-mode]") && this.modeButtons) return this.modeButtons;
    return [];
  }
  closest(selector) {
    if (selector === "form") return this.form;
    if (selector === "#playerGuildView") return this.ownerHarness?.elements.playerGuildView ?? null;
    if (selector === ".playerGuildResultPanel") return this.resultPanel ?? null;
    if (selector === "[data-player-guild-mode]" && this.dataset.playerGuildMode) return this;
    if (selector === "[data-player-guild-recent]" && this.dataset.playerGuildRecent !== undefined) return this;
    if (selector === "[data-player-guild-search-result]" && this.dataset.playerGuildSearchResult !== undefined) return this;
    if (selector === "[data-player-guild-roster-member]" && this.dataset.playerGuildRosterMember !== undefined) return this;
    return null;
  }
  focus() { this.focused = true; }
  replaceWith(replacement) { this.replacement = replacement; }
  setPointerCapture(pointerId) { this.capturedPointers.add(pointerId); }
  releasePointerCapture(pointerId) { this.capturedPointers.delete(pointerId); }
  hasPointerCapture(pointerId) { return this.capturedPointers.has(pointerId); }
}

function createHarness({ failFirstRead = false, deferPlayer = false, playerResponse = null, playerError = null } = {}) {
  const ids = [
    "playerGuildView", "playerGuildSourceStatus", "playerGuildMessage", "playerGuildSearchMode", "playerGuildRegion",
    "playerGuildSearch", "playerGuildSearchButton", "playerGuildRecents", "playerGuildSearchResults",
    "playerGuildPlayerResults", "playerGuildGuildResults", "playerGuildPlayerResultCount", "playerGuildGuildResultCount",
    "playerGuildGuildProfile", "playerGuildGuildName", "playerGuildGuildMeta", "playerGuildGuildUpdated", "playerGuildMaster",
    "playerGuildMemberCount", "playerGuildProfileCoverage", "playerGuildReloadGuild", "playerGuildRosterFilter",
    "playerGuildRosterSort", "playerGuildRosterSummary", "playerGuildRosterRows", "playerGuildPlayerProfile",
    "playerGuildFamilyName", "playerGuildFamilyMeta", "playerGuildPlayerUpdated", "playerGuildReloadPlayer", "playerGuildPlayerHeroIcon",
    "playerGuildProfileNotice", "playerGuildProfileNoticeBadge", "playerGuildProfileNoticeCopy",
    "playerGuildMaxGearScore", "playerGuildContribution", "playerGuildEnergy", "playerGuildFamilyCreated",
    "playerGuildCharacterCount", "playerGuildCharacters", "playerGuildLifeSkills", "playerGuildHistory",
    "playerGuildSearchForm",
  ];
  const elements = Object.fromEntries(ids.map(id => [id, new FakeElement(id)]));
  const harness = { elements };
  Object.values(elements).forEach(element => { element.ownerHarness = harness; });

  elements.playerGuildSourceStatus.statusLabel = new FakeElement("statusLabel");
  const playerMode = new FakeElement("playerMode");
  playerMode.dataset.playerGuildMode = "player";
  const guildMode = new FakeElement("guildMode");
  guildMode.dataset.playerGuildMode = "guild";
  elements.playerGuildSearchMode.modeButtons = [playerMode, guildMode];
  elements.playerGuildPlayerResults.resultPanel = new FakeElement("playerResultPanel");
  elements.playerGuildGuildResults.resultPanel = new FakeElement("guildResultPanel");
  elements.playerGuildSearch.form = elements.playerGuildSearchForm;
  elements.playerGuildSearchButton.form = elements.playerGuildSearchForm;
  elements.playerGuildSearchButton.type = "submit";
  elements.playerGuildRegion.value = "eu";
  elements.playerGuildSearch.value = "Luminous";

  const document = new FakeElement("document");
  document.getElementById = id => elements[id] ?? null;
  document.querySelectorAll = selector => selector === "[data-player-guild-back]" ? [] : [];
  document.createElement = tagName => { const element = new FakeElement(); element.tagName = String(tagName).toUpperCase(); return element; };
  const window = new FakeElement("window");
  const calls = [];
  const errors = [];
  let shouldFailRead = failFirstRead;

  const context = vm.createContext({
    document,
    window,
    AbortController,
    Object,
    Number,
    Boolean,
    String,
    Math,
    Date,
    Error,
    Promise,
    setTimeout,
    clearTimeout,
    console: { error: (...args) => errors.push(args) },
    readSetting(_key, fallback) {
      if (shouldFailRead) { shouldFailRead = false; throw new Error("simulated first-read failure"); }
      return fallback;
    },
    persistSetting() {},
    norm: value => String(value ?? "").trim().toLowerCase(),
    escapeHtml: value => String(value ?? "").replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]),
    bridgeCall(command, payload, options = {}) {
      calls.push({ command, payload });
      if (command === "searchBdoPlayersGuilds") {
        return Promise.resolve(payload.mode === "guild"
          ? { guilds: [{ guildName: "Luminous", memberCount: 97 }] }
          : { players: [{ familyName: "Luminous" }] });
      }
      if (command === "getBdoPlayerProfile" && deferPlayer) {
        return new Promise((resolve, reject) => {
          const abort = () => {
            const error = new Error("The operation was cancelled.");
            error.name = "AbortError";
            reject(error);
          };
          if (options.signal?.aborted) abort();
          else options.signal?.addEventListener("abort", abort, { once: true });
        });
      }
      if (command === "getBdoPlayerProfile") {
        if (playerError) return Promise.reject(playerError);
        return Promise.resolve(playerResponse ?? { familyName: payload.familyName, characters: [], lifeSkills: [], guildHistory: [] });
      }
      return Promise.resolve({});
    },
  });
  new vm.Script(playerGuildSource, { filename: scriptPath }).runInContext(context);

  return {
    elements,
    document,
    calls,
    errors,
    playerMode,
    guildMode,
    initialize: () => vm.runInContext("initializePlayerGuild()", context),
    state: () => vm.runInContext("({initialized:playerGuildState.initialized,initializing:playerGuildState.initializing,mode:playerGuildState.mode,loading:playerGuildState.loading,view:playerGuildState.view,playerReturnView:playerGuildState.playerReturnView,playerFamily:playerGuildState.player?.familyName||'',playerMaxGearScore:playerGuildState.player?.maxGearScore??null})", context),
    seedRoster(familyName) {
      context.__familyName = familyName;
      vm.runInContext("playerGuildState.guild={region:'eu',guildName:'Luminous',guildMaster:'',members:[{familyName:__familyName,hasCachedProfile:false,isPrivate:null,mainCharacter:'',className:''}]};playerGuildState.renderedRoster=playerGuildState.guild.members;playerGuildState.view='guild'", context);
    },
    seedRecents(items) {
      context.__recents = items;
      vm.runInContext("playerGuildState.recents=__recents;playerGuildRenderRecents()", context);
    },
    forceReinitialize() {
      return vm.runInContext("playerGuildState.initialized=false;initializePlayerGuild()", context);
    },
    renderGuild(payload) {
      context.__guildPayload = payload;
      vm.runInContext("playerGuildRenderGuild(playerGuildNormalizeGuild(__guildPayload))", context);
    },
    renderPlayer(payload) {
      context.__playerPayload = payload;
      vm.runInContext("playerGuildRenderPlayer(playerGuildNormalizePlayer(__playerPayload))", context);
    },
    setPlayerReturnView(view) {
      context.__playerReturnView = view;
      vm.runInContext("playerGuildState.playerReturnView=__playerReturnView", context);
    },
    lifeIcon(name) {
      context.__lifeSkillName = name;
      return vm.runInContext("playerGuildLifeIcon(__lifeSkillName)", context);
    },
    lifeSlug(name) {
      context.__lifeSkillName = name;
      return vm.runInContext("playerGuildLifeSlug(__lifeSkillName)", context);
    },
    handleIconError(image) {
      context.__failedIcon = image;
      vm.runInContext("playerGuildHandleIconError({target:__failedIcon})", context);
    },
    flush: async () => { await Promise.resolve(); await new Promise(resolve => setImmediate(resolve)); },
  };
}

{
  const harness = createHarness();
  assert.equal(harness.state().initialized, false);
  const submit = harness.document.dispatch("submit", { target: harness.elements.playerGuildSearchForm });
  assert.equal(submit.defaultPrevented, true, "submit must be prevented before view initialization");
  await harness.flush();
  assert.equal(harness.state().initialized, true, "first submit should initialize the view");
  assert.equal(harness.calls.length, 1);
  assert.equal(harness.calls[0].command, "searchBdoPlayersGuilds");
  assert.equal(harness.calls[0].payload.mode, "player");
}

{
  const harness = createHarness();
  assert.equal(harness.initialize(), true, "first activation should initialize successfully");
  harness.elements.playerGuildSearchMode.dispatch("click", { target: harness.guildMode });
  assert.equal(harness.state().mode, "guild", "Guilds toggle should work on first activation");

  const click = harness.elements.playerGuildSearchButton.dispatch("click");
  assert.equal(click.defaultPrevented, true, "submit button click should suppress the browser form submission");
  await harness.flush();
  assert.equal(harness.calls.length, 1, "button click should issue exactly one request");
  assert.equal(harness.calls[0].payload.mode, "guild");

  const modeListeners = harness.elements.playerGuildSearchMode.listenerCount("click");
  assert.equal(harness.initialize(), true, "repeat initialization should be idempotent");
  assert.equal(harness.elements.playerGuildSearchMode.listenerCount("click"), modeListeners, "repeat initialization must not duplicate listeners");
}

{
  const harness = createHarness();
  const recents = harness.elements.playerGuildRecents;
  recents.clientWidth = 320;
  recents.scrollWidth = 760;
  assert.equal(harness.initialize(), true);
  harness.seedRecents([{ type: "player", region: "eu", name: "Whiiteshade" }]);
  assert.equal(recents.classList.contains("canScrollRight"), true, "overflowing recents should receive a soft right-edge affordance");
  assert.equal(recents.classList.contains("canScrollLeft"), false);

  const recent = new FakeElement("recentPlayer");
  recent.dataset.playerGuildRecent = "0";
  recents.dispatch("pointerdown", { target: recent, pointerId: 7, pointerType: "mouse", button: 0, isPrimary: true, clientX: 220 });
  assert.equal(recents.hasPointerCapture(7), false, "an ordinary press must not capture the pointer and retarget the recent-pill click");
  const move = recents.dispatch("pointermove", { pointerId: 7, pointerType: "mouse", clientX: 130 });
  assert.equal(recents.hasPointerCapture(7), true, "pointer capture should begin only after the drag threshold is crossed");
  assert.equal(move.defaultPrevented, true);
  assert.equal(recents.scrollLeft, 90, "dragging left should move the recent strip right by the same distance");
  assert.equal(recents.classList.contains("isDragging"), true);
  assert.equal(recents.classList.contains("canScrollLeft"), true);

  recents.dispatch("pointerup", { target: recents, pointerId: 7, pointerType: "mouse", clientX: 130 });
  assert.equal(recents.hasPointerCapture(7), false, "pointer capture must be released after the drag");
  assert.equal(recents.classList.contains("isDragging"), false);
  const suppressedClick = recents.dispatch("click", { target: recents });
  assert.equal(suppressedClick.defaultPrevented, true, "the synthetic click following a real drag must be suppressed");
  assert.equal(harness.calls.length, 0, "dragging a recent must not open its profile");

  await harness.flush();
  const keyboardStyleClick = recents.dispatch("click", { target: recent });
  assert.equal(keyboardStyleClick.defaultPrevented, false, "later click and keyboard activation must remain intact");
  assert.equal(harness.calls.length, 1);
  assert.equal(harness.calls[0].command, "getBdoPlayerProfile");
}

{
  const harness = createHarness();
  const recents = harness.elements.playerGuildRecents;
  recents.clientWidth = 320;
  recents.scrollWidth = 760;
  assert.equal(harness.initialize(), true);
  harness.seedRecents([{ type: "player", region: "eu", name: "Whiiteshade" }]);
  const recent = new FakeElement("recentPlayer");
  recent.dataset.playerGuildRecent = "0";

  recents.dispatch("pointerdown", { target: recent, pointerId: 8, pointerType: "mouse", button: 0, isPrimary: true, clientX: 100 });
  recents.dispatch("pointermove", { target: recent, pointerId: 8, pointerType: "mouse", clientX: 96 });
  assert.equal(recents.hasPointerCapture(8), false, "sub-threshold movement must preserve the button as the click target");
  const nativeClickTarget = recents.hasPointerCapture(8) ? recents : recent;
  recents.dispatch("pointerup", { target: nativeClickTarget, pointerId: 8, pointerType: "mouse", clientX: 96 });
  recents.dispatch("click", { target: nativeClickTarget });
  assert.equal(harness.calls.length, 1, "movement below the drag threshold must preserve a normal recent-pill click");

  await harness.flush();
  recents.dispatch("pointerdown", { pointerId: 9, pointerType: "mouse", button: 0, isPrimary: true, clientX: 180 });
  recents.dispatch("pointermove", { pointerId: 9, pointerType: "mouse", clientX: 140 });
  recents.dispatch("pointercancel", { pointerId: 9, pointerType: "mouse", clientX: 140 });
  assert.equal(recents.hasPointerCapture(9), false, "pointer cancellation must release capture");
  assert.equal(recents.classList.contains("isDragging"), false, "pointer cancellation must clear the grabbing state");

  recents.dispatch("pointerdown", { pointerId: 10, pointerType: "mouse", button: 0, isPrimary: true, clientX: 180 });
  recents.dispatch("pointermove", { pointerId: 10, pointerType: "mouse", clientX: 140 });
  recents.capturedPointers.delete(10);
  recents.dispatch("lostpointercapture", { pointerId: 10, pointerType: "mouse" });
  assert.equal(recents.classList.contains("isDragging"), false, "lost capture must clear the grabbing state");

  recents.dispatch("pointerdown", { pointerId: 11, pointerType: "mouse", button: 0, isPrimary: true, clientX: 180 });
  recents.dispatch("pointermove", { pointerId: 11, pointerType: "mouse", clientX: 140 });
  assert.equal(harness.forceReinitialize(), true);
  assert.equal(recents.hasPointerCapture(11), false, "view reinitialization must release an active recents pointer");
  assert.equal(recents.classList.contains("isDragging"), false);
  assert.equal(recents.listenerCount("pointerdown"), 1, "view reinitialization must replace rather than duplicate drag handlers");

  const beforeTouch = recents.scrollLeft;
  recents.dispatch("pointerdown", { pointerId: 12, pointerType: "touch", button: 0, isPrimary: true, clientX: 180 });
  recents.dispatch("pointermove", { pointerId: 12, pointerType: "touch", clientX: 100 });
  assert.equal(recents.scrollLeft, beforeTouch, "touch pointers must remain available to the browser's native horizontal scrolling");
  assert.equal(recents.hasPointerCapture(12), false);
}

{
  const harness = createHarness({ failFirstRead: true });
  assert.equal(harness.initialize(), false, "a failed first initialization should be reported");
  assert.equal(harness.state().initialized, false, "failed initialization must remain retryable");
  assert.equal(harness.elements.playerGuildSearchMode.listenerCount("click"), 0, "failed initialization must not leak handlers");
  assert.equal(harness.initialize(), true, "a later activation should retry successfully");
  assert.equal(harness.state().initialized, true);
  assert.equal(harness.elements.playerGuildSearchMode.listenerCount("click"), 1);
}

{
  const harness = createHarness({ deferPlayer: true });
  assert.equal(harness.initialize(), true);
  harness.elements.playerGuildSearchMode.dispatch("click", { target: harness.guildMode });
  assert.equal(harness.state().mode, "guild");
  harness.seedRoster("Whiiteshade");
  const memberCard = new FakeElement("memberCard");
  memberCard.dataset.playerGuildRosterMember = "0";
  harness.elements.playerGuildRosterRows.dispatch("click", { target: memberCard });
  assert.equal(harness.calls.length, 1, "roster click should issue one player-profile request");
  assert.equal(harness.calls[0].command, "getBdoPlayerProfile");
  assert.equal(harness.calls[0].payload.region, "eu");
  assert.equal(harness.calls[0].payload.familyName, "Whiiteshade");
  assert.equal(harness.state().loading, true);
  assert.equal(harness.state().mode, "guild", "opening a roster member must preserve the Guilds search mode");

  const cancel = harness.elements.playerGuildSearchButton.dispatch("click");
  assert.equal(cancel.defaultPrevented, true);
  await harness.flush();
  assert.equal(harness.state().loading, false, "cancelling a roster profile must restore every control");
  assert.equal(harness.state().mode, "guild", "a failed or cancelled member load must not switch the search mode");
}

{
  const harness = createHarness();
  assert.equal(harness.initialize(), true);
  harness.renderGuild({
    status: "CACHED",
    region: "eu",
    guildName: "Luminous",
    guildMaster: "PublicFamily",
    memberCount: 4,
    members: ["PublicFamily", "PrivateFamily", "UnknownFamily", "UnavailableFamily"],
    membersDetailed: [
      { familyName: "PublicFamily", hasCachedProfile: true, isPrivate: false, mainCharacter: { name: "PublicMain", class: "Wizard", level: 67 } },
      { familyName: "PrivateFamily", hasCachedProfile: true, isPrivate: true, mainCharacter: { name: "HiddenMain", class: "Wizard", level: null } },
      { familyName: "UnknownFamily", hasCachedProfile: true, isPrivate: null, mainCharacter: { name: "UnknownMain", class: "Witch", level: null } },
      { familyName: "UnavailableFamily", hasCachedProfile: false, isPrivate: null, mainCharacter: { name: "OldMain", class: "Ranger", level: 62 } },
    ],
  });
  const roster = harness.elements.playerGuildRosterRows.innerHTML;
  assert.equal(harness.calls.length, 0, "rendering a guild roster must never fan out into player-profile requests");
  assert.equal((roster.match(/playerGuildRosterAvatar hasClassArtwork/g) ?? []).length, 1, "only a cached explicitly public member gets artwork");
  assert.equal((roster.match(/playerGuildMemberCard [^"]*nameOnly/g) ?? []).length, 3, "private, unknown, and unavailable profiles stay name-only");
  assert.match(roster, /Assets\/GrindTracker\/classes\/wizard\.png/);
  assert.match(roster, /PublicMain · Wizard/);
  assert.doesNotMatch(roster, /Assets\/GrindTracker\/classes\/(?:witch|ranger)\.png/);
  assert.doesNotMatch(roster, /HiddenMain|UnknownMain|OldMain/);
}

{
  const harness = createHarness({
    playerResponse: {
      familyName: "Whiiteshade",
      region: "eu",
      isPrivate: false,
      isComplete: true,
      maxGearScore: 760,
      characters: [{ characterName: "WhiteMain", className: "Witch", level: 66, isMain: true }],
      lifeSkills: [],
      guildHistory: [],
    },
  });
  assert.equal(harness.initialize(), true);
  harness.elements.playerGuildSearchMode.dispatch("click", { target: harness.guildMode });
  harness.seedRoster("Whiiteshade");
  const memberCard = new FakeElement("memberCard");
  memberCard.dataset.playerGuildRosterMember = "0";
  harness.elements.playerGuildRosterRows.dispatch("click", { target: memberCard });
  await harness.flush();
  assert.equal(harness.calls.length, 1, "a clicked roster member should remain the only player-profile request");
  assert.match(harness.elements.playerGuildRosterRows.innerHTML, /Assets\/GrindTracker\/classes\/witch\.png/);
  assert.match(harness.elements.playerGuildRosterRows.innerHTML, /WhiteMain · Witch/);
  assert.equal(harness.state().mode, "guild", "updating cached roster artwork must preserve Guilds mode for Back");
}

{
  const harness = createHarness({
    playerResponse: {
      familyName: "CurrentFamily",
      region: "eu",
      isPrivate: false,
      isComplete: true,
      maxGearScore: 812,
      characters: [{ name: "RefreshedMain", class: "Wizard", level: 67, isMain: true }],
      lifeSkills: [],
      guildHistory: [],
    },
  });
  assert.equal(harness.initialize(), true);
  harness.elements.playerGuildSearchMode.dispatch("click", { target: harness.guildMode });
  harness.renderPlayer({
    familyName: "CurrentFamily",
    region: "eu",
    isPrivate: false,
    isComplete: true,
    maxGearScore: 700,
    characters: [{ name: "ExistingMain", class: "Witch", level: 66, isMain: true }],
    lifeSkills: [],
    guildHistory: [],
  });
  harness.setPlayerReturnView("guild");

  harness.elements.playerGuildReloadPlayer.dispatch("click");
  assert.equal(harness.calls.length, 1, "Refresh Profile should issue exactly one bridge request");
  assert.equal(harness.calls[0].command, "getBdoPlayerProfile");
  assert.deepEqual(Object.keys(harness.calls[0].payload).sort(), ["familyName", "forceRefresh", "region"]);
  assert.equal(harness.calls[0].payload.region, "eu");
  assert.equal(harness.calls[0].payload.familyName, "CurrentFamily");
  assert.equal(harness.calls[0].payload.forceRefresh, true, "the refresh request must opt in explicitly");
  assert.equal(harness.state().loading, true);
  assert.equal(harness.state().view, "player", "refreshing must leave the current profile visible");
  assert.equal(harness.state().mode, "guild", "refreshing a roster member must preserve Guilds mode");
  assert.equal(harness.state().playerReturnView, "guild", "refreshing must preserve the Back destination");
  assert.equal(harness.elements.playerGuildReloadPlayer.disabled, true);
  assert.equal(harness.elements.playerGuildReloadPlayer.textContent, "Refreshing...");
  assert.equal(harness.elements.playerGuildReloadPlayer.attributes.get("aria-busy"), "true");

  await harness.flush();
  assert.equal(harness.calls.length, 1, "a successful refresh must not trigger follow-up requests");
  assert.equal(harness.state().loading, false);
  assert.equal(harness.state().playerMaxGearScore, 812);
  assert.equal(harness.elements.playerGuildMaxGearScore.textContent, "812");
  assert.equal(harness.elements.playerGuildSourceStatus.statusLabel.textContent, "Profile refreshed");
  assert.equal(harness.elements.playerGuildMessage.textContent, "");
  assert.equal(harness.elements.playerGuildReloadPlayer.disabled, false);
  assert.equal(harness.elements.playerGuildReloadPlayer.textContent, "Refresh Profile");
  assert.equal(harness.elements.playerGuildReloadPlayer.attributes.get("aria-busy"), "false");
  assert.equal(harness.state().mode, "guild");
  assert.equal(harness.state().playerReturnView, "guild");
}

{
  const harness = createHarness({ playerError: new Error("BDO Alerts internal failure details") });
  assert.equal(harness.initialize(), true);
  harness.renderPlayer({
    familyName: "CurrentFamily",
    region: "eu",
    isPrivate: false,
    isComplete: true,
    maxGearScore: 700,
    characters: [{ name: "ExistingMain", class: "Witch", level: 66, isMain: true }],
    lifeSkills: [],
    guildHistory: [],
  });
  harness.elements.playerGuildReloadPlayer.dispatch("click");
  await harness.flush();

  assert.equal(harness.calls.length, 1);
  assert.equal(harness.calls[0].payload.forceRefresh, true);
  assert.equal(harness.state().playerFamily, "CurrentFamily");
  assert.equal(harness.state().playerMaxGearScore, 700, "a failed refresh must preserve the current profile state");
  assert.equal(harness.elements.playerGuildFamilyName.textContent, "CurrentFamily");
  assert.equal(harness.elements.playerGuildMaxGearScore.textContent, "700", "a failed refresh must preserve the rendered profile");
  assert.equal(harness.elements.playerGuildSourceStatus.statusLabel.textContent, "Profile refresh unavailable");
  assert.equal(harness.elements.playerGuildMessage.textContent, "Could not refresh this profile. The current profile is still shown; try again.");
  assert.doesNotMatch(harness.elements.playerGuildMessage.textContent, /BDO Alerts/i, "refresh failures must not expose provider branding");
  assert.equal(harness.elements.playerGuildReloadPlayer.disabled, false);
  assert.equal(harness.elements.playerGuildReloadPlayer.textContent, "Refresh Profile");
}

{
  const harness = createHarness({
    playerResponse: {
      familyName: "CurrentFamily",
      region: "eu",
      isPrivate: false,
      isComplete: true,
      isStale: true,
      maxGearScore: 999,
      characters: [{ name: "StaleMain", class: "Wizard", level: 67, isMain: true }],
      lifeSkills: [],
      guildHistory: [],
    },
  });
  assert.equal(harness.initialize(), true);
  harness.renderPlayer({
    familyName: "CurrentFamily",
    region: "eu",
    isPrivate: false,
    isComplete: true,
    maxGearScore: 700,
    characters: [{ name: "ExistingMain", class: "Witch", level: 66, isMain: true }],
    lifeSkills: [],
    guildHistory: [],
  });
  harness.elements.playerGuildReloadPlayer.dispatch("click");
  await harness.flush();

  assert.equal(harness.calls.length, 1);
  assert.equal(harness.state().playerMaxGearScore, 700, "a stale fallback must not replace the current profile");
  assert.equal(harness.elements.playerGuildMaxGearScore.textContent, "700");
  assert.equal(harness.elements.playerGuildSourceStatus.statusLabel.textContent, "Profile refresh unavailable");
  assert.equal(harness.elements.playerGuildMessage.textContent, "Could not refresh this profile. The current profile is still shown; try again.");
  assert.equal(harness.elements.playerGuildReloadPlayer.disabled, false);
}

{
  const harness = createHarness();
  assert.equal(harness.initialize(), true);
  const base = { familyName: "PrivateFamily", region: "eu", characters: [{ characterName: "Hidden", className: "Witch" }], lifeSkills: [], guildHistory: [] };
  harness.renderPlayer({ ...base, isPrivate: true, isComplete: false });
  assert.equal(harness.elements.playerGuildProfileNotice.hidden, false);
  assert.equal(harness.elements.playerGuildProfileNotice.dataset.state, "private");
  assert.equal(harness.elements.playerGuildProfileNoticeBadge.textContent, "Private profile");

  harness.renderPlayer({ ...base, isPrivate: false, isComplete: true, maxGearScore: 800 });
  assert.equal(harness.elements.playerGuildProfileNotice.hidden, true, "public complete profile must clear a stale privacy badge");
  assert.equal(harness.elements.playerGuildProfileNotice.dataset.state, undefined);
  assert.equal(harness.elements.playerGuildProfileNoticeBadge.textContent, "");

  harness.renderPlayer({ ...base, isPrivate: false, isComplete: false });
  assert.equal(harness.elements.playerGuildProfileNotice.dataset.state, "limited");
  assert.equal(harness.elements.playerGuildProfileNoticeBadge.textContent, "Limited profile data");
  assert.equal(harness.elements.playerGuildProfileNoticeCopy.textContent, "Only part of this profile is publicly available. Missing values are shown as unavailable.");

  harness.renderPlayer({ familyName: "UnknownFamily", region: "eu", isPrivate: null, isComplete: null, characters: [], lifeSkills: [], guildHistory: [] });
  assert.equal(harness.elements.playerGuildProfileNotice.dataset.state, "empty");
  assert.match(harness.elements.playerGuildProfileNoticeCopy.textContent, /privacy could not be determined/i);
}

{
  const harness = createHarness();
  assert.equal(harness.initialize(), true);
  assert.match(harness.lifeIcon("Fishing"), /data-player-guild-icon-fallback="FI"/);
  assert.equal(harness.elements.playerGuildLifeSkills.listenerCount("error"), 1);
  const image = new FakeElement("failedLifeSkillIcon");
  image.tagName = "IMG";
  image.alt = "Fishing";
  image.dataset.playerGuildIconFallback = "FI";
  harness.handleIconError(image);
  assert.equal(image.replacement?.tagName, "SPAN");
  assert.equal(image.replacement?.textContent, "FI");
  assert.equal(image.replacement?.attributes.get("role"), "img");
  assert.match(image.replacement?.attributes.get("aria-label") ?? "", /Fishing icon unavailable/);
}

{
  const harness = createHarness();
  const canonicalLifeSkills = [
    ["Gathering", "gathering"], ["Fishing", "fishing"], ["Hunting", "hunting"], ["Cooking", "cooking"],
    ["Alchemy", "alchemy"], ["Processing", "processing"], ["Training", "training"], ["Trade", "trade"],
    ["Farming", "farming"], ["Sailing", "sailing"], ["Barter", "barter"],
  ];
  for (const [name, slug] of canonicalLifeSkills) assert.equal(harness.lifeSlug(name), slug, `${name} must retain its deterministic color slug`);
  assert.equal(harness.lifeSlug("Trading"), "trade");
  assert.equal(harness.lifeSlug("Bartering"), "barter");
  assert.equal(harness.lifeSlug("<Future Skill>"), "other");
  const renderedLifeSkills = [
    ["Bartering", "barter"], ["Gathering", "gathering"], ["Trading", "trade"], ["Fishing", "fishing"],
    ["Alchemy", "alchemy"], ["Processing", "processing"], ["Training", "training"], ["Farming", "farming"],
    ["Sailing", "sailing"], ["Hunting", "hunting"],
  ];
  harness.renderPlayer({
    familyName: "LifeSkillFamily",
    region: "eu",
    characters: [],
    lifeSkills: [...renderedLifeSkills.map(([name]) => ({ name, rank: "Master", level: 1, mastery: 1000 })), { name: "<Future Skill>", rank: "Beginner", level: 1 }],
    guildHistory: [],
  });
  const rendered = harness.elements.playerGuildLifeSkills.innerHTML;
  let previousIndex = -1;
  for (const [name, slug] of renderedLifeSkills) {
    const marker = `data-life-skill="${slug}"`;
    const markerIndex = rendered.indexOf(marker, previousIndex + 1);
    assert.ok(markerIndex > previousIndex, `${name} must keep its name-based color after reordering`);
    assert.match(rendered.slice(markerIndex), new RegExp(`<strong>${name}<\\/strong>`));
    previousIndex = markerIndex;
  }
  assert.match(rendered, /data-life-skill="other"/, "future skills must use the theme-compatible fallback color");
  assert.match(rendered, /&lt;Future Skill&gt;/, "life-skill names must remain HTML escaped");
  assert.doesNotMatch(rendered, /<strong><Future Skill>/, "life-skill names must never become markup");
}

console.log("Player & Guild first-activation JavaScript verification passed.");
