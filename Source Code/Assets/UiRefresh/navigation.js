/* Optional navigation refresh. Bundled-data search only; no remote search or
   existing preference migrations. Turning the refresh off restores the DOM. */
(() => {
  "use strict";
  const STORAGE_KEY = "bsh.uiRefresh.navigation.v1";
  const RESULT_LIMIT = 24;
  const normalize = value => String(value ?? "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const escape = value => String(value ?? "").replace(/[&<>"']/g, character => ({"&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"}[character]));

  function normalizePreferences(value, tools) {
    const ids = tools.map(tool => String(tool.id));
    const safe = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    const uniqueIds = list => Array.isArray(list) ? [...new Set(list.filter(id => typeof id === "string" && ids.includes(id)))] : [];
    const order = uniqueIds(safe.order), favorites = uniqueIds(safe.favorites);
    return {order:[...order, ...ids.filter(id => !order.includes(id))], favorites, favoritesOnly:safe.favoritesOnly === true && favorites.length > 0};
  }

  function moveTool(order, id, direction) {
    const result = [...order], index = result.indexOf(id), next = index + (direction < 0 ? -1 : 1);
    if (index >= 0 && next >= 0 && next < result.length) [result[index], result[next]] = [result[next], result[index]];
    return result;
  }

  function buildIndex(tools, zones = [], data = null) {
    const index = tools.map(tool => ({kind:"tab", id:tool.id, name:tool.name, detail:"Application tool", view:tool.id, search:normalize(`${tool.name} ${tool.aliases || ""}`)}));
    for (const zone of zones) {
      if (!zone?.id || !zone?.name) continue;
      index.push({kind:"zone", id:String(zone.id), name:String(zone.name), detail:String(zone.zone || "Grind zone"), view:"grindTrackerView", search:normalize(`${zone.name} ${zone.zone || ""} ${zone.primaryTrash || ""}`)});
    }
    for (const recipe of data?.recipes || []) {
      const output = data.items?.[recipe.outputId];
      if (!recipe?.id || !output?.name) continue;
      index.push({kind:"recipe", id:String(recipe.id), name:String(output.name), detail:String(recipe.station || recipe.type || "Recipe"), recipeType:recipe.type, view:"recipeBookView", search:normalize(`${output.name} ${recipe.station || ""} ${recipe.type || ""}`)});
    }
    return index;
  }

  function searchEntries(index, query, limit = RESULT_LIMIT) {
    const normalized = normalize(query), tokens = normalized.split(" ").filter(Boolean), cap = Math.max(1, Math.min(50, Number(limit) || RESULT_LIMIT));
    if (!tokens.length) return index.filter(entry => entry.kind === "tab").slice(0, cap);
    const matches = [];
    for (const entry of index) {
      if (!tokens.every(token => entry.search.includes(token))) continue;
      const name = normalize(entry.name);
      matches.push({entry, score:(name === normalized ? 100 : name.startsWith(normalized) ? 60 : name.includes(normalized) ? 30 : 0) + (entry.kind === "tab" ? 10 : 0)});
    }
    matches.sort((a, b) => b.score - a.score || a.entry.name.localeCompare(b.entry.name) || a.entry.detail.localeCompare(b.entry.detail));
    return matches.slice(0, cap).map(match => match.entry);
  }

  // Keeping route decisions separate makes exact-ID navigation testable without
  // starting WebView, touching a profile, or making a market request.
  async function navigateToEntry(entry, host) {
    if (!entry || !["tab", "zone", "recipe"].includes(entry.kind)) return false;
    if (!await host.activate(entry.view)) return false;
    if (entry.kind === "zone") await host.selectZone(entry.id);
    if (entry.kind === "recipe") await host.selectRecipe(entry.id);
    return true;
  }

  function hasBlockingModal(root, ownDialogs = [], readStyle = typeof getComputedStyle === "function" ? getComputedStyle : null) {
    // Existing tools include non-native modal overlays whose document-level
    // Escape/Tab handlers must not run underneath the command palette.
    return [...root.querySelectorAll('dialog[open],[role="dialog"],[aria-modal="true"]')].some(element => {
      if (ownDialogs.includes(element) || element.hidden || element.closest('[hidden],[aria-hidden="true"]') || !element.getClientRects().length) return false;
      const style = readStyle?.(element);
      return !style || (style.display !== "none" && style.visibility !== "hidden" && style.visibility !== "collapse");
    });
  }

  const api = {normalizePreferences, moveTool, buildIndex, searchEntries, navigateToEntry, hasBlockingModal};
  globalThis.BshNavigationRefresh = Object.freeze(api);
  if (typeof document === "undefined") return;

  function mount() {
    const frame = document.querySelector('.navFrame[data-nav-design="arcane-glass"]'), nav = frame?.querySelector(".appNav");
    if (!frame || !nav || document.getElementById("bshNavToolbar")) return;
    const originals = [...nav.querySelectorAll(".navButton[data-app-view]")].map(element => ({element, hidden:element.hidden}));
    const tools = originals.map(({element}) => ({id:element.dataset.appView, name:element.querySelector(".navLabel")?.textContent.trim() || element.textContent.trim()}));
    const toolMap = new Map(tools.map(tool => [tool.id, tool]));
    const settings = document.getElementById("windowSettings");
    const searchableTools = [...tools, ...(settings ? [{id:"settingsView", name:"Settings", aliases:"appearance notifications theme volume startup text size"}] : [])];
    let preferences;
    try { preferences = normalizePreferences(JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"), tools); }
    catch { preferences = normalizePreferences(null, tools); }
    let enabled = document.body.dataset.uiRefresh !== "off", draft = null, returnFocus = null, dialogGeneration = 0, searchTimer = 0, catalogTimer = 0, closingTimer = 0;
    let recipeData = null, entries = [], results = [], activeResult = -1;

    const toolbar = document.createElement("div");
    toolbar.id = "bshNavToolbar";
    toolbar.className = "bshNavToolbar";
    toolbar.innerHTML = '<div class="bshNavModes" role="group" aria-label="Visible navigation tools"><button type="button" data-bsh-nav-mode="all" aria-pressed="true">All tools</button><button type="button" data-bsh-nav-mode="favorites" aria-pressed="false"><span aria-hidden="true">★</span> Favorites</button></div><button type="button" class="bshNavCustomizeTrigger" aria-haspopup="dialog" aria-controls="bshNavCustomizeDialog" title="Favorite and reorder navigation tools">Customize</button>';
    frame.insertBefore(toolbar, nav);

    const commandDialog = document.createElement("dialog");
    commandDialog.id = "bshCommandDialog";
    commandDialog.className = "bshNavDialog bshCommandDialog";
    commandDialog.setAttribute("aria-labelledby", "bshCommandTitle");
    commandDialog.innerHTML = '<div class="bshNavDialogHead"><div><h2 id="bshCommandTitle">Find anything</h2><p>Jump to a tool, a recipe, or a grind zone.</p></div><button type="button" data-bsh-close aria-label="Close search">×</button></div><label class="bshCommandField" for="bshCommandInput"><span aria-hidden="true">⌕</span><input id="bshCommandInput" type="search" autocomplete="off" spellcheck="false" placeholder="Search tools, recipes &amp; zones…" role="combobox" aria-autocomplete="list" aria-expanded="true" aria-controls="bshCommandResults" aria-describedby="bshCommandStatus" aria-label="Search tools, recipes and grind zones"></label><p id="bshCommandStatus" class="bshCommandStatus" role="status" aria-live="polite"></p><div id="bshCommandResults" class="bshCommandResults" role="listbox" aria-label="Search results"></div><div class="bshCommandFoot"><span><kbd>↑</kbd> <kbd>↓</kbd> to choose</span><span><kbd>Enter</kbd> to open</span><span><kbd>Esc</kbd> to close</span></div>';
    const customizeDialog = document.createElement("dialog");
    customizeDialog.id = "bshNavCustomizeDialog";
    customizeDialog.className = "bshNavDialog bshNavCustomizeDialog";
    customizeDialog.setAttribute("aria-labelledby", "bshNavCustomizeTitle");
    customizeDialog.innerHTML = '<div class="bshNavDialogHead"><div><h2 id="bshNavCustomizeTitle">Make navigation yours</h2><p>Favorite your everyday tools and arrange them your way.</p></div><button type="button" data-bsh-close aria-label="Cancel navigation changes">×</button></div><p class="bshNavCustomizeHint">Every tool stays available in All tools and search.</p><div class="bshNavCustomizeList" role="list" aria-label="Navigation order"></div><p class="bshNavCustomizeStatus" role="status" aria-live="polite"></p><div class="bshNavCustomizeFoot"><button type="button" data-bsh-nav-reset>Restore default order</button><span></span><button type="button" data-bsh-close>Cancel</button><button type="button" class="bshNavPrimary" data-bsh-nav-save>Done</button></div>';
    document.body.append(commandDialog, customizeDialog);
    const input = commandDialog.querySelector("input"), resultList = commandDialog.querySelector(".bshCommandResults"), status = commandDialog.querySelector(".bshCommandStatus");

    function motionReduced() { return document.body.dataset.motion === "reduced" || globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches; }
    function syncOffset() { if (typeof syncFixedChromeOffset === "function") requestAnimationFrame(syncFixedChromeOffset); }
    function persist() {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences)); return true; }
      catch { return false; }
    }
    function applyNavigation() {
      toolbar.hidden = !enabled;
      const order = enabled ? preferences.order : tools.map(tool => tool.id);
      for (const id of order) {
        const original = originals.find(item => item.element.dataset.appView === id);
        if (!original) continue;
        original.element.hidden = enabled ? preferences.favoritesOnly && !preferences.favorites.includes(id) : original.hidden;
        original.element.classList.toggle("bshNavFiltered", enabled && original.element.hidden);
        nav.appendChild(original.element);
      }
      nav.classList.toggle("bshNavPersonalized", enabled && preferences.favoritesOnly);
      toolbar.querySelector('[data-bsh-nav-mode="all"]').setAttribute("aria-pressed", String(!preferences.favoritesOnly));
      const favoritesButton = toolbar.querySelector('[data-bsh-nav-mode="favorites"]');
      favoritesButton.setAttribute("aria-pressed", String(preferences.favoritesOnly));
      favoritesButton.disabled = !preferences.favorites.length;
      favoritesButton.title = preferences.favorites.length ? "Show your favorite tools" : "Choose favorites in Customize first";
      syncOffset();
    }
    function closeDialog(dialog, immediate = false, restore = true) {
      if (!dialog.open) return;
      dialogGeneration++;
      clearTimeout(searchTimer); clearTimeout(catalogTimer); clearTimeout(closingTimer);
      const finish = () => {
        dialog.close(); dialog.classList.remove("bshNavClosing");
        if (restore) {
          const target = returnFocus?.isConnected && !returnFocus.hidden ? returnFocus : originals.find(item => !item.element.hidden)?.element;
          target?.focus({preventScroll:true});
        }
      };
      if (immediate || motionReduced()) finish();
      else { dialog.classList.add("bshNavClosing"); closingTimer = setTimeout(finish, 130); }
    }
    function openDialog(dialog, focusElement) {
      closeDialog(commandDialog, true, false); closeDialog(customizeDialog, true, false);
      returnFocus = document.activeElement;
      dialog.classList.remove("bshNavClosing");
      dialog.showModal(); focusElement.focus({preventScroll:true});
    }
    for (const dialog of [commandDialog, customizeDialog]) {
      dialog.addEventListener("cancel", event => {event.preventDefault(); closeDialog(dialog)});
      dialog.addEventListener("click", event => {
        if (event.target.closest("[data-bsh-close]")) closeDialog(dialog);
        else if (event.target === dialog) {
          const bounds = dialog.getBoundingClientRect();
          if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) closeDialog(dialog);
        }
      });
      dialog.addEventListener("keydown", event => {
        if (event.key !== "Tab") return;
        const focusable = [...dialog.querySelectorAll('button:not([disabled]):not([tabindex="-1"]),input:not([disabled]),select:not([disabled])')].filter(element => element.getClientRects().length);
        const first = focusable[0], last = focusable.at(-1);
        if (event.shiftKey && document.activeElement === first) {event.preventDefault(); last?.focus()}
        else if (!event.shiftKey && document.activeElement === last) {event.preventDefault(); first?.focus()}
      });
    }

    function renderCustomization(focusId = "", action = "") {
      const list = customizeDialog.querySelector(".bshNavCustomizeList");
      list.innerHTML = draft.order.map((id, index) => {
        const tool = toolMap.get(id), favorite = draft.favorites.includes(id);
        return `<div class="bshNavCustomizeRow" role="listitem" data-tool-id="${escape(id)}"><button class="bshNavStar" type="button" data-nav-action="favorite" aria-pressed="${favorite}" aria-label="${favorite ? "Remove" : "Add"} ${escape(tool.name)} ${favorite ? "from" : "to"} favorites" title="${favorite ? "Remove favorite" : "Add favorite"}">${favorite ? "★" : "☆"}</button><span><strong>${escape(tool.name)}</strong><small>Position ${index + 1}${favorite ? " · Favorite" : ""}</small></span><button type="button" data-nav-action="up" aria-label="Move ${escape(tool.name)} up" ${index === 0 ? "disabled" : ""}>↑</button><button type="button" data-nav-action="down" aria-label="Move ${escape(tool.name)} down" ${index === draft.order.length - 1 ? "disabled" : ""}>↓</button></div>`;
      }).join("");
      if (focusId) {
        const row = [...list.children].find(item => item.dataset.toolId === focusId);
        const desired = row?.querySelector(`[data-nav-action="${action}"]`);
        (desired && !desired.disabled ? desired : row?.querySelector('[data-nav-action="favorite"]'))?.focus({preventScroll:true});
      }
    }
    toolbar.querySelector(".bshNavCustomizeTrigger").addEventListener("click", () => {
      if (hasBlockingModal(document, [commandDialog, customizeDialog])) return;
      draft = normalizePreferences(preferences, tools);
      renderCustomization(); customizeDialog.querySelector(".bshNavCustomizeStatus").textContent = "";
      openDialog(customizeDialog, customizeDialog.querySelector("[data-bsh-close]"));
    });
    customizeDialog.addEventListener("click", event => {
      const actionButton = event.target.closest("[data-nav-action]"), row = actionButton?.closest("[data-tool-id]");
      if (row) {
        const id = row.dataset.toolId, action = actionButton.dataset.navAction;
        if (action === "favorite") draft.favorites = draft.favorites.includes(id) ? draft.favorites.filter(value => value !== id) : [...draft.favorites, id];
        else draft.order = moveTool(draft.order, id, action === "up" ? -1 : 1);
        customizeDialog.querySelector(".bshNavCustomizeStatus").textContent = action === "favorite" ? `${toolMap.get(id).name} ${draft.favorites.includes(id) ? "added to" : "removed from"} favorites.` : `${toolMap.get(id).name} moved to position ${draft.order.indexOf(id) + 1}.`;
        renderCustomization(id, action);
      }
      if (event.target.closest("[data-bsh-nav-reset]")) {
        draft.order = tools.map(tool => tool.id); renderCustomization();
        customizeDialog.querySelector(".bshNavCustomizeStatus").textContent = "Default order restored. Your favorites are kept. Press Done to save.";
      }
      if (event.target.closest("[data-bsh-nav-save]")) {
        const previous = preferences;
        preferences = normalizePreferences(draft, tools);
        if (!persist()) {
          preferences = previous;
          customizeDialog.querySelector(".bshNavCustomizeStatus").textContent = "Navigation could not be saved. Your previous choices are unchanged.";
          return;
        }
        applyNavigation(); closeDialog(customizeDialog);
      }
    });
    toolbar.querySelectorAll("[data-bsh-nav-mode]").forEach(button => button.addEventListener("click", () => {
      const previous = preferences.favoritesOnly;
      preferences.favoritesOnly = button.dataset.bshNavMode === "favorites" && preferences.favorites.length > 0;
      if (!persist()) {
        preferences.favoritesOnly = previous;
        if (typeof NotificationService !== "undefined") NotificationService.ShowError("Navigation could not be saved. Your previous choices are unchanged.", "Navigation");
        return;
      }
      applyNavigation();
    }));

    function rebuildIndex() {
      const current = typeof recipeBookState !== "undefined" ? recipeBookState.data : null;
      if (entries.length && current === recipeData) return;
      recipeData = current;
      entries = buildIndex(searchableTools, typeof GRIND_SPOTS !== "undefined" ? GRIND_SPOTS : [], current);
    }
    function setActiveResult(index) {
      activeResult = results.length ? (index + results.length) % results.length : -1;
      [...resultList.children].forEach((element, position) => element.setAttribute("aria-selected", String(position === activeResult)));
      if (activeResult < 0) input.removeAttribute("aria-activedescendant");
      else {
        input.setAttribute("aria-activedescendant", `bshCommandResult-${activeResult}`);
        resultList.children[activeResult]?.scrollIntoView({block:"nearest"});
      }
    }
    function renderSearch() {
      rebuildIndex();
      results = searchEntries(entries, input.value);
      const kindLabels = {tab:"Tool", zone:"Grind zone", recipe:"Recipe"};
      resultList.innerHTML = results.map((entry, index) => `<button type="button" id="bshCommandResult-${index}" class="bshCommandResult" role="option" tabindex="-1" aria-selected="false" data-result-index="${index}"><span class="bshCommandKind" aria-hidden="true">${entry.kind === "tab" ? "◇" : entry.kind === "zone" ? "⚔" : "▤"}</span><span><strong>${escape(entry.name)}</strong><small>${escape(entry.detail)} · ${kindLabels[entry.kind]}</small></span><span class="bshCommandEnter" aria-hidden="true">↵</span></button>`).join("");
      const loading = typeof recipeBookState !== "undefined" && recipeBookState.loading;
      const base = results.length ? `${results.length === RESULT_LIMIT ? "Top " : ""}${results.length} result${results.length === 1 ? "" : "s"}${results.length === RESULT_LIMIT ? " · keep typing to narrow your search" : ""}.` : "No results. Try a shorter name or a different word.";
      status.textContent = `${base}${loading ? " Loading bundled recipes…" : !recipeData ? " Recipes unavailable; open Recipe Book to retry." : ""}`;
      setActiveResult(0);
    }
    function pollRecipeCatalog(generation) {
      if (!commandDialog.open || generation !== dialogGeneration || !enabled) return;
      const current = typeof recipeBookState !== "undefined" ? recipeBookState : null;
      if (current?.data !== recipeData || !current?.loading) renderSearch();
      if (current?.loading) catalogTimer = setTimeout(() => pollRecipeCatalog(generation), 150);
    }
    function openSearch() {
      if (!enabled) return;
      if (hasBlockingModal(document, [commandDialog, customizeDialog])) return;
      input.value = "";
      openDialog(commandDialog, input);
      if (typeof initializeRecipeBook === "function") initializeRecipeBook();
      renderSearch(); pollRecipeCatalog(dialogGeneration);
    }
    const host = {
      async activate(view) {
        const target = document.getElementById(view), button = document.querySelector(`[data-app-view="${view}"]`);
        if (!target || !button || typeof activateAppView !== "function") return false;
        activateAppView(button);
        const started = performance.now();
        while (!target.classList.contains("active") && performance.now() - started < 2200) await new Promise(resolve => setTimeout(resolve, 30));
        return target.classList.contains("active");
      },
      async selectZone(id) {
        if (typeof GRIND_SPOTS === "undefined" || !GRIND_SPOTS.some(zone => String(zone.id) === id)) throw new Error("This grind zone is no longer available.");
        grindSelectSpot(id);
        // The existing picker schedules its own focus on opening. Let it finish
        // before focusing the selected view so no hidden search retains focus.
        setTimeout(() => document.getElementById("grindChangeZone")?.focus({preventScroll:true}), 45);
      },
      async selectRecipe(id) {
        const data = typeof recipeBookState !== "undefined" ? recipeBookState.data : null;
        const recipe = data?.recipes.find(value => String(value.id) === id);
        if (!recipe) throw new Error("This recipe is not available. Open Recipe Book to reload its catalog.");
        recipeBookState.mode = "name"; recipeBookState.type = recipe.type;
        if (recipeBookEl.type) recipeBookEl.type.value = recipe.type;
        if (recipeBookEl.search) recipeBookEl.search.value = data.items[recipe.outputId].name;
        document.querySelectorAll('input[name="recipeBookMode"]').forEach(element => {element.checked = element.value === "name"});
        recipeBookSetSection("catalog"); recipeBookSetMode("name"); recipeBookApplySearch();
        const index = recipeBookState.filtered.findIndex(value => String(value.id) === id);
        if (index >= 0) recipeBookState.page = Math.floor(index / RECIPE_BOOK_PAGE_SIZE) + 1;
        recipeBookRender();
        recipeBookEl.search?.focus({preventScroll:true});
        window.dispatchEvent(new CustomEvent("bsh:recipe-open", {detail:{recipeId:id}}));
      }
    };
    async function chooseResult(index) {
      const entry = results[index];
      if (!entry) return;
      closeDialog(commandDialog, true, false);
      try {
        if (!await navigateToEntry(entry, host)) returnFocus?.focus({preventScroll:true});
        if (entry.kind === "tab") {
          const view = document.getElementById(entry.view);
          view?.setAttribute("tabindex", "-1"); view?.focus({preventScroll:true});
        }
      } catch (error) {
        if (typeof NotificationService !== "undefined") NotificationService.ShowError(error?.message || "This result could not be opened.", "Search");
      }
    }
    input.addEventListener("input", () => {clearTimeout(searchTimer); searchTimer = setTimeout(() => {searchTimer = 0; renderSearch()}, 60)});
    input.addEventListener("keydown", event => {
      if (["ArrowDown", "ArrowUp"].includes(event.key)) {event.preventDefault(); setActiveResult(activeResult + (event.key === "ArrowDown" ? 1 : -1))}
      else if (event.key === "Enter") {event.preventDefault(); clearTimeout(searchTimer); if (searchTimer) renderSearch(); searchTimer = 0; chooseResult(Math.max(0, activeResult))}
    });
    resultList.addEventListener("pointerdown", event => {if (event.target.closest("[data-result-index]")) event.preventDefault()});
    resultList.addEventListener("click", event => {const button = event.target.closest("[data-result-index]"); if (button) chooseResult(Number(button.dataset.resultIndex))});
    document.addEventListener("keydown", event => {
      if (!enabled || event.isComposing || event.altKey || !(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "k") return;
      event.preventDefault();
      if (commandDialog.open) input.focus(); else openSearch();
    });
    document.addEventListener("bsh:ui-refresh", event => {
      enabled = event.detail?.enabled !== false;
      if (!enabled) {closeDialog(commandDialog, true, false); closeDialog(customizeDialog, true, false)}
      applyNavigation();
    });
    applyNavigation();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount, {once:true});
  else mount();
})();
