/* Optional, reversible presentation enhancements. Existing weekly persistence,
   reset policies, recipe calculations and inventory remain authoritative. */
(() => {
  "use strict";
  /* UI_WEEKLIES_RECIPES_CORE_START */
  const BULK_UNDO_WINDOW_MS = 60000;
  function uiRecipeIds(value) {
    return [...new Set((Array.isArray(value) ? value : []).filter(id => typeof id === "string" && id.length > 0 && id.length <= 180))].slice(0, 1000);
  }
  function uiRecentRecipeSearches(value) {
    const result = [], seen = new Set();
    for (const entry of Array.isArray(value) ? value : []) {
      const query = typeof entry?.query === "string" ? entry.query.trim().slice(0, 180) : "";
      const mode = entry?.mode === "ingredient" ? "ingredient" : "name";
      const type = typeof entry?.type === "string" ? entry.type.slice(0, 80) : "";
      const key = JSON.stringify([query.toLocaleLowerCase(), mode, type]);
      if (!query || seen.has(key)) continue;
      seen.add(key); result.push({query, mode, type});
      if (result.length === 6) break;
    }
    return result;
  }
  function uiWeeklyPreferences(value) {
    return {remainingOnly: value?.remainingOnly !== false, sort: value?.sort === "route" ? "route" : "reset"};
  }
  function uiWeeklyOrder(tasks, sort, now, isDone, target) {
    const result = tasks.map((task, index) => ({task, index}));
    if (sort === "reset") result.sort((left, right) => {
      const doneDifference = Number(isDone(left.task, now)) - Number(isDone(right.task, now));
      const leftTarget = target(left.task, now), rightTarget = target(right.task, now);
      return doneDifference || (leftTarget ? +leftTarget : Infinity) - (rightTarget ? +rightTarget : Infinity) || left.index - right.index;
    });
    return result.map(entry => entry.task);
  }
  function uiCreateBulkUndo(tasks, now, isDone, periodKey) {
    return {createdAt: +now, expiresAt: +now + BULK_UNDO_WINDOW_MS,
      entries: tasks.filter(task => !isDone(task, now)).map(task => ({id: task.id, value: periodKey(task, now), rolling: task.reset === "rolling120"}))};
  }
  function uiApplyBulkUndo(snapshot, current, selectedIds, now, lookup, periodKey) {
    const doneById = {...current}, undoneIds = [], selected = new Set(selectedIds);
    if (!snapshot || +now < snapshot.createdAt || +now >= snapshot.expiresAt) return {doneById, undoneIds};
    for (const entry of snapshot.entries) {
      const task = lookup.get(entry.id);
      if (!task || !selected.has(entry.id) || doneById[entry.id] !== entry.value) continue;
      if (entry.rolling ? Date.parse(entry.value) + 120 * 3600000 <= +now : periodKey(task, now) !== entry.value) continue;
      // Only newly completed entries are undone. An obsolete previous-period
      // value is never restored, and manual changes are invalidated separately.
      delete doneById[entry.id]; undoneIds.push(entry.id);
    }
    return {doneById, undoneIds};
  }
  /* UI_WEEKLIES_RECIPES_CORE_END */

  const enabled = () => document.body?.dataset.uiRefresh === "on";
  const reducedMotion = () => document.body?.dataset.motion === "reduced" || window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  const read = (key, fallback) => {try {return readSetting(key, fallback);} catch {return fallback;}};
  const save = (key, value) => {persistSetting(key, value); flushSetting(key);};
  const state = {
    weekly: uiWeeklyPreferences(read("uiWeeklyFocus", {})),
    compact: read("uiRecipeCompact", false) === true,
    favorites: new Set(uiRecipeIds(read("uiRecipeFavorites", []))),
    favoritesOnly: false,
    recentSearches: uiRecentRecipeSearches(read("uiRecipeRecentSearches", [])),
    undo: null, undoTimer: null, lastDone: new Map(), motionTimers: new Map(), weeklyFocusId: "",
    drawer: null, drawerRecipeId: "", drawerCraftable: false, drawerReturnFocus: null, drawerCloseTimer: null,
    weeklyToolbar: null, weeklyEmpty: null, recipeToolbar: null, craftableToolbar: null
  };

  function makeElement(tag, className, markup) {
    const element = document.createElement(tag); element.className = className;
    if (markup !== undefined) element.innerHTML = markup;
    return element;
  }
  function undoButtonState() {
    const button = state.weeklyToolbar?.querySelector("[data-ui-weekly-undo]");
    if (button) button.hidden = !state.undo?.entries.length || Date.now() >= state.undo.expiresAt;
  }
  function beforeAllDone(tasks, now) {
    if (!enabled()) return;
    state.undo = uiCreateBulkUndo(tasks, now, weeklyTaskIsDone, weeklyTaskPeriodKey);
    state.weeklyFocusId = "__all__";
    clearTimeout(state.undoTimer);
    state.undoTimer = setTimeout(() => {state.undo = null; undoButtonState();}, BULK_UNDO_WINDOW_MS);
    undoButtonState();
  }
  function weeklyTouched(id) {
    if (enabled()) state.weeklyFocusId = id;
    if (state.undo) state.undo.entries = state.undo.entries.filter(entry => entry.id !== id);
    undoButtonState();
  }
  function undoAllDone() {
    if (!enabled()) return;
    const result = uiApplyBulkUndo(state.undo, weeklySettings.doneById, weeklySettings.selectedIds, new Date(), WEEKLY_CATALOG_BY_ID, weeklyTaskPeriodKey);
    state.undo = null; clearTimeout(state.undoTimer); undoButtonState();
    if (!result.undoneIds.length) {
      weeklyAnnounce("There is nothing left to undo. A reset or a later change was preserved.");
      return;
    }
    weeklySettings.doneById = result.doneById;
    persistWeeklyState();
    weeklyAnnounce(`Undid All done for ${result.undoneIds.length} activities. Existing completions and later changes were preserved.`);
    state.weeklyToolbar?.querySelector("[data-ui-weekly-remaining]")?.focus();
  }
  function ensureWeeklyToolbar() {
    const dashboard = document.getElementById("weekliesDashboard"), list = document.getElementById("weekliesDashboardList");
    if (!dashboard || !list || state.weeklyToolbar) return;
    const toolbar = makeElement("div", "bshWeeklyFocusToolbar", '<label class="bshUiCheck"><input type="checkbox" data-ui-weekly-remaining><span>Remaining only</span></label><label class="bshUiInlineSelect"><span>Sort by</span><select data-ui-weekly-sort aria-label="Sort weekly activities"><option value="reset">Nearest reset</option><option value="route">My route order</option></select></label><span class="bshWeeklyFocusCount" data-ui-weekly-count></span><button type="button" data-ui-weekly-undo hidden title="Undo the last All done action for 60 seconds">↶ Undo All done</button>');
    toolbar.querySelector("[data-ui-weekly-remaining]").checked = state.weekly.remainingOnly;
    toolbar.querySelector("[data-ui-weekly-sort]").value = state.weekly.sort;
    toolbar.addEventListener("change", event => {
      if (event.target.matches("[data-ui-weekly-remaining]")) state.weekly.remainingOnly = event.target.checked;
      if (event.target.matches("[data-ui-weekly-sort]")) state.weekly.sort = event.target.value === "route" ? "route" : "reset";
      save("uiWeeklyFocus", state.weekly); renderWeeklyDashboard();
    });
    toolbar.addEventListener("click", event => {if (event.target.closest("[data-ui-weekly-undo]")) undoAllDone();});
    dashboard.insertBefore(toolbar, list); state.weeklyToolbar = toolbar;
    state.weeklyEmpty = makeElement("div", "bshWeeklyFocusEmpty", '<span aria-hidden="true">✓</span><strong>Everything on your route is complete</strong><p>Activities return automatically when their own reset arrives.</p><button type="button" data-ui-weekly-show-all>Show completed activities</button>');
    state.weeklyEmpty.hidden = true; dashboard.insertBefore(state.weeklyEmpty, list);
    state.weeklyEmpty.addEventListener("click", event => {
      if (!event.target.closest("[data-ui-weekly-show-all]")) return;
      state.weekly.remainingOnly = false; save("uiWeeklyFocus", state.weekly);
      toolbar.querySelector("[data-ui-weekly-remaining]").checked = false; renderWeeklyDashboard();
    });
  }
  function afterWeeklyRender(now = new Date()) {
    ensureWeeklyToolbar();
    for (const timer of state.motionTimers.values()) clearTimeout(timer);
    state.motionTimers.clear();
    if (state.weeklyToolbar) state.weeklyToolbar.hidden = !enabled();
    if (state.weeklyEmpty) state.weeklyEmpty.hidden = true;
    if (!enabled()) {state.lastDone.clear(); state.weeklyFocusId = ""; return;}
    const tasks = weeklySelectedTasks(), list = document.getElementById("weekliesDashboardList"), grid = list?.querySelector(".weekliesDashboardGrid");
    const ordered = uiWeeklyOrder(tasks, state.weekly.sort, now, weeklyTaskIsDone, weeklyTaskTarget);
    let remaining = 0;
    for (const task of ordered) {
      const card = [...(grid?.children || [])].find(element => element.dataset.weeklyTask === task.id);
      const done = weeklyTaskIsDone(task, now), justCompleted = done && state.lastDone.get(task.id) === false;
      if (!done) remaining++;
      if (card) {
        grid.appendChild(card);
        card.querySelector(".bshWeeklyDoneLabel")?.remove();
        if (done) card.querySelector(".weeklyTaskCopy")?.appendChild(makeElement("span", "bshWeeklyDoneLabel", "✓ Done"));
        const hide = () => {
          card.hidden = state.weekly.remainingOnly && done;
          if (card.hidden && card.contains(document.activeElement)) state.weeklyToolbar?.querySelector("[data-ui-weekly-remaining]")?.focus();
        };
        if (justCompleted && !reducedMotion() && card.animate) {
          card.animate([{opacity: 1, transform: "translateY(0)"}, {opacity: 0.5, transform: "translateY(5px)"}], {duration: 220, easing: "ease-out"});
          state.motionTimers.set(task.id, setTimeout(hide, 220));
        } else hide();
      }
      state.lastDone.set(task.id, done);
    }
    const count = state.weeklyToolbar?.querySelector("[data-ui-weekly-count]");
    if (count) count.textContent = tasks.length ? `${remaining} remaining · ${tasks.length - remaining} complete` : "";
    if (state.weeklyEmpty) state.weeklyEmpty.hidden = !(tasks.length && !remaining && state.weekly.remainingOnly);
    undoButtonState();
    if (state.weeklyFocusId) {
      const focusId = state.weeklyFocusId; state.weeklyFocusId = "";
      const nextTask = state.weekly.remainingOnly ? ordered.find(task => !weeklyTaskIsDone(task, now)) : ordered.find(task => task.id === focusId);
      const nextCard = [...(grid?.children || [])].find(card => card.dataset.weeklyTask === nextTask?.id);
      const undo = state.weeklyToolbar?.querySelector("[data-ui-weekly-undo]");
      const target = focusId === "__all__" && undo && !undo.hidden ? undo : nextCard?.querySelector("[data-weekly-toggle-done]") || state.weeklyToolbar?.querySelector("[data-ui-weekly-remaining]");
      target?.focus();
    }
  }

  function recipeFilter(recipes) {
    return enabled() && state.favoritesOnly ? recipes.filter(recipe => state.favorites.has(recipe.id)) : recipes;
  }
  function refreshFavoriteButtons() {
    for (const button of document.querySelectorAll("[data-ui-recipe-favorite]")) {
      const favorite = state.favorites.has(button.dataset.uiRecipeFavorite), name = button.dataset.recipeName || "recipe";
      button.setAttribute("aria-pressed", String(favorite)); button.textContent = favorite ? "★ Saved" : "☆ Favorite";
      button.setAttribute("aria-label", `${favorite ? "Remove" : "Add"} ${name} ${favorite ? "from" : "to"} favorite recipes`);
    }
    const button = state.recipeToolbar?.querySelector("[data-ui-recipe-favorites-only]");
    if (button) {button.setAttribute("aria-pressed", String(state.favoritesOnly)); button.textContent = state.favoritesOnly ? "★ Favorites only" : `☆ Favorites (${state.favorites.size})`;}
  }
  function toggleFavorite(id) {
    if (!recipeBookState.data?.recipes.some(recipe => recipe.id === id)) return;
    state.favorites.has(id) ? state.favorites.delete(id) : state.favorites.add(id);
    save("uiRecipeFavorites", [...state.favorites]); refreshFavoriteButtons();
    if (state.favoritesOnly) recipeBookRender();
  }
  function recipeActionsMarkup(recipe, craftable, details = true) {
    const name = recipeBookState.data.items[recipe.outputId]?.name || "Recipe";
    return `<div class="bshRecipeCardActions"><button type="button" data-ui-recipe-favorite="${escapeHtml(recipe.id)}" data-recipe-name="${escapeHtml(name)}"></button>${details ? `<button type="button" class="bshRecipeOpen" data-ui-recipe-open="${escapeHtml(recipe.id)}" data-ui-recipe-craftable="${craftable}" aria-haspopup="dialog">${craftable ? "Ingredients & plan" : "View ingredients"}<span aria-hidden="true"> →</span></button>` : ""}</div>`;
  }
  function decorateRecipes(grid, craftable) {
    if (!grid) return;
    grid.classList.toggle("bshRecipeCompactGrid", enabled() && state.compact);
    for (const old of grid.querySelectorAll(".bshRecipeCardActions")) old.remove();
    if (!enabled() || !recipeBookState.data) return;
    for (const card of grid.querySelectorAll(".recipeBookCard[data-recipe-id]")) {
      const recipe = recipeBookState.data.recipes.find(entry => entry.id === card.dataset.recipeId);
      if (recipe) card.insertAdjacentHTML("beforeend", recipeActionsMarkup(recipe, craftable));
    }
    refreshFavoriteButtons();
  }
  function renderRecentSearches() {
    const select = state.recipeToolbar?.querySelector("[data-ui-recipe-recent]");
    if (!select) return;
    select.innerHTML = '<option value="">Recent searches</option>' + state.recentSearches.map((entry, index) => `<option value="${index}">${escapeHtml(entry.query)}${entry.mode === "ingredient" ? " · ingredient" : ""}</option>`).join("");
    select.disabled = !state.recentSearches.length;
    const clear = state.recipeToolbar.querySelector("[data-ui-recipe-clear-recent]");
    if (clear) clear.disabled = !state.recentSearches.length;
  }
  function rememberSearch() {
    if (!enabled()) return;
    const entry = {query: recipeBookEl.search?.value || "", mode: recipeBookState.mode, type: recipeBookState.type};
    if (!entry.query.trim()) return;
    state.recentSearches = uiRecentRecipeSearches([entry, ...state.recentSearches]);
    save("uiRecipeRecentSearches", state.recentSearches); renderRecentSearches();
  }
  function setCompact(compact) {
    state.compact = Boolean(compact); save("uiRecipeCompact", state.compact);
    afterRecipeRender(); afterCraftableRender();
  }
  function refreshCompactButtons() {
    for (const toolbar of [state.recipeToolbar, state.craftableToolbar]) {
      const button = toolbar?.querySelector("[data-ui-recipe-compact]");
      if (button) {button.setAttribute("aria-pressed", String(state.compact)); button.textContent = state.compact ? "▤ Compact view" : "▦ Detailed view";}
    }
  }
  function ensureRecipeToolbars() {
    const grid = document.getElementById("recipeBookGrid"), craftableGrid = document.getElementById("recipeBookCraftableGrid");
    if (grid && !state.recipeToolbar) {
      const toolbar = makeElement("div", "bshRecipeToolbar", '<button type="button" data-ui-recipe-compact aria-pressed="true">▤ Compact view</button><button type="button" data-ui-recipe-favorites-only aria-pressed="false">☆ All recipes</button><label class="bshUiInlineSelect"><span class="srOnly">Recent recipe searches</span><select data-ui-recipe-recent aria-label="Recent recipe searches"><option value="">Recent searches</option></select></label><button type="button" data-ui-recipe-clear-recent title="Clear saved recipe search history">Clear history</button>');
      grid.parentNode.insertBefore(toolbar, grid); state.recipeToolbar = toolbar;
      toolbar.addEventListener("click", event => {
        if (event.target.closest("[data-ui-recipe-compact]")) setCompact(!state.compact);
        if (event.target.closest("[data-ui-recipe-favorites-only]")) {state.favoritesOnly = !state.favoritesOnly; recipeBookState.page = 1; recipeBookRender();}
        if (event.target.closest("[data-ui-recipe-clear-recent]")) {state.recentSearches = []; save("uiRecipeRecentSearches", []); renderRecentSearches();}
      });
      toolbar.addEventListener("change", event => {
        if (!event.target.matches("[data-ui-recipe-recent]") || event.target.value === "") return;
        const entry = state.recentSearches[Number(event.target.value)]; if (!entry) return;
        recipeBookState.type = recipeBookState.data?.types.includes(entry.type) ? entry.type : "";
        if (recipeBookEl.type) recipeBookEl.type.value = recipeBookState.type;
        if (recipeBookEl.search) recipeBookEl.search.value = entry.query;
        for (const radio of recipeBookEl.mode?.querySelectorAll('input[name="recipeBookMode"]') || []) radio.checked = radio.value === entry.mode;
        recipeBookSetMode(entry.mode); recipeBookApplySearch(); rememberSearch(); recipeBookEl.search?.focus();
      });
      recipeBookEl.form?.addEventListener("submit", rememberSearch);
      recipeBookEl.search?.addEventListener("blur", rememberSearch);
      renderRecentSearches();
    }
    if (craftableGrid && !state.craftableToolbar) {
      const toolbar = makeElement("div", "bshRecipeToolbar", '<button type="button" data-ui-recipe-compact aria-pressed="true">▤ Compact view</button><span>Open a recipe to review its ingredients and plan craft quantities.</span>');
      craftableGrid.parentNode.insertBefore(toolbar, craftableGrid); state.craftableToolbar = toolbar;
      toolbar.addEventListener("click", event => {if (event.target.closest("[data-ui-recipe-compact]")) setCompact(!state.compact);});
    }
    for (const toolbar of [state.recipeToolbar, state.craftableToolbar]) if (toolbar) toolbar.hidden = !enabled();
    refreshCompactButtons();
  }
  function afterRecipeRender() {
    ensureRecipeToolbars(); decorateRecipes(recipeBookEl.grid, false);
    if (enabled() && state.favoritesOnly && recipeBookState.data && !recipeBookState.filtered.length) {
      const empty = recipeBookEl.grid?.querySelector(".recipeBookEmpty");
      if (empty) {empty.querySelector("strong").textContent = "No favorite recipes match"; empty.querySelector("p").textContent = "Turn off Favorites only to save more recipes, or clear the current search and category.";}
    }
  }
  function afterCraftableRender() {ensureRecipeToolbars(); decorateRecipes(recipeBookEl.craftableGrid, true);}
  function ensureDrawer() {
    if (state.drawer) return state.drawer;
    const dialog = makeElement("dialog", "bshRecipeDrawer", '<div class="bshRecipeDrawerSurface"><header class="bshRecipeDrawerHeader"><div><span>Recipe details</span><h2 id="bshRecipeDrawerTitle"></h2></div><button type="button" data-ui-recipe-close aria-label="Close recipe details">×</button></header><div class="bshRecipeDrawerBody"></div><footer><p>Planning quantities does not consume or change My Resources.</p></footer></div>');
    dialog.setAttribute("aria-labelledby", "bshRecipeDrawerTitle");
    document.body.appendChild(dialog); state.drawer = dialog;
    dialog.addEventListener("cancel", event => {event.preventDefault(); closeDrawer();});
    dialog.addEventListener("click", event => {if (event.target === dialog || event.target.closest("[data-ui-recipe-close]")) closeDrawer();});
    dialog.addEventListener("input", event => {const control = event.target.closest("[data-craft-plan-range],[data-craft-plan-number]"); if (control) recipeBookUpdateCraftPlanner(control);});
    dialog.addEventListener("change", event => {const control = event.target.closest("[data-craft-plan-range],[data-craft-plan-number]"); if (control) recipeBookUpdateCraftPlanner(control, {commit: true});});
    dialog.addEventListener("load", event => recipeBookFitIcon(event.target), true);
    dialog.addEventListener("error", event => {if (event.target instanceof HTMLImageElement) {event.target.hidden = true; event.target.closest(".recipeBookItemIcon")?.classList.add("iconMissing");}}, true);
    return dialog;
  }
  function openRecipe(id, craftable = false, returnFocus = document.activeElement) {
    if (!enabled() || !recipeBookState.data) return false;
    const recipe = recipeBookState.data.recipes.find(entry => entry.id === id); if (!recipe) return false;
    recipeBookHideTooltip();
    const drawer = ensureDrawer(), output = recipeBookState.data.items[recipe.outputId];
    clearTimeout(state.drawerCloseTimer); state.drawerRecipeId = id; state.drawerCraftable = craftable; state.drawerReturnFocus = returnFocus;
    let markup = recipeBookCardMarkup(recipe, recipeBookSearchTokens(recipeBookState.query));
    const maxCrafts = recipeBookRecipeCraftCount(recipe, recipeBookState.resources, recipeBookState.data);
    if (maxCrafts > 0) markup = recipeBookCraftableCardMarkup({recipe, maxCrafts, requirements: recipeBookRecipeRequirements(recipe, recipeBookState.resources, recipeBookState.data)});
    drawer.querySelector("#bshRecipeDrawerTitle").textContent = output.name;
    drawer.querySelector(".bshRecipeDrawerBody").innerHTML = markup + recipeActionsMarkup(recipe, false, false) + (maxCrafts ? "" : '<p class="bshRecipeResourceHint">Add the required ingredients in My Resources to unlock craft-quantity planning.</p><button type="button" data-ui-recipe-resources>Open My Resources</button>');
    // Item tooltips live outside the modal. Avoid nonfunctional tooltip tab stops;
    // ingredient names, counts and owned amounts remain fully visible here.
    for (const target of drawer.querySelectorAll("[data-recipe-book-item-key]")) target.removeAttribute("tabindex");
    drawer.classList.remove("isClosing");
    if (!drawer.open) drawer.showModal();
    requestAnimationFrame(() => {drawer.classList.add("isOpen"); drawer.querySelector("[data-ui-recipe-close]")?.focus();});
    refreshFavoriteButtons(); return true;
  }
  function closeDrawer(immediate = false) {
    const drawer = state.drawer; if (!drawer?.open) return;
    drawer.classList.remove("isOpen"); drawer.classList.add("isClosing");
    clearTimeout(state.drawerCloseTimer);
    const finish = () => {
      if (!drawer.open) return;
      drawer.close(); drawer.classList.remove("isClosing"); state.drawerRecipeId = "";
      // Existing craftable cards should reflect plans changed inside the drawer.
      if (recipeBookState.data && recipeBookState.section === "craftables") recipeBookRenderCraftables();
      const target = state.drawerReturnFocus;
      if (target?.isConnected) target.focus();
      else if (enabled()) document.querySelector(`[data-ui-recipe-open="${CSS.escape(target?.dataset?.uiRecipeOpen || "")}"]`)?.focus();
      state.drawerReturnFocus = null;
    };
    if (immediate || reducedMotion()) finish(); else state.drawerCloseTimer = setTimeout(finish, 180);
  }
  function applyRefresh() {
    if (!enabled()) {closeDrawer(true); state.undo = null; clearTimeout(state.undoTimer);}
    if (weeklySettings.onboardingComplete) renderWeeklyDashboard(); else ensureWeeklyToolbar();
    if (recipeBookState.data) recipeBookRender(); else ensureRecipeToolbars();
    afterCraftableRender();
    for (const element of [state.weeklyToolbar, state.recipeToolbar, state.craftableToolbar]) if (element) element.hidden = !enabled();
  }

  globalThis.BshWeekliesRecipes = Object.freeze({afterWeeklyRender, beforeAllDone, weeklyTouched, recipeFilter, afterRecipeRender, afterCraftableRender, openRecipe, closeDrawer});
  document.addEventListener("click", event => {
    if (!enabled()) return;
    const favorite = event.target.closest("[data-ui-recipe-favorite]");
    if (favorite) {event.preventDefault(); toggleFavorite(favorite.dataset.uiRecipeFavorite); return;}
    const open = event.target.closest("[data-ui-recipe-open]");
    if (open) {event.preventDefault(); openRecipe(open.dataset.uiRecipeOpen, open.dataset.uiRecipeCraftable === "true", open); return;}
    if (event.target.closest("[data-ui-recipe-resources]")) {closeDrawer(true); recipeBookSetSection("resources", {focus: true});}
  });
  document.addEventListener("bsh:ui-refresh", applyRefresh);
  window.addEventListener("bsh:recipe-open", event => {if (typeof event.detail?.recipeId === "string") openRecipe(event.detail.recipeId);});
  applyRefresh();
})();
