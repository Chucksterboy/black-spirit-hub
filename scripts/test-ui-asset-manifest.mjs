import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createManifest } from './generate-ui-asset-manifest.mjs';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'bsh-ui-asset-manifest-'));
try {
  const put = (relative, content) => {
    const target = path.join(root, relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content);
  };
  put('Assets/GrindTracker/spots.js', 'first');
  put('Assets/RecipeBook/recipes.json', 'immutable host');
  put('NavigationAssets/nav-icons.svg', 'icons');
  put('ThemeAssets/frame.svg', 'frame');
  put('BlackSpiritHub.Resources.gold-coins.png', 'published mapping');
  const first = createManifest(root);
  assert.deepEqual(first, createManifest(root), 'Stable manifest with no timestamp or version dependency.');
  assert.equal(first.files.length, 4);
  assert.equal(first.files.some(file => file.path.includes('RecipeBook')), false);
  assert.equal(first.files.some(file => file.path === 'gold-coins.png'), true);
  put('Assets/GrindTracker/spots.js', 'other');
  const updated = createManifest(root);
  assert.notEqual(updated.bundleId, first.bundleId, 'Same-length content hotfix changes bundle identity.');
  put('Assets/MasteryIcons/new.svg', 'new');
  assert.equal(createManifest(root).files.length, 5);
  console.log('UI asset manifest generator tests passed.');
} finally {
  // Unique fixture directory only, never source, workspace, or application data.
  fs.rmSync(root, { recursive: true, force: true });
}

const source = path.resolve(process.argv[2] ?? 'Source Code');
const program = fs.readFileSync(path.join(source, 'BlackSpiritHub/Program.cs'), 'utf8');
const acquire = program.indexOf('using Mutex singleInstanceMutex');
assert.ok(acquire > 0 && acquire < program.indexOf('AppPaths appPaths3 = AppPaths.Create()'),
  'Normal single-instance ownership is checked before migration/asset preparation.');
assert.match(program, /if \(!runScheduledMarketUpdate\) PrepareUiFiles\(appPaths3\)/,
  'Headless market collectors do not prepare WebView assets.');
assert.match(program, /CopyFileIfChanged\(htmlSource, paths.HtmlPath\)/, 'Core HTML remains content-aware.');
assert.match(program, /CopyFileIfChanged\(cssSource, cssTarget\)/, 'Core CSS remains content-aware.');
assert.match(program, /CopyFileIfChanged\(scriptSource, scriptTarget\)/, 'Core JavaScript remains content-aware.');
assert.match(program, /UiAssetManifest.Sync\(baseDirectory, paths.Root\)/);
console.log('Startup asset integration source checks passed. Run --ui-assets-smoke-test for native workflow/counter tests.');
