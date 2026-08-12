#!/usr/bin/env node

import { createHash } from "node:crypto";
import {
  access,
  copyFile,
  mkdir,
  readFile,
  readdir,
  stat,
  writeFile
} from "node:fs/promises";
import path from "node:path";

const SCHEMA_VERSION = 1;
const EXTRACTOR_COMMIT = "2e4ace61e2a3967663cb36580edb7201b7ca3fd4";
const ITEM_ID_MASK = 0x00ff_ffff;
const KNOWN_RECIPE_TYPES = new Set([
  "ALCHEMY",
  "COOK",
  "CRAFT",
  "DRY",
  "FIREWOOD",
  "GRIND",
  "GUILD",
  "HEAT",
  "HOUSE",
  "ROYALGIFT_ALCHEMY",
  "ROYALGIFT_COOK",
  "SHAKE",
  "SIMPLE_ALCHEMY",
  "SIMPLE_COOK",
  "THINNING"
]);
const LEGACY_IMPERIAL_BOX_IDS = new Set([
  9801, 9802, 9803, 9804, 9805, 9806, 9807, 9808, 9809, 9810, 9811,
  9812, 9813, 9814, 9815, 9816, 9817, 9818, 9819, 9820, 9821,
  9823, 9824, 9825, 9826, 9827, 9828, 9829, 9830, 9831, 9832, 9833,
  9834, 9835, 9836, 9837, 9838, 9839, 9840, 9841, 9848
]);
const CLIENT_RETIRED_ITEM_IDS = new Set([
  5201, 5202, 5203, 5204, 5207, 5208, 5209, 5210, 5211, 5212, 5213,
  5214, 5215, 5216, 5217, 5951, 5952, 5953, 5954, 5955, 5956, 5957,
  5958, 5959, 5961, 5962, 5963, 16002, 16005
]);
const CLIENT_UNAVAILABLE_ITEM_IDS = new Set([757130]);

function fail(message) {
  throw new Error(message);
}

function parseArgs(values) {
  const args = new Map();
  for (let index = 0; index < values.length; index += 1) {
    const token = values[index];
    if (!token.startsWith("--")) fail(`Unexpected argument: ${token}`);
    const name = token.slice(2);
    const value = values[index + 1];
    if (!value || value.startsWith("--")) fail(`Missing value for --${name}`);
    if (args.has(name)) fail(`Duplicate argument: --${name}`);
    args.set(name, value);
    index += 1;
  }
  return args;
}

function requiredArg(args, name) {
  const value = String(args.get(name) || "").trim();
  if (!value) fail(`Missing required --${name} argument.`);
  return path.resolve(value);
}

async function pathExists(value) {
  try {
    await access(value);
    return true;
  } catch {
    return false;
  }
}

async function ensureFreshDirectory(directory) {
  if (await pathExists(directory)) {
    const entries = await readdir(directory);
    if (entries.length) fail(`Output directory must be new or empty: ${directory}`);
  } else {
    await mkdir(directory, { recursive: true });
  }
}

async function readJson(file) {
  let parsed;
  try {
    parsed = JSON.parse(await readFile(file, "utf8"));
  } catch (error) {
    fail(`Could not read JSON ${file}: ${error.message}`);
  }
  return parsed;
}

