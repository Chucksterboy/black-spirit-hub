/* Optional UI refresh: grind browsing, item inspection, and linked market charts.
   This file changes presentation only; the original data and price providers remain authoritative. */
(() => {
  "use strict";
  const core = {
    cleanIds(value, knownIds, limit = 200) {
      return [...new Set((Array.isArray(value) ? value : []).map(String))]
        .filter(id => knownIds.has(id)).slice(0, limit);
    },
    normalize(value) {
      return String(value ?? "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
        .toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    },
    matchingSpots(spots, options = {}) {
      const words = core.normalize(options.query).split(" ").filter(Boolean);
      const favorites = new Set(options.favorites || []), recent = options.recent || [];
      return spots.filter(spot => {
        const id = String(spot.id), players = Number(spot.players) || 1;
        if(options.region && String(spot.zone || "") !== options.region) return false;
        if(options.players === "solo" && players !== 1) return false;
        if(options.players === "group" && players <= 1) return false;
        if(options.list === "favorites" && !favorites.has(id)) return false;
        if(options.list === "recent" && !recent.includes(id)) return false;
        if(options.withinGear) {
          // Recommendations only: never derive maximum requirements from AP/DP.
          if(!(Number(options.ap) > 0 && Number(options.dp) > 0)) return false;
          if(!(Number(spot.ap) > 0 && Number(spot.dp) > 0)) return false;
          if(Number(spot.ap) > Number(options.ap) || Number(spot.dp) > Number(options.dp)) return false;
        }
        const haystack = core.normalize([spot.name, spot.zone, spot.primaryTrash,
          ...(Array.isArray(spot.drops) ? spot.drops.map(drop => drop.name) : [])].join(" "));
        return words.every(word => haystack.includes(word));
      }).sort((a, b) => {
        if(options.list === "recent") return recent.indexOf(String(a.id)) - recent.indexOf(String(b.id));
        return (Number(b.ap) || 0) - (Number(a.ap) || 0) ||
          (Number(b.dp) || 0) - (Number(a.dp) || 0) || String(a.name).localeCompare(String(b.name));
      });
    },
    priceInfo(drop, record, hasNoValue = false, unmarketable = false) {
      const number = Number(record?.price), source = String(record?.source || "");
      const valid = !hasNoValue && !unmarketable && Number.isFinite(number) && number > 0;
      const providers = {
        "fixed-vendor": "Bundled vendor / fixed reference value",
        "reference-fallback": "Bundled reference estimate — not a live market quote",
        "bdoalerts-price-history": "BDO Alerts market-history snapshot",
        "bdoalerts-pearlshop-cache": "BDO Alerts cached market snapshot",
        "arsha-sublist-cache": "Arsha cached Central Market snapshot",
        "arsha-category-cache": "Arsha cached Central Market snapshot",
        "pearl-abyss-sublist-live": "Pearl Abyss Central Market snapshot"
      };
      return {
        amount: valid ? Math.round(number).toLocaleString() + " silver" :
          unmarketable ? "Not listed on Central Market" : hasNoValue ? "No market value available" : "Price unavailable",
        source: valid ? providers[source] || (source ? `Saved price snapshot (${source})` : "Saved price snapshot; provider unavailable") :
          "This item does not have a usable price snapshot.",
        capturedUtc: valid && Number.isFinite(Date.parse(record?.capturedUtc || "")) ? record.capturedUtc : null,
        fixed: source === "fixed-vendor" || source === "reference-fallback",
        region: valid && !["fixed", "reference", ""].includes(String(record?.region || "")) ? String(record.region).toUpperCase() : ""
      };
    },
    chartPoints(points) {
      return (Array.isArray(points) ? points : []).map(point => ({
        time: new Date(point.time), value: Number(point.value)
      })).filter(point => Number.isFinite(point.time.getTime()) && Number.isFinite(point.value))
        .sort((a, b) => a.time - b.time);
    },
    nearestPoint(points, time) {
      if(!points.length || !Number.isFinite(Number(time))) return null;
      return points.reduce((best, point) => Math.abs(point.time.getTime() - time) < Math.abs(best.time.getTime() - time) ? point : best);
    },
    chartMessage(state, count, isSales = false) {
      if(state === "loading") return "Loading history…";
      if(state === "error") return "Could not load history. Retry when your connection is available.";
      if(count === 0) return isSales ? "Not enough history yet — sales need two snapshots with trade counts." :
        "No snapshots yet. Keep this item tracked to build its history.";
      if(count === 1) return "One sample collected — more snapshots are needed to show a trend.";
      return "";
    }
  };
  window.BshGrindMarketCore = Object.freeze(core);
  if(typeof document === "undefined") return;

  const enabled = () => document.body?.dataset.uiRefresh === "on";
  const e = value => escapeHtml(String(value ?? ""));
  const known = new Set(GRIND_SPOTS.map(spot => String(spot.id)));
  const read = (key, fallback) => { try { return readSetting(key, fallback); } catch { return fallback; } };
  const save = (key, value) => { try { persistSetting(key, value); } catch { /* Core storage reports its own errors. */ } };
  const state = {
    favorites: core.cleanIds(read("uiRefreshGrindFavorites", []), known),
    recent: core.cleanIds(read("uiRefreshGrindRecent", []), known, 12),
    list: "all", region: "", players: "all", ap: "", dp: "", withinGear: false,
    chartStatus: "ready", charts: new Map(), expanded: null, drawer: null
  };
  const originalPicker = grindRenderSpotPicker;
  const originalSelect = grindSelectSpot;
  const originalDetail = grindRenderSpotDetail;
  let pickerFavoritesBound = false;
  grindRenderSpotDetail = function() {
    originalDetail();
    if(enabled()) enhanceSpot(grindSpotById(grindState.selectedSpotId));
  };
  grindRenderSpotPicker = function() {
    if(!enabled()) return originalPicker();
    renderPicker();
  };
  grindSelectSpot = function(id) {
    if(enabled() && known.has(String(id))) {
      state.recent = [String(id), ...state.recent.filter(value => value !== String(id))].slice(0, 12);
      save("uiRefreshGrindRecent", state.recent);
    }
    return originalSelect(id);
  };

  function toggleFavorite(id) {
    if(!known.has(String(id))) return;
    state.favorites = state.favorites.includes(String(id)) ? state.favorites.filter(value => value !== String(id)) : [...state.favorites, String(id)];
    save("uiRefreshGrindFavorites", state.favorites);
    renderPicker();
    const button = document.querySelector('[data-gm-current-favorite]');
    if(button) updateFavoriteButton(button, String(grindState.selectedSpotId));
  }
  function updateFavoriteButton(button, id) {
    const favorite = state.favorites.includes(String(id));
    button.setAttribute("aria-pressed", String(favorite));
    button.textContent = favorite ? "★ Saved zone" : "☆ Save zone";
  }
  function installPickerControls() {
    const search = document.getElementById("grindSpotPickerSearch");
    if(!search) return;
    search.placeholder = "Search zones or any item they drop";
    search.setAttribute("aria-label", "Search grind zones or dropped items");
    if(document.getElementById("gmBrowseControls")) return;
    const controls = document.createElement("div");
    controls.id = "gmBrowseControls";
    controls.className = "gmBrowseControls";
    const regions = [...new Set(GRIND_SPOTS.map(spot => String(spot.zone || "")).filter(Boolean))].sort();
    controls.innerHTML = `<div class="gmFilterRow"><label>Show<select data-gm-filter="list"><option value="all">All zones</option><option value="favorites">Favourites</option><option value="recent">Recently viewed</option></select></label><label>Region<select data-gm-filter="region"><option value="">All regions</option>${regions.map(region => `<option value="${e(region)}">${e(region)}</option>`).join("")}</select></label><label>Party size<select data-gm-filter="players"><option value="all">Solo &amp; group</option><option value="solo">Solo</option><option value="group">Group</option></select></label></div><details class="gmGearFilter"><summary>Filter by my gear <span>(recommendations only)</span></summary><div class="gmFilterRow"><label>My AP<input data-gm-filter="ap" inputmode="numeric" type="number" min="1" max="9999" placeholder="Enter AP"></label><label>My DP<input data-gm-filter="dp" inputmode="numeric" type="number" min="1" max="9999" placeholder="Enter DP"></label><label class="gmGearToggle"><input data-gm-filter="withinGear" type="checkbox"> Within my AP / DP</label></div><p>This compares the listed recommendations, not maximum caps or a guarantee of survival. Zones with missing recommendations are excluded.</p></details><p id="gmBrowseSummary" class="gmBrowseSummary" role="status" aria-live="polite"></p>`;
    search.insertAdjacentElement("afterend", controls);
    controls.addEventListener("change", event => {
      const name = event.target.dataset.gmFilter;
      if(!name) return;
      state[name] = name === "withinGear" ? event.target.checked : event.target.value;
      renderPicker();
    });
    controls.querySelectorAll("[data-gm-filter]").forEach(input => {
      const name = input.dataset.gmFilter;
      if(name === "withinGear") input.checked = state.withinGear;
      else input.value = state[name];
    });
    const list = document.getElementById("grindSpotPickerList");
    if(!pickerFavoritesBound && list) list.addEventListener("click", event => {
      const button = event.target.closest("[data-gm-favorite]");
      if(!button) return;
      const id = button.dataset.gmFavorite;
      event.preventDefault();
      event.stopPropagation();
      toggleFavorite(id);
      [...list.querySelectorAll("[data-gm-favorite]")].find(item => item.dataset.gmFavorite === id)?.focus();
    });
    pickerFavoritesBound = Boolean(list);
  }
  function renderPicker() {
    const list = document.getElementById("grindSpotPickerList");
    if(!list) return;
    installPickerControls();
    document.querySelectorAll("[data-grind-power-mode]").forEach(button => {
      const active = (button.dataset.grindPowerMode || "recommended") === (grindState.powerMode || "recommended");
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    const header = document.getElementById("grindPowerHeader");
    if(header) header.textContent = grindState.powerMode === "max" ? "Max AP / DP" : "Recommended AP / DP";
    const spots = core.matchingSpots(GRIND_SPOTS, { ...state, query: grindState.pickerSearch });
    const summary = document.getElementById("gmBrowseSummary");
    if(summary) summary.textContent = state.withinGear && !(Number(state.ap) > 0 && Number(state.dp) > 0) ?
      "Enter both your AP and DP to use the gear filter." : `${spots.length} zone${spots.length === 1 ? "" : "s"} · ${state.favorites.length} saved`;
    list.innerHTML = spots.map(spot => {
      const id = String(spot.id), favorite = state.favorites.includes(id), trash = grindTrashDrop(spot), monster = grindMonsterMeta(spot);
      const ccs = grindSpotCcs(spot), power = grindPowerForSpot(spot);
      return `<div class="gmPickerEntry"><button class="gmFavorite" data-gm-favorite="${e(id)}" aria-label="${favorite ? "Unsave" : "Save"} ${e(spot.name)}" aria-pressed="${favorite}" type="button">${favorite ? "★" : "☆"}</button><button class="grindPickerRow" data-grind-picker-spot="${e(id)}" type="button"><span class="grindPickerName"><span class="grindPickerIcons"><img class="grindPickerLoot" src="${e(trash?.icon || spot.icon || "")}" alt="" loading="lazy"><img class="grindMonsterBadge ${e(monster.type)}" src="${e(monster.icon)}" alt="${e(monster.label)}" title="${e(monster.label)}"></span><span><strong>${e(spot.name)}</strong><small>${e(spot.zone || "Unknown region")} · ${Number(spot.players) || 1} player${Number(spot.players) > 1 ? "s" : ""}</small></span></span><span class="grindPickerCc">${ccs.length ? ccs.map(cc => `<img class="grindCcIcon" src="${e(grindCcIconMap[cc])}" alt="${e(grindCcLabels[cc])}" title="${e(grindCcLabels[cc])}">`).join("") : "—"}</span><span class="grindCapText">${e(grindPowerText(spot))}${power.label === "Max est." ? '<small class="gmEstimate">Estimated</small>' : ""}</span></button></div>`;
    }).join("") || grindEmpty(state.list === "favorites" && !state.favorites.length ? "No saved zones yet. Use the star next to a zone to save it." : state.list === "recent" && !state.recent.length ? "Your recently opened zones will appear here." : "No zones match. Try another item name or loosen the filters.");
  }
  function enhanceSpot(spot) {
    if(!enabled() || !grindEl.spotDetail || !spot) return;
    const top = grindEl.spotDetail.querySelector(".grindSpotTop");
    if(top) {
      const favorite = document.createElement("button");
      favorite.type = "button";
      favorite.className = "gmCurrentFavorite";
      favorite.dataset.gmCurrentFavorite = String(spot.id);
      updateFavoriteButton(favorite, String(spot.id));
      favorite.addEventListener("click", () => toggleFavorite(String(spot.id)));
      top.append(favorite);
    }
    grindEl.spotDetail.querySelectorAll(".grindLootCard").forEach((card, index) => {
      const drop = spot.drops?.[index];
      if(!drop) return;
      card.tabIndex = 0;
      card.setAttribute("role", "button");
      card.setAttribute("aria-label", `Inspect ${drop.name}`);
      card.setAttribute("aria-haspopup", "dialog");
      card.addEventListener("click", () => openItem(drop));
      card.addEventListener("keydown", event => {
        if(event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        openItem(drop);
      });
    });
  }
  function dialog(className, title) {
    const element = document.createElement("dialog");
    element.className = `gmDialog ${className}`;
    const id = className === "gmItemDrawer" ? "gmItemTitle" : "gmChartTitle";
    element.setAttribute("aria-labelledby", id);
    element.innerHTML = `<div class="gmDialogHead"><h2 id="${id}">${e(title)}</h2><button type="button" class="gmClose" aria-label="Close ${className === "gmItemDrawer" ? "item details" : "expanded charts"}">×</button></div>`;
    const returnFocus = document.activeElement;
    element.querySelector(".gmClose").addEventListener("click", () => element.close());
    element.addEventListener("click", event => {
      if(event.target !== element) return;
      const rect = element.getBoundingClientRect();
      if(event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) element.close();
    });
    // Native modal dialogs make the rest of the document inert and trap focus.
    element.addEventListener("close", () => {
      element.remove();
      if(element.dataset.gmSkipFocusRestore === "true") return;
      if(returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
      else document.getElementById("grindChangeZone")?.focus({ preventScroll: true });
    });
    document.body.append(element);
    return element;
  }
  function openItem(drop) {
    if(!enabled()) return;
    state.drawer?.close();
    const element = dialog("gmItemDrawer", drop.name);
    state.drawer = element;
    const record = grindPriceRecordForDrop(drop), info = core.priceInfo(drop, record, grindDropHasNoValue(drop), grindDropIsUnmarketable(drop));
    const marketId = grindDropMarketId(drop);
    const content = document.createElement("div");
    content.className = "gmItemContent";
    content.innerHTML = `<img class="gmItemIcon" src="${e(drop.icon || "")}" alt=""><p class="gmItemPrice">${e(info.amount)}</p><dl class="gmItemFacts"><dt>Price source</dt><dd>${e(info.source)}</dd><dt>Last price sample</dt><dd>${info.capturedUtc ? e(new Date(info.capturedUtc).toLocaleString()) : info.fixed ? "Not timestamped — bundled reference value" : "Unavailable"}</dd>${info.region ? `<dt>Market region</dt><dd>${e(info.region)}</dd>` : ""}<dt>Item ID</dt><dd>${e(marketId || drop.id)}</dd></dl><p class="gmItemNote">${info.fixed ? "Reference values can change with game patches." : "Market prices are snapshots, not a guarantee of the price you will receive."}</p><div class="gmTrackControls">${marketId ? '<button type="button" class="gmTrackButton">Track in Market</button>' : '<p>This item cannot be added to Central Market tracking.</p>'}</div><p class="gmTrackStatus" role="status" aria-live="polite"></p>`;
    element.append(content);
    content.querySelector(".gmItemIcon").addEventListener("error", event => { event.target.hidden = true; });
    content.querySelector(".gmTrackButton")?.addEventListener("click", () => chooseMarketVariant(element, drop, marketId));
    element.addEventListener("close", () => { if(state.drawer === element) state.drawer = null; });
    element.showModal();
    element.querySelector(".gmClose").focus();
  }
  async function chooseMarketVariant(element, drop, marketId) {
    const button = element.querySelector(".gmTrackButton"), status = element.querySelector(".gmTrackStatus"), controls = element.querySelector(".gmTrackControls");
    button.disabled = true;
    status.textContent = "Loading available market versions…";
    try {
      const variants = await bridgeCall("getVariants", { itemId: Number(marketId) });
      if(!element.open || !enabled()) return;
      const choices = Array.isArray(variants) ? variants.filter(item => Number(item.itemId) === Number(marketId)) : [];
      if(!choices.length) throw new Error("No market versions are available for this item.");
      controls.replaceChildren();
      const label = document.createElement("label"), select = document.createElement("select"), confirm = document.createElement("button");
      label.textContent = "Market version";
      select.setAttribute("aria-label", "Choose the item version to track");
      choices.forEach((item, index) => {
        const option = document.createElement("option");
        option.value = String(index);
        option.textContent = enhancedName(item);
        select.append(option);
      });
      label.append(select);
      confirm.type = "button";
      confirm.className = "gmTrackButton";
      confirm.textContent = "Track selected version";
      controls.append(label, confirm);
      status.textContent = "Choose a version, then confirm to add it to your tracked items.";
      confirm.addEventListener("click", async () => {
        confirm.disabled = true;
        select.disabled = true;
        const item = choices[Number(select.value)];
        try {
          status.textContent = `Adding ${enhancedName(item)}…`;
          await initializeMarket();
          // Closing before a write cancels the action; a completed write is never rolled back silently.
          if(!element.open || !enabled()) return;
          const items = await bridgeCall("addTracked", item);
          marketState.items = items;
          renderTrackedItems();
          if(element.open && enabled()) {
            element.dataset.gmSkipFocusRestore = "true";
            element.close();
            const marketButton = document.querySelector('[data-app-view="marketView"]');
            if(marketButton) { activateAppView(marketButton); marketButton.focus(); }
            document.querySelector('[data-market-panel="trackerPanel"]')?.click();
            selectTrackedItem(items.find(tracked => tracked.itemId === item.itemId && tracked.enhancement === item.enhancement));
            setMarketStatus("Item added to market tracking.");
          }
        } catch(error) {
          status.textContent = error.message || "Could not track this item. Please try again.";
          confirm.disabled = false;
          select.disabled = false;
        }
      });
      select.focus();
    } catch(error) {
      status.textContent = error.message || "Could not load item versions. Please try again.";
      button.disabled = false;
    }
  }

  function ensureChartTools() {
    const detail = document.getElementById("marketDetail"), grid = detail?.querySelector(".graphGrid");
    if(!detail || document.getElementById("gmExpandCharts")) return;
    const toolbar = document.createElement("div");
    toolbar.className = "gmChartToolbar";
    toolbar.innerHTML = '<span>Hover or use ← / → on either chart to compare samples.</span><button id="gmExpandCharts" type="button" aria-haspopup="dialog">Expand charts</button>';
    grid?.insertAdjacentElement("beforebegin", toolbar);
    toolbar.querySelector("button").addEventListener("click", expandCharts);
  }
  function expandCharts() {
    if(!enabled() || state.expanded) return;
    const grid = document.querySelector("#marketDetail .graphGrid");
    if(!grid) return;
    const title = document.getElementById("detailName")?.textContent || "Market history";
    const element = dialog("gmExpandedCharts", title), placeholder = document.createComment("Expanded chart position");
    grid.replaceWith(placeholder);
    const range = document.createElement("label"), select = document.createElement("select");
    range.className = "gmExpandedRange";
    range.textContent = "History range";
    select.setAttribute("aria-label", "Expanded chart history range");
    select.innerHTML = marketEl.range.innerHTML;
    select.value = marketEl.range.value;
    select.addEventListener("change", () => {
      marketEl.range.value = select.value;
      loadAnalytics();
    });
    range.append(select);
    element.append(range, grid);
    state.expanded = element;
    element.addEventListener("close", () => {
      placeholder.replaceWith(grid);
      state.expanded = null;
      requestAnimationFrame(() => { if(marketState.analytics) renderAnalytics(); });
    });
    element.showModal();
    requestAnimationFrame(() => { if(marketState.analytics) renderAnalytics(); });
    element.querySelector(".gmClose").focus();
  }
  function setAnalyticsState(value, message = "") {
    state.chartStatus = value;
    if(!enabled()) return;
    ensureChartTools();
    let banner = document.getElementById("gmAnalyticsStatus");
    if(!banner) {
      const parent = document.getElementById("marketDetail")?.parentElement;
      if(!parent) return;
      banner = document.createElement("div");
      banner.id = "gmAnalyticsStatus";
      banner.className = "gmAnalyticsStatus";
      banner.setAttribute("role", "status");
      banner.setAttribute("aria-live", "polite");
      parent.prepend(banner);
    }
    banner.dataset.state = value;
    banner.hidden = value === "ready";
    banner.replaceChildren();
    const banners = [banner];
    if(state.expanded) {
      let expandedStatus = state.expanded.querySelector(".gmAnalyticsStatus");
      if(!expandedStatus) {
        expandedStatus = document.createElement("div");
        expandedStatus.className = "gmAnalyticsStatus";
        expandedStatus.setAttribute("role", "status");
        state.expanded.querySelector(".gmExpandedRange").insertAdjacentElement("afterend", expandedStatus);
      }
      banners.push(expandedStatus);
    }
    for(const target of banners) {
      target.dataset.state = value;
      target.hidden = value === "ready";
      target.replaceChildren();
      if(value === "loading") target.textContent = "Loading the selected item’s history…";
      else if(value === "error") {
        const text = document.createElement("span"), retry = document.createElement("button");
        text.textContent = `History could not be loaded. ${message || "Please try again."}`;
        retry.type = "button";
        retry.textContent = "Retry";
        retry.addEventListener("click", loadAnalytics);
        target.append(text, retry);
      }
    }
    document.getElementById("marketDetail")?.setAttribute("aria-busy", String(value === "loading"));
  }
  function drawChart(canvas, rawPoints, formatter) {
    if(!enabled()) return false;
    ensureChartTools();
    const points = core.chartPoints(rawPoints);
    if(canvas.id === "priceChart") state.charts.clear();
    const chart = { canvas, points, formatter };
    state.charts.set(canvas.id, chart);
    canvas.tabIndex = 0;
    canvas.setAttribute("role", "img");
    canvas.setAttribute("aria-label", `${canvas.id === "salesChart" ? "Observed sales" : "Price history"}. ${points.length} samples. Use left and right arrow keys to inspect linked samples.`);
    canvas.onmousemove = event => {
      if(!points.length) return;
      const rect = canvas.getBoundingClientRect(), proportion = Math.max(0, Math.min(1, (event.clientX - rect.left - chart.plot.left) / (chart.plot.right - chart.plot.left)));
      highlight(chart.timeMin + proportion * (chart.timeMax - chart.timeMin));
    };
    canvas.onmouseleave = () => highlight(null);
    canvas.onblur = () => highlight(null);
    canvas.onkeydown = event => {
      if(!["ArrowLeft", "ArrowRight", "Home", "End", "Escape"].includes(event.key)) return;
      event.preventDefault();
      if(event.key === "Escape") { highlight(null); return; }
      const nearest = core.nearestPoint(points, state.cursor ?? points[0]?.time.getTime());
      let index = Math.max(0, points.indexOf(nearest));
      if(event.key === "Home") index = 0;
      else if(event.key === "End") index = points.length - 1;
      else index += event.key === "ArrowRight" ? 1 : -1;
      const point = points[Math.max(0, Math.min(points.length - 1, index))];
      if(point) highlight(point.time.getTime());
    };
    paintChart(chart, null);
    return true;
  }
  function highlight(timestamp) {
    state.cursor = timestamp;
    for(const chart of state.charts.values()) paintChart(chart, timestamp);
  }
  function paintChart(chart, timestamp) {
    const { canvas, points, formatter } = chart, panel = canvas.parentElement;
    const tooltip = panel.querySelector(".graphTooltip");
    const width = Math.max(300, Math.floor(canvas.clientWidth || 600));
    const height = state.expanded ? Math.max(260, Math.min(420, Math.floor(window.innerHeight * .34))) : 280;
    const ratio = window.devicePixelRatio || 1;
    canvas.style.height = `${height}px`;
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    const context = canvas.getContext("2d");
    if(!context) return;
    context.scale(ratio, ratio);
    context.clearRect(0, 0, width, height);
    const style = getComputedStyle(document.body), foreground = style.getPropertyValue("--text").trim() || "#f5f5ff";
    const muted = style.getPropertyValue("--muted").trim() || foreground, accent = style.getPropertyValue("--a1").trim() || "#8bdcf7";
    const labelSize = Math.max(12, parseFloat(style.getPropertyValue("--ui-caption-size")) || 12);
    context.font = `${labelSize}px Inter, Segoe UI, sans-serif`;
    const values = points.map(point => point.value);
    let min = values.length ? Math.min(...values) : 0, max = values.length ? Math.max(...values) : 1;
    if(min === max) { const pad = Math.max(1, Math.abs(min) * .02); min -= pad; max += pad; }
    const longestValue = Math.max(context.measureText(formatter(min)).width, context.measureText(formatter(max)).width);
    const plot = chart.plot = { left: Math.min(width * .3, Math.max(64, longestValue + 12)), right: width - 18, top: 24, bottom: height - labelSize - 26 };
    context.strokeStyle = style.getPropertyValue("--border").trim() || "#556070";
    context.fillStyle = muted;
    for(let i = 0; i <= 4; i++) {
      const y = plot.top + (plot.bottom - plot.top) * i / 4;
      context.beginPath(); context.moveTo(plot.left, y); context.lineTo(plot.right, y); context.stroke();
      if(points.length) context.fillText(formatter(max - (max - min) * i / 4), 2, y + 4);
    }
    let message = panel.querySelector(".gmChartMessage");
    if(!message) {
      message = document.createElement("p");
      message.className = "gmChartMessage";
      message.setAttribute("role", "status");
      panel.append(message);
    }
    message.textContent = core.chartMessage("ready", points.length, canvas.id === "salesChart");
    message.hidden = !message.textContent;
    if(tooltip) { tooltip.style.display = "none"; tooltip.setAttribute("aria-live", "off"); }
    if(!points.length) return;
    const siblingPoints = [...state.charts.values()].flatMap(value => value.points);
    // The two graphs share a date domain, including the missing first sales interval.
    const times = siblingPoints.map(point => point.time.getTime());
    const timeMin = chart.timeMin = Math.min(...times), timeMax = chart.timeMax = Math.max(...times);
    const pointX = point => plot.left + (timeMax === timeMin ? .5 : (point.time.getTime() - timeMin) / (timeMax - timeMin)) * (plot.right - plot.left);
    const pointY = point => plot.bottom - (point.value - min) / (max - min) * (plot.bottom - plot.top);
    context.strokeStyle = accent;
    context.lineWidth = 2;
    context.beginPath();
    points.forEach((point, index) => index ? context.lineTo(pointX(point), pointY(point)) : context.moveTo(pointX(point), pointY(point)));
    context.stroke();
    context.fillStyle = accent;
    if(points.length === 1) { context.beginPath(); context.arc(pointX(points[0]), pointY(points[0]), 4, 0, Math.PI * 2); context.fill(); }
    context.fillStyle = muted;
    const startLabel = new Date(timeMin).toLocaleDateString(), endLabel = new Date(timeMax).toLocaleDateString();
    context.fillText(startLabel, plot.left, height - 8);
    if(timeMin !== timeMax) context.fillText(endLabel, plot.right - context.measureText(endLabel).width, height - 8);
    if(timestamp == null) return;
    const nearest = core.nearestPoint(points, timestamp);
    const cursorX = plot.left + (timeMax === timeMin ? .5 : (timestamp - timeMin) / (timeMax - timeMin)) * (plot.right - plot.left);
    context.strokeStyle = foreground;
    context.lineWidth = 1;
    context.setLineDash([4, 4]);
    context.beginPath(); context.moveTo(cursorX, plot.top); context.lineTo(cursorX, plot.bottom); context.stroke();
    context.setLineDash([]);
    context.fillStyle = accent;
    context.beginPath(); context.arc(pointX(nearest), pointY(nearest), 4, 0, Math.PI * 2); context.fill();
    if(tooltip) {
      tooltip.style.display = "block";
      tooltip.style.left = `${Math.max(6, Math.min(width - 245, pointX(nearest) + 10))}px`;
      tooltip.style.top = `${Math.max(40, pointY(nearest) - 42)}px`;
      tooltip.textContent = `${nearest.time.toLocaleString()} · ${formatter(nearest.value)}${nearest.time.getTime() !== timestamp ? " (nearest sample)" : ""}`;
    }
    canvas.setAttribute("aria-label", `${canvas.id === "salesChart" ? "Observed sales" : "Price"}: ${nearest.time.toLocaleString()}, ${formatter(nearest.value)}. Nearest sample to the linked cursor.`);
  }
  function refreshPresentation() {
    if(!enabled()) {
      state.drawer?.close();
      state.expanded?.close();
      document.getElementById("gmBrowseControls")?.remove();
      document.querySelectorAll(".gmChartToolbar,.gmChartMessage,#gmAnalyticsStatus").forEach(element => element.remove());
      const search = document.getElementById("grindSpotPickerSearch");
      if(search) { search.placeholder = "Search for spot"; search.setAttribute("aria-label", "Search grind spots"); }
      for(const chart of state.charts.values()) {
        chart.canvas.style.removeProperty("height");
        chart.canvas.removeAttribute("tabindex");
        chart.canvas.removeAttribute("role");
        chart.canvas.removeAttribute("aria-label");
        chart.canvas.onkeydown = null;
        chart.canvas.onblur = null;
      }
      state.charts.clear();
    } else ensureChartTools();
    if(grindState.initialized) grindRender();
    if(marketState.analytics) renderAnalytics();
  }
  window.BshGrindMarket = Object.freeze({ enhanceSpot, drawChart, setAnalyticsState, refreshPresentation });
  document.addEventListener("bsh:ui-refresh", refreshPresentation);
  // Theme and text-size changes repaint canvas labels, which CSS cannot update by itself.
  document.addEventListener("bsh:ui-text-size", () => { if(enabled() && marketState.analytics) renderAnalytics(); });
  if(typeof MutationObserver !== "undefined") {
    let repaint = false;
    new MutationObserver(() => {
      if(repaint || !enabled()) return;
      repaint = true;
      requestAnimationFrame(() => { repaint = false; if(marketState.analytics) renderAnalytics(); });
    }).observe(document.body, { attributes: true, attributeFilter: ["data-theme", "data-mode", "data-style"] });
  }
  refreshPresentation();
})();
