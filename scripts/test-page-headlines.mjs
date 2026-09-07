import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const sourceRoot = path.resolve(process.argv[2] || path.join(import.meta.dirname, "..", "Source Code"));
const htmlPath = path.join(sourceRoot, "BlackSpiritHub.Resources.Black_Spirit_Hub.html");
const html = fs.readFileSync(htmlPath, "utf8").replace(/\r\n/g, "\n");
const baselinePath = process.argv[3] && path.resolve(process.argv[3]);
const selectedViews = new Map([
  ["calculatorView", "pageTitle"],
  ["marketView", "marketHeader"],
  ["portraitView", "portraitHeader"],
  ["fontChangerView", "fontHeader"],
  ["settingsView", "settingsHeader"],
  ["playerGuildView", "playerGuildHeader"],
  ["grindTrackerView", "grindHeader"],
  ["resetTimersView", "resetTimersHeader"],
  ["masteryBracketsView", "masteryHeader"]
]);
const requiredControls = new Map([
  ["calculatorView", ["originSearch", "originSelect", "fishPrice", "tradeRank", "tradeLevel"]],
  ["marketView", ["marketProvider", "marketStatus", "marketSearch", "marketExport", "topOutfitHeading"]],
  ["portraitView", ["portraitFolderPath", "portraitSelectFolder", "portraitSelectOld", "portraitOldPreview"]],
  ["fontChangerView", ["fontBdoFolder", "fontSelectBdoFolder", "fontPresetGallery"]],
  ["settingsView", ["themeChoices", "interfaceStyle"]],
  ["playerGuildView", ["playerGuildSourceStatus", "playerGuildSearchForm", "playerGuildSearchMode", "playerGuildRegion", "playerGuildSearch", "playerGuildSearchButton"]],
  ["grindTrackerView", ["grindChangeZone", "grindSpotDetail", "grindSpotPicker"]],
  ["resetTimersView", ["resetLocalTime", "nodeWarNotificationMode", "nodeWarLeadTime", "resetTimersStatus", "resetTimersGrid"]],
  ["masteryBracketsView", ["masteryExtra", "masterySkillTabs", "masteryCurrentInput", "masteryGoalInput", "masteryTableStage"]]
]);

function attributes(tag) {
  const result = new Map();
  for (const match of tag.matchAll(/\s([\w:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) {
    result.set(match[1].toLowerCase(), match[2] ?? match[3] ?? match[4] ?? "");
  }
  return result;
}

function openingTags(markup) {
  return [...markup.matchAll(/<!--[^]*?-->|<![^>]*>|<\/?([A-Za-z][\w:-]*)\b(?:[^>"']|"[^"]*"|'[^']*')*>/g)]
    .filter(match => match[1] && !match[0].startsWith("</"));
}

function ids(markup) {
  return openingTags(markup).map(match => attributes(match[0]).get("id")).filter(Boolean);
}

// Track nested elements so a view's inner sections cannot truncate the comparison.
function appViews(markup) {
  const views = new Map();
  const stack = [];
  const voidTags = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]);
  for (const match of markup.matchAll(/<!--[^]*?-->|<![^>]*>|<\/?([A-Za-z][\w:-]*)\b(?:[^>"']|"[^"]*"|'[^']*')*>/g)) {
    if (!match[1]) continue;
    const tag = match[1].toLowerCase();
    if (match[0].startsWith("</")) {
      const item = stack.pop();
      assert.equal(item?.tag, tag, `Unbalanced HTML closing tag ${tag} at ${match.index}`);
      if (item.viewId) {
        assert.ok(!views.has(item.viewId), `Duplicate app view ${item.viewId}`);
        views.set(item.viewId, markup.slice(item.start, match.index + match[0].length));
      }
    } else if (!voidTags.has(tag) && !match[0].endsWith("/>")) {
      const attrs = attributes(match[0]);
      const viewId = (attrs.get("class") || "").split(/\s+/).includes("appView") ? attrs.get("id") : null;
      stack.push({ tag, viewId, start: match.index });
    }
  }
  assert.equal(stack.length, 0, "HTML has unclosed elements");
  return views;
}

const allIds = ids(html);
assert.equal(new Set(allIds).size, allIds.length, `Duplicate HTML IDs: ${allIds.filter((id, index) => allIds.indexOf(id) !== index).join(", ")}`);
const views = appViews(html);
for (const [viewId, oldHeaderClass] of selectedViews) {
  const view = views.get(viewId);
  assert.ok(view, `Missing selected view ${viewId}`);
  assert.doesNotMatch(view, /<h1\b/i, `${viewId} still has a top headline`);
  for (const match of openingTags(view)) {
    const classes = (attributes(match[0]).get("class") || "").split(/\s+/);
    assert.ok(!classes.includes(oldHeaderClass), `${viewId} retains the empty/decorative ${oldHeaderClass} wrapper`);
  }
  const viewIds = new Set(ids(view));
  for (const id of requiredControls.get(viewId)) assert.ok(viewIds.has(id), `${viewId} must retain ${id}`);
}

if (baselinePath) {
  const baseline = fs.readFileSync(baselinePath, "utf8").replace(/\r\n/g, "\n");
  const baselineViews = appViews(baseline);
  assert.deepEqual([...views.keys()].sort(), [...baselineViews.keys()].sort(), "The set of app views must not change");
  for (const [viewId, previous] of baselineViews) {
    if (selectedViews.has(viewId)) {
      assert.deepEqual(ids(views.get(viewId)).sort(), ids(previous).sort(), `${viewId} must preserve all existing IDs`);
    } else {
      assert.equal(views.get(viewId), previous, `Unmentioned view ${viewId} changed`);
    }
  }
}

console.log(`Page headline checks passed: ${selectedViews.size} selected views, retained controls, unique IDs${baselinePath ? ", and untouched unmentioned views" : ""}.`);