function stableJson(value, pretty = false) {
  return `${JSON.stringify(value, null, pretty ? 2 : 0)}\n`;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function hashFile(file) {
  return sha256(await readFile(file));
}

function itemRef(value) {
  const match = /^urn::item:(\d+)$/.exec(String(value || ""));
  if (!match) fail(`Invalid item reference: ${value}`);
  const rawId = Number(match[1]);
  if (!Number.isSafeInteger(rawId) || rawId <= 0 || rawId > 0xffff_ffff) {
    fail(`Item reference is outside the supported 32-bit range: ${value}`);
  }
  return {
    rawId,
    itemId: rawId & ITEM_ID_MASK,
    enhancement: rawId > ITEM_ID_MASK ? rawId >>> 24 : 0
  };
}

function retiredItemName(value) {
  const name = String(value || "").trim();
  return /^\[(?:event|gm|test|unused|expired|removed|deprecated)\]/i.test(name)
    || /\b(?:obsolete|deprecated|dummy item|test item|unused item|removed item|expired item|do not use)\b/i.test(name);
}

function recipeSignature(recipe) {
  const inputs = recipe.inputs
    .map(input => `${input.rawId}x${input.count}`)
    .sort((left, right) => left.localeCompare(right));
  return [recipe.outputRawId, recipe.type, recipe.station || "", ...inputs].join("|");
}

function recipeId(signature, outputId) {
  return `recipe-${outputId}-${sha256(signature).slice(0, 16)}`;
}

function countBy(values, pick) {
  const counts = {};
  for (const value of values) {
    const key = String(pick(value));
    counts[key] = (counts[key] || 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)));
}

