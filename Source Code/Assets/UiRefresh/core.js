/* Optional UI refresh. Existing controls are moved, never cloned or re-created. */
(() => {
  "use strict";
  const KEY = "blackSpiritHub.uiRefresh";
  const sizes = { standard: [14, 12, 18], large: [16, 14, 20], "extra-large": [18, 16, 22] };
  const categories = { general: "General", appearance: "Appearance", notifications: "Notifications", data: "Data & Updates" };
  function normalize(value) {
    const source = value && typeof value === "object" ? value : {};
    return { schemaVersion: 1, enabled: source.enabled !== false,
      textSize: Object.hasOwn(sizes, source.textSize) ? source.textSize : "standard",
      calmSurfaces: source.calmSurfaces !== false,
      settingsTab: Object.hasOwn(categories, source.settingsTab) ? source.settingsTab : "general" };
  }
  let prefs;
  try { prefs = normalize(JSON.parse(localStorage.getItem(KEY))); } catch { prefs = normalize(null); }
  let workspace, originalShell, master, textSize, calm, search, empty, resultsStatus;
  const moves = [], entries = [], tabs = [], panels = new Map();
  let moved = false;
  function notifyError(message) {
    if (typeof NotificationService !== "undefined") NotificationService.ShowError(message, "Interface settings");
    const status = document.getElementById("uiRefreshStatus");
    if (status) status.textContent = message;
  }
  function save(partial) {
    const next = normalize({ ...prefs, ...partial });
    try { localStorage.setItem(KEY, JSON.stringify(next)); }
    catch { notifyError("These preferences could not be saved. Check available storage and try again."); apply(); return false; }
    prefs = next;
    apply();
    return true;
  }
  function apply() {
    document.body.dataset.uiRefresh = prefs.enabled ? "on" : "off";
    document.body.dataset.uiTextSize = prefs.textSize;
    document.body.dataset.uiCalm = prefs.calmSurfaces ? "on" : "off";
    const [body, caption, title] = sizes[prefs.textSize];
    for (const [name, value] of Object.entries({ "--ui-body-size": body, "--ui-caption-size": caption, "--ui-title-size": title }))
      document.documentElement.style.setProperty(name, `${value}px`);
    if (master) master.checked = prefs.enabled;
    if (textSize) textSize.value = prefs.textSize;
    if (calm) calm.checked = prefs.calmSurfaces;
    if (workspace) {
      if (prefs.enabled && !moved) { moves.forEach(({ node, target }) => target.append(node)); moved = true; }
      if (!prefs.enabled && moved) { moves.forEach(({ node, anchor }) => anchor.after(node)); moved = false; }
      originalShell.hidden = prefs.enabled;
      workspace.hidden = !prefs.enabled;
      filterSettings();
    }
    document.dispatchEvent(new CustomEvent("bsh:ui-refresh", { detail: { enabled: prefs.enabled, textSize: prefs.textSize, calmSurfaces: prefs.calmSurfaces } }));
    if (typeof scheduleFixedChromeOffsetSync === "function") scheduleFixedChromeOffsetSync();
  }
  function make(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function move(node, target) {
    if (!node || moves.some(item => item.node === node)) return;
    const anchor = document.createComment("Original settings position");
    node.before(anchor);
    moves.push({ node, target, anchor });
  }
  function entry(category, title, words = "") {
    const node = make("section", "uiSettingsEntry");
    const heading = make("h3", "uiSettingsEntryTitle", title);
    node.append(heading);
    panels.get(category).append(node);
    entries.push({ node, category, words: `${title} ${words}` });
    return node;
  }
  function moveRow(id, category, title, words) {
    const row = document.getElementById(id)?.closest(".settingRow, .rangeControl");
    if (row) move(row, entry(category, title, words));
  }
  function settingRow(title, help, control) {
    const row = make("div", "settingRow");
    const copy = make("div", "settingCopy");
    copy.append(make("strong", "", title), make("span", "", help));
    row.append(copy, control);
    return row;
  }
  function toggle(id, title) {
    const label = make("label", "switch");
    const input = make("input"); input.type = "checkbox"; input.id = id;
    input.setAttribute("aria-label", title);
    label.append(input, make("span", "slider"));
    return { label, input };
  }
  function matches(text, query) {
    const normalized = String(text).normalize("NFKC").toLocaleLowerCase();
    return String(query).trim().normalize("NFKC").toLocaleLowerCase().split(/\s+/).every(word => normalized.includes(word));
  }
  function filterSettings() {
    if (!search) return;
    const query = search.value.trim();
    let count = 0;
    for (const item of entries) {
      const visible = query ? matches(`${item.words} ${item.node.textContent}`, query) : item.category === prefs.settingsTab;
      item.node.hidden = !visible;
      if (visible) count++;
    }
    for (const [id, panel] of panels) panel.hidden = query ? !entries.some(item => item.category === id && !item.node.hidden) : id !== prefs.settingsTab;
    for (const tab of tabs) {
      const selected = !query && tab.dataset.category === prefs.settingsTab;
      tab.setAttribute("aria-selected", String(selected));
      tab.tabIndex = selected || (query && tab.dataset.category === prefs.settingsTab) ? 0 : -1;
    }
    empty.hidden = count > 0;
    resultsStatus.textContent = query ? `${count} setting ${count === 1 ? "group" : "groups"} found` : "";
  }
  function activateView(id, callback) {
    const button = document.querySelector(`[data-app-view="${id}"]`);
    const view = document.getElementById(id);
    if (!button || !view) return;
    if (typeof activateAppView === "function") activateAppView(button);
    // The existing tab transition takes 180 ms. Observe completion rather than guessing it.
    if (view.classList.contains("active")) { callback?.(); return; }
    const observer = new MutationObserver(() => {
      if (view.classList.contains("active")) { observer.disconnect(); clearTimeout(timeout); callback?.(); }
    });
    observer.observe(view, { attributes: true, attributeFilter: ["class"] });
    const timeout = setTimeout(() => observer.disconnect(), 3000);
  }
  function action(parent, label, callback) {
    const button = make("button", "btn uiSecondaryAction", label); button.type = "button";
    button.addEventListener("click", callback); parent.append(button); return button;
  }
  function mount() {
    const view = document.getElementById("settingsView");
    originalShell = view?.querySelector(".settingsShell");
    if (!view || !originalShell || document.getElementById("uiRefreshPreferences")) return;
    originalShell.classList.add("uiOriginalSettings");
    const bar = make("div", "uiRefreshPreferences"); bar.id = "uiRefreshPreferences";
    const refresh = toggle("uiRefreshEnabled", "Use refreshed interface"); master = refresh.input;
    bar.append(settingRow("Refreshed interface", "Try the improvements, or turn this off to return to the previous presentation. Your progress and theme are kept.", refresh.label));
    const status = make("p", "uiRefreshStatus"); status.id = "uiRefreshStatus"; status.setAttribute("role", "status"); bar.append(status);
    workspace = make("div", "uiSettingsWorkspace");
    const toolbar = make("div", "uiSettingsToolbar");
    search = make("input", "uiSettingsSearch"); search.type = "search"; search.placeholder = "Search settings: text size, volume, startup…";
    search.setAttribute("aria-label", "Search all settings");
    resultsStatus = make("span", "uiSettingsResultsStatus"); resultsStatus.setAttribute("role", "status");
    const nav = make("div", "uiSettingsTabs"); nav.setAttribute("role", "tablist"); nav.setAttribute("aria-label", "Settings categories");
    for (const [id, title] of Object.entries(categories)) {
      const tab = make("button", "uiSettingsTab", title); tab.type = "button"; tab.id = `uiSettingsTab-${id}`;
      tab.dataset.category = id; tab.setAttribute("role", "tab"); tab.setAttribute("aria-controls", `uiSettings-${id}`);
      tab.addEventListener("click", () => { search.value = ""; save({ settingsTab: id }); });
      tab.addEventListener("keydown", event => {
        let index = tabs.indexOf(tab);
        if (event.key === "ArrowRight") index = (index + 1) % tabs.length;
        else if (event.key === "ArrowLeft") index = (index - 1 + tabs.length) % tabs.length;
        else if (event.key === "Home") index = 0;
        else if (event.key === "End") index = tabs.length - 1;
        else return;
        event.preventDefault(); tabs[index].click(); tabs[index].focus();
      });
      nav.append(tab); tabs.push(tab);
      const panel = make("div", "uiSettingsPanel"); panel.id = `uiSettings-${id}`;
      panel.setAttribute("role", "tabpanel"); panel.setAttribute("aria-labelledby", tab.id); panels.set(id, panel);
    }
    toolbar.append(search, resultsStatus, nav); workspace.append(toolbar, ...panels.values());
    empty = make("p", "uiSettingsEmpty", "No settings match. Try a shorter search, such as voice, theme, or startup.");
    workspace.append(empty); view.prepend(bar, workspace);
    moveRow("minimizeToTrayEnabled", "general", "Window behavior", "close tray minimize");
    moveRow("openImmediatelyWhenReady", "general", "Startup", "introduction cinematic speed fast");
    const reading = entry("appearance", "Reading comfort", "font size zoom readability standard large extra large");
    textSize = make("select", "settingSelect"); textSize.id = "uiTextSize"; textSize.setAttribute("aria-label", "Text size");
    for (const [value, title] of [["standard", "Standard"], ["large", "Large"], ["extra-large", "Extra Large"]]) {
      const option = make("option", "", title); option.value = value; textSize.append(option);
    }
    reading.append(settingRow("Text size", "Change reading size without changing your spacing or theme.", textSize));
    const calmToggle = toggle("uiCalmSurfaces", "Calmer content panels"); calm = calmToggle.input;
    reading.append(settingRow("Calmer content panels", "Soften decoration behind content while keeping theme colors and vibrant titles.", calmToggle.label));
    const style = entry("appearance", "Interface style", "preset design fantasy cyber colors");
    for (const node of originalShell.querySelectorAll(".interfacePreviewIntro, #interfaceStyle, #interfacePreviewGrid")) move(node, style);
    move(document.getElementById("themePresetControls"), entry("appearance", "Theme colors", "colour ocean forest sunset lavender slate crimson gold midnight"));
    moveRow("themeModeToggle", "appearance", "Light and dark", "mode");
    moveRow("interfaceDensity", "appearance", "Spacing", "density compact comfortable");
    moveRow("cornerStyle", "appearance", "Card corners", "soft rounded sharp");
    moveRow("reduceMotion", "appearance", "Movement", "animation reduce motion");
    moveRow("backgroundStrength", "appearance", "Background intensity", "glow strength");
    move(document.getElementById("backgroundPresetControls"), entry("appearance", "Animated environment", "background aurora stars matrix embers ocean geometry"));
    moveRow("toastNotificationsEnabled", "notifications", "Action confirmations", "toast notifications errors");
    moveRow("toastDuration", "notifications", "Message duration", "toast seconds time");
    const boss = entry("notifications", "Boss notifications", "volume sound alarm test TTS speech voices add voices desktop master first alert");
    boss.append(make("p", "", "Adjust alert timing, volume, voices, and sound tests in the Home notification panel."));
    action(boss, "Open boss notification settings", () => activateView("homeView", () => {
      if (document.getElementById("bossNotifyPanel")?.classList.contains("isCollapsed")) document.getElementById("bossNotifyCollapse")?.click();
      document.getElementById("bossNotifyPanel")?.scrollIntoView({ block: "center", behavior: "auto" });
      document.getElementById("bossMasterNotifications")?.focus({ preventScroll: true });
    }));
    const weekly = entry("notifications", "Weekly reminders", "weeklies weekly desktop reminders reset days");
    weekly.append(make("p", "", "Choose activities and reminders in Weeklies. First-time setup stays unchanged."));
    action(weekly, "Open weekly reminders", () => activateView("weekliesView", () => {
      const button = document.getElementById("weekliesOpenSettings");
      if (button?.getClientRects().length) button.click();
      else document.getElementById("weekliesOnboardingSearch")?.focus();
    }));
    moveRow("backgroundMarketUpdatesEnabled", "data", "Background market history", "collect collection update closed scheduler last successful");
    moveRow("refreshBackgroundMarketStatus", "data", "Background update status", "refresh last run task scheduler");
    const updates = entry("data", "Application updates", "version install release github");
    const updateText = make("p", "", "Check for a new release. Downloads still use the existing verified updater."); updateText.setAttribute("role", "status");
    updates.append(updateText);
    const check = action(updates, "Check for updates", async () => {
      check.disabled = true; updateText.textContent = "Checking for updates…";
      try {
        const info = await bridgeCall("checkForUpdates");
        if (!info || info.error || info.checkFailed) throw new Error(info?.error || info?.message || "No update information was returned.");
        if (typeof applyUpdateStatus === "function") applyUpdateStatus(info);
        updateText.textContent = info.updateAvailable ? `Version ${info.latestVersion || "new"} is available. Use Update now in the bottom bar to install it.` : "You are up to date.";
      } catch (error) { updateText.textContent = `Could not check for updates. ${error.message || "Please try again."}`; }
      finally { check.disabled = false; }
    });
    master.addEventListener("change", () => save({ enabled: master.checked }));
    textSize.addEventListener("change", () => save({ textSize: textSize.value }));
    calm.addEventListener("change", () => save({ calmSurfaces: calm.checked }));
    search.addEventListener("input", filterSettings);
    search.addEventListener("keydown", event => { if (event.key === "Escape") { search.value = ""; filterSettings(); } });
    apply();
  }
  window.BshUiRefresh = Object.freeze({ settings: () => ({ ...prefs }), isEnabled: () => prefs.enabled, save, notifyError, normalize, matches });
  apply();
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount, { once: true });
  else mount();
})();