function cleanItemDescription(value) {
  const textBindPhrases = {
    CLICK_ON_RMB: "Right-click",
    CLICK_ON_RMB_ONLY: "Right-click",
    EFFECT_DRY_CLICK_RMB: "Right-click to apply",
    EQUIP_CLICK_RMB: "Right-click to equip",
    KAFURAS_CLICK_RMB: "Right-click to use",
    LOAD_CLICK_RMB: "Right-click to load",
    LOCATE_CLICK_RMB: "Right-click to locate",
    PHASE_CLICK_RMB: "Right-click to use",
    TEXTBIND_INTERACTION: "interaction key",
    TEXTBIND_MY_INFORMATION: "My Information",
    TEXTBIND_YAZ_CROSSBACK: "",
    TRANSFUSION_CLICK_RMB: "Right-click to open Transfusion",
    USE_CLICK_RMB: "Right-click to use",
    USING_CLICK_RMB: "Right-click"
  };
  return String(value || "")
    .replace(/<PAColor0x[0-9a-f]+>/gi, "")
    .replace(/<PAOldColor>/gi, "")
    .replace(/\{KeyBind:([^}]+)\}/gi, "$1")
    .replace(/\{TextBind:([a-z0-9_]+)\}/gi, (_match, key) => {
      const normalizedKey = String(key).toUpperCase();
      if (Object.hasOwn(textBindPhrases, normalizedKey)) return textBindPhrases[normalizedKey];
      return "[Additional client details unavailable offline]";
    })
    .replace(/([\p{L}\p{N})])(?=(?:Right-click|My Information|interaction key|\[Additional client details))/gu, "$1 ")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function buildPlan(rawItems, rawRecipes, source) {
  if (!Array.isArray(rawItems) || !Array.isArray(rawRecipes)) {
    fail("Extractor items.json and recipes.json must both contain arrays.");
  }

  const itemsById = new Map();
  for (const item of rawItems) {
    const id = Number(item?.id);
    if (!Number.isInteger(id) || id <= 0 || itemsById.has(id)) continue;
    itemsById.set(id, item);
  }

  const kept = [];
  const exclusions = [];
  const signatures = new Set();

  function exclude(recipe, reason, outputId = 0, outputName = "") {
    exclusions.push({
      sourceId: String(recipe?.urn || ""),
      reason,
      type: String(recipe?.type || ""),
      outputId,
      outputName
    });
  }

  for (const rawRecipe of rawRecipes) {
    let output;
    try {
      output = itemRef(rawRecipe?.output);
    } catch {
      exclude(rawRecipe, "invalid-output-reference");
      continue;
    }

    const outputItem = itemsById.get(output.itemId);
    const outputName = String(outputItem?.name || "").trim();
    const type = String(rawRecipe?.type || "").trim().toUpperCase();

    if (!KNOWN_RECIPE_TYPES.has(type)) {
      exclude(rawRecipe, "unsupported-recipe-type", output.itemId, outputName);
      continue;
    }
    if (rawRecipe?.byproductOf) {
      exclude(rawRecipe, "non-craftable-byproduct-projection", output.itemId, outputName);
      continue;
    }
    if (!outputItem) {
      exclude(rawRecipe, "missing-output-item", output.itemId, outputName);
      continue;
    }
    if (outputItem.ghost) {
      exclude(rawRecipe, "retired-output-ghost", output.itemId, outputName);
      continue;
    }
    if (!outputName) {
      exclude(rawRecipe, "nameless-output", output.itemId, outputName);
      continue;
    }
    if (LEGACY_IMPERIAL_BOX_IDS.has(output.itemId)) {
      exclude(rawRecipe, "legacy-imperial-box", output.itemId, outputName);
      continue;
    }
    if (CLIENT_RETIRED_ITEM_IDS.has(output.itemId)) {
      exclude(rawRecipe, "client-retired-output", output.itemId, outputName);
      continue;
    }
    if (CLIENT_UNAVAILABLE_ITEM_IDS.has(output.itemId)) {
      exclude(rawRecipe, "client-unavailable-output", output.itemId, outputName);
      continue;
    }
    if (retiredItemName(outputName)) {
      exclude(rawRecipe, "event-or-retired-output", output.itemId, outputName);
      continue;
    }
    if (!String(outputItem.icon || "").trim()) {
      exclude(rawRecipe, "iconless-output", output.itemId, outputName);
      continue;
    }
    if (!Array.isArray(rawRecipe?.inputs) || !rawRecipe.inputs.length) {
      exclude(rawRecipe, "missing-ingredients", output.itemId, outputName);
      continue;
    }

    const inputs = [];
    let inputFailure = "";
    for (const rawInput of rawRecipe.inputs) {
      let input;
      try {
        input = itemRef(rawInput?.item);
      } catch {
        inputFailure = "invalid-ingredient-reference";
        break;
      }
      const item = itemsById.get(input.itemId);
      const name = String(item?.name || "").trim();
      const count = Number(rawInput?.count);
      if (!item) inputFailure = "missing-ingredient-item";
      else if (item.ghost) inputFailure = "retired-ingredient-ghost";
      else if (!name) inputFailure = "nameless-ingredient";
      else if (CLIENT_RETIRED_ITEM_IDS.has(input.itemId)) inputFailure = "client-retired-ingredient";
      else if (CLIENT_UNAVAILABLE_ITEM_IDS.has(input.itemId)) inputFailure = "client-unavailable-ingredient";
      else if (retiredItemName(name)) inputFailure = "event-or-retired-ingredient";
      else if (!String(item.icon || "").trim()) inputFailure = "iconless-ingredient";
      else if (!Number.isInteger(count) || count <= 0) inputFailure = "unknown-ingredient-quantity";
      if (inputFailure) break;
      inputs.push({
        itemId: input.itemId,
        rawId: input.rawId,
        count,
        ...(input.enhancement ? { enhancement: input.enhancement } : {})
      });
    }
    if (inputFailure) {
      exclude(rawRecipe, inputFailure, output.itemId, outputName);
      continue;
    }

    const normalized = {
      outputId: output.itemId,
      outputRawId: output.rawId,
      ...(output.enhancement ? { outputEnhancement: output.enhancement } : {}),
      type,
      ...(String(rawRecipe.station || "").trim() ? { station: String(rawRecipe.station).trim() } : {}),
      inputs
    };
    const signature = recipeSignature(normalized);
    if (signatures.has(signature)) {
      exclude(rawRecipe, "duplicate-recipe", output.itemId, outputName);
      continue;
    }
    signatures.add(signature);
    kept.push({
      id: recipeId(signature, output.itemId),
      outputId: output.itemId,
      ...(normalized.outputEnhancement ? { outputEnhancement: normalized.outputEnhancement } : {}),
      type,
      ...(normalized.station ? { station: normalized.station } : {}),
      inputs: inputs.map(({ rawId: _rawId, ...input }) => input),
      _outputName: outputName
    });
  }

  kept.sort((left, right) => left._outputName.localeCompare(right._outputName, "en")
    || left.type.localeCompare(right.type)
    || left.id.localeCompare(right.id));

  const referencedIds = new Set();
  for (const recipe of kept) {
    referencedIds.add(recipe.outputId);
    for (const input of recipe.inputs) referencedIds.add(input.itemId);
    delete recipe._outputName;
  }

  const items = {};
  for (const id of [...referencedIds].sort((left, right) => left - right)) {
    const item = itemsById.get(id);
    if (!item) fail(`Normalized recipe references missing item ${id}.`);
    items[id] = {
      name: String(item.name).trim(),
      description: cleanItemDescription(item.description),
      grade: Number.isInteger(Number(item.grade)) ? Number(item.grade) : 0,
      sourceIcon: String(item.icon || "").replace(/\\/g, "/").trim()
    };
  }

  const ids = new Set();
  for (const recipe of kept) {
    if (ids.has(recipe.id)) fail(`Stable recipe ID collision: ${recipe.id}`);
    ids.add(recipe.id);
  }

  return {
    schemaVersion: SCHEMA_VERSION,
    generatedAtUtc: source.snapshotUtc,
    source,
    filters: {
      excludesEventPrefixedItems: true,
      excludesRetiredGhostItems: true,
      excludesLegacyImperialBoxes: true,
      excludesClientRetiredItems: true,
      excludesClientUnavailableItems: true,
      excludesNonCraftableByproductProjections: true,
      excludesDuplicateRecipes: true,
      requiresKnownPositiveIngredientQuantities: true,
      requiresCurrentEnglishNamesAndIcons: true
    },
    counts: {
      rawRecipes: rawRecipes.length,
      recipes: kept.length,
      excludedRecipes: exclusions.length,
      items: Object.keys(items).length,
      recipeTypes: countBy(kept, recipe => recipe.type),
      exclusions: countBy(exclusions, exclusion => exclusion.reason)
    },
    items,
    recipes: kept,
    exclusions
  };
}

async function sourceMetadata(extractDirectory, gameDirectory) {
  const itemsFile = path.join(extractDirectory, "items.json");
  const recipesFile = path.join(extractDirectory, "recipes.json");
  const [itemsInfo, recipesInfo] = await Promise.all([stat(itemsFile), stat(recipesFile)]);
  const source = {
    kind: "installed-black-desert-client",
    locale: "en",
    snapshotUtc: gameDirectory
      ? ""
      : new Date(Math.max(itemsInfo.mtimeMs, recipesInfo.mtimeMs)).toISOString(),
    extractor: {
      repository: "https://github.com/iDevelopThings/bdo-data-extractor",
      commit: EXTRACTOR_COMMIT,
      compatibility: "2026-08 client item slot/footer layout"
    },
    files: {
      itemsSha256: await hashFile(itemsFile),
      recipesSha256: await hashFile(recipesFile)
    }
  };
  if (!gameDirectory) return source;

  const archive = path.join(gameDirectory, "Paz", "pad00000.meta");
  const localization = path.join(gameDirectory, "ads", "languagedata_en.loc");
  for (const [key, file] of [["archive", archive], ["localization", localization]]) {
    const info = await stat(file);
    source.files[key] = {
      bytes: info.size,
      modifiedUtc: info.mtime.toISOString(),
      sha256: await hashFile(file)
    };
    if (!source.snapshotUtc || info.mtimeMs > Date.parse(source.snapshotUtc)) {
      source.snapshotUtc = info.mtime.toISOString();
    }
  }
  return source;
}

async function prepare(args) {
  const extractDirectory = requiredArg(args, "extract-dir");
  const stageDirectory = requiredArg(args, "stage-dir");
  const gameDirectory = args.has("game-dir") ? requiredArg(args, "game-dir") : "";
  await ensureFreshDirectory(stageDirectory);

  const itemsFile = path.join(extractDirectory, "items.json");
  const recipesFile = path.join(extractDirectory, "recipes.json");
  const [rawItems, rawRecipes, source] = await Promise.all([
    readJson(itemsFile),
    readJson(recipesFile),
    sourceMetadata(extractDirectory, gameDirectory)
  ]);
  const plan = buildPlan(rawItems, rawRecipes, source);
  const iconItems = Object.entries(plan.items).map(([id, item]) => ({
    id: Number(id),
    icon: item.sourceIcon
  }));

  await Promise.all([
    writeFile(path.join(stageDirectory, "items.json"), stableJson(iconItems), "utf8"),
    writeFile(path.join(stageDirectory, "knowledge.json"), '{"entries":[]}\n', "utf8"),
    writeFile(path.join(stageDirectory, "zones.json"), "[]\n", "utf8"),
    writeFile(path.join(stageDirectory, "recipe-book-plan.json"), stableJson(plan), "utf8"),
    writeFile(path.join(stageDirectory, "filter-report.json"), stableJson({
      schemaVersion: SCHEMA_VERSION,
      generatedAtUtc: plan.generatedAtUtc,
      filters: plan.filters,
      counts: plan.counts,
      exclusions: plan.exclusions
    }, true), "utf8")
  ]);

  console.log(`Recipe Book plan prepared: ${plan.counts.recipes} recipes, ${plan.counts.items} items, ${plan.counts.excludedRecipes} exclusions.`);
  console.log(`Icon stage: ${stageDirectory}`);
}

function safeIconPath(value) {
  const normalized = String(value || "").replace(/\\/g, "/").toLowerCase();
  if (!normalized.startsWith("icons/")
    || normalized.startsWith("/")
    || normalized.includes(":")
    || normalized.split("/").some(segment => !segment || segment === "." || segment === "..")
    || !normalized.endsWith(".webp")) {
    fail(`Unsafe extracted icon path: ${value}`);
  }
  return normalized;
}

function fallbackSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="Item icon unavailable"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#132b36"/><stop offset="1" stop-color="#071019"/></linearGradient></defs><rect x="2" y="2" width="60" height="60" rx="12" fill="url(#g)" stroke="#4ddbe1" stroke-opacity=".48"/><path d="M18 43h28M22 39l4-17h12l4 17M27 29h10" fill="none" stroke="#8eeff2" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><circle cx="32" cy="18" r="3" fill="#8eeff2"/></svg>\n`;
}

function readUint24LittleEndian(data, offset) {
  return data[offset] | (data[offset + 1] << 8) | (data[offset + 2] << 16);
}

function webpMetadata(data, file) {
  if (data.length < 16 || data.subarray(0, 4).toString("ascii") !== "RIFF" || data.subarray(8, 12).toString("ascii") !== "WEBP") {
    fail(`Extracted icon is not a valid WebP container: ${file}`);
  }
  let width = 0;
  let height = 0;
  let encoding = "unknown";
  for (let offset = 12; offset + 8 <= data.length;) {
    const chunk = data.subarray(offset, offset + 4).toString("ascii");
    const size = data.readUInt32LE(offset + 4);
    const payload = offset + 8;
    if (payload + size > data.length) fail(`Extracted icon has a truncated WebP chunk: ${file}`);
    if (chunk === "VP8X" && size >= 10) {
      width = readUint24LittleEndian(data, payload + 4) + 1;
      height = readUint24LittleEndian(data, payload + 7) + 1;
    } else if (chunk === "VP8L" && size >= 5 && data[payload] === 0x2f) {
      const bits = data.readUInt32LE(payload + 1);
      width ||= (bits & 0x3fff) + 1;
      height ||= ((bits >>> 14) & 0x3fff) + 1;
      encoding = "lossless";
    } else if (chunk === "VP8 " && size >= 10 && data[payload + 3] === 0x9d && data[payload + 4] === 0x01 && data[payload + 5] === 0x2a) {
      width ||= data.readUInt16LE(payload + 6) & 0x3fff;
      height ||= data.readUInt16LE(payload + 8) & 0x3fff;
      encoding = "lossy";
    }
    offset = payload + size + (size & 1);
  }
  if (!width || !height || encoding === "unknown") fail(`Extracted icon has unsupported WebP image data: ${file}`);
  return { width, height, encoding };
}

async function validateWebp(file) {
  const data = await readFile(file);
  return { data, ...webpMetadata(data, file) };
}

async function finalize(args) {
  const stageDirectory = requiredArg(args, "stage-dir");
  const outputDirectory = requiredArg(args, "output-dir");
  await ensureFreshDirectory(outputDirectory);

  const plan = await readJson(path.join(stageDirectory, "recipe-book-plan.json"));
  const redirects = await readJson(path.join(stageDirectory, "asset_redirects.json"));
  if (plan?.schemaVersion !== SCHEMA_VERSION || !plan.items || !Array.isArray(plan.recipes)) {
    fail("Recipe Book stage plan has an unsupported schema.");
  }
  if (!redirects || Array.isArray(redirects) || typeof redirects !== "object") {
    fail("asset_redirects.json must contain an object.");
  }

  const fallbackPath = "icons/item-fallback.svg";
  const copied = new Map();
  const resolvedIcons = new Map();
  const referencedSourceIcons = new Set();
  const fallbackItems = [];
  const items = {};

  for (const [id, planned] of Object.entries(plan.items)) {
    const redirect = redirects[`urn::item:${id}`];
    let icon = fallbackPath;
    let fallbackReason = redirect ? "missing-client-artwork" : "missing-client-redirect";
    if (redirect) {
      const relative = safeIconPath(redirect);
      referencedSourceIcons.add(relative);
      const source = path.resolve(stageDirectory, relative.replaceAll("/", path.sep));
      const stageRoot = `${path.resolve(stageDirectory)}${path.sep}`;
      if (!source.startsWith(stageRoot)) fail(`Icon escaped its stage directory: ${relative}`);
      if (await pathExists(source)) {
        icon = resolvedIcons.get(relative) || "";
        if (!icon) {
          const image = await validateWebp(source);
          if (image.width === image.height) {
            const digest = sha256(image.data);
            icon = `icons/items/${digest}.webp`;
            resolvedIcons.set(relative, icon);
            const destination = path.resolve(outputDirectory, icon.replaceAll("/", path.sep));
            const outputRoot = `${path.resolve(outputDirectory)}${path.sep}`;
            if (!destination.startsWith(outputRoot)) fail(`Icon escaped its output directory: ${icon}`);
            if (!copied.has(icon)) {
              await mkdir(path.dirname(destination), { recursive: true });
              await copyFile(source, destination);
              copied.set(icon, { path: icon, bytes: image.data.length, sha256: digest, width: image.width, height: image.height, encoding: image.encoding });
            }
          } else {
            icon = fallbackPath;
            fallbackReason = "non-square-client-artwork";
          }
        }
      }
    }
    if (icon === fallbackPath) {
      fallbackItems.push({ id: Number(id), name: planned.name, sourceIcon: planned.sourceIcon, reason: fallbackReason });
    }
    items[id] = { name: planned.name, description: planned.description, grade: planned.grade, icon };
  }

  const fallback = Buffer.from(fallbackSvg(), "utf8");
  const fallbackFile = path.join(outputDirectory, ...fallbackPath.split("/"));
  await mkdir(path.dirname(fallbackFile), { recursive: true });
  await writeFile(fallbackFile, fallback);
  copied.set(fallbackPath, { path: fallbackPath, bytes: fallback.length, sha256: sha256(fallback), width: 64, height: 64, encoding: "svg" });

  const dataset = {
    schemaVersion: SCHEMA_VERSION,
    generatedAtUtc: plan.generatedAtUtc,
    source: plan.source,
    filters: plan.filters,
    counts: {
      ...plan.counts,
      uniqueIcons: copied.size - 1,
      fallbackIcons: fallbackItems.length
    },
    items,
    recipes: plan.recipes
  };
  const datasetJson = stableJson(dataset);
  const filterReport = await readFile(path.join(stageDirectory, "filter-report.json"));
  const iconFiles = [...copied.values()].sort((left, right) => left.path.localeCompare(right.path));
  const iconBytes = iconFiles.reduce((total, file) => total + file.bytes, 0);
  const iconEncodings = [...new Set(iconFiles.filter(file => file.path.endsWith(".webp")).map(file => file.encoding))].sort();
  const manifest = {
    schemaVersion: SCHEMA_VERSION,
    generatedAtUtc: plan.generatedAtUtc,
    dataset: {
      path: "recipes.json",
      bytes: Buffer.byteLength(datasetJson),
      sha256: sha256(datasetJson)
    },
    filterReport: {
      path: "filter-report.json",
      bytes: filterReport.length,
      sha256: sha256(filterReport)
    },
    icons: {
      itemAliases: Object.keys(items).length,
      clientSourceFiles: referencedSourceIcons.size,
      uniqueFiles: iconFiles.length,
      bytes: iconBytes,
      encoding: iconEncodings.length === 1 ? iconEncodings[0] : "mixed",
      fallbackItems,
      files: iconFiles
    }
  };
  const manifestJson = stableJson(manifest, true);
  const bundleId = `${sha256(manifestJson)}\n`;
  const notice = [
    "Black Spirit Hub Recipe Book",
    "",
    "Recipe facts, English item names and descriptions, and item icons were extracted from a legally installed Black Desert client for this non-commercial fan utility.",
    `Cached item artwork is stored as ${iconEncodings.length === 1 ? iconEncodings[0] : "mixed-encoding"} WebP at its native client dimensions; non-square client preview artwork is replaced with the bundled fallback.`,
    "Black Desert and all related game data and artwork are trademarks or copyrighted material of Pearl Abyss. Black Spirit Hub is unofficial and is not affiliated with or endorsed by Pearl Abyss.",
    "No BDO Codex, BDOlytics, or Black Desert Foundry editorial content or artwork is bundled."
  ].join("\r\n");

  await Promise.all([
    writeFile(path.join(outputDirectory, "recipes.json"), datasetJson, "utf8"),
    writeFile(path.join(outputDirectory, "filter-report.json"), filterReport),
    writeFile(path.join(outputDirectory, "manifest.json"), manifestJson, "utf8"),
    writeFile(path.join(outputDirectory, "bundle-id.txt"), bundleId, "utf8"),
    writeFile(path.join(outputDirectory, "NOTICE.txt"), `${notice}\r\n`, "utf8")
  ]);

  console.log(`Recipe Book finalized: ${dataset.counts.recipes} recipes, ${dataset.counts.items} items, ${dataset.counts.uniqueIcons} extracted icons.`);
  console.log(`Icon payload: ${iconBytes.toLocaleString("en-US")} bytes; ${fallbackItems.length} items use the bundled fallback.`);
  console.log(`Output: ${outputDirectory}`);
}

function usage() {
  console.error("Usage:");
  console.error("  node scripts/build-recipe-book-data.mjs prepare --extract-dir DIR --stage-dir DIR [--game-dir DIR]");
  console.error("  node scripts/build-recipe-book-data.mjs finalize --stage-dir DIR --output-dir DIR");
}

const [command, ...rest] = process.argv.slice(2);
try {
  const args = parseArgs(rest);
  if (command === "prepare") await prepare(args);
  else if (command === "finalize") await finalize(args);
  else {
    usage();
    process.exitCode = 2;
  }
} catch (error) {
  console.error(`Recipe Book data build failed: ${error.message}`);
  process.exitCode = 1;
}
