import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const manifestName = 'ui-assets-manifest.json';
export const assetRoots = ['Assets', 'NavigationAssets', 'ThemeAssets'];
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');

export function createManifest(root) {
  const files = [];
  function visit(relative) {
    const absolute = path.join(root, relative);
    if (!fs.existsSync(absolute)) return;
    const stat = fs.lstatSync(absolute);
    if (stat.isSymbolicLink()) throw new Error(`Asset symlinks are not supported: ${relative}`);
    if (relative === 'Assets/RecipeBook') return; // Served from its immutable installed host.
    if (stat.isDirectory()) {
      for (const name of fs.readdirSync(absolute).sort()) visit(`${relative}/${name}`);
    } else if (stat.isFile()) {
      const bytes = fs.readFileSync(absolute);
      files.push({ path: relative, length: bytes.length, sha256: sha256(bytes) });
    }
  }
  for (const relative of assetRoots) visit(relative);
  const goldSource = fs.existsSync(path.join(root, 'gold-coins.png'))
    ? 'gold-coins.png' : 'BlackSpiritHub.Resources.gold-coins.png';
  if (fs.existsSync(path.join(root, goldSource))) {
    const bytes = fs.readFileSync(path.join(root, goldSource));
    files.push({ path: 'gold-coins.png', length: bytes.length, sha256: sha256(bytes) });
  }
  files.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
  if (!files.length) throw new Error('No UI assets found. Check the source directory.');
  const canonical = files.map(file => `${file.path}\t${file.length}\t${file.sha256}\n`).join('');
  return { schemaVersion: 1, bundleId: sha256(canonical), files };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const root = path.resolve(args.find(arg => arg !== '--check') ?? 'Source Code');
  const target = path.join(root, manifestName);
  const content = `${JSON.stringify(createManifest(root), null, 2)}\n`;
  if (args.includes('--check')) {
    if (!fs.existsSync(target) || fs.readFileSync(target, 'utf8') !== content) {
      throw new Error(`UI asset manifest is absent or stale. Run: node scripts/generate-ui-asset-manifest.mjs "${root}"`);
    }
    console.log('UI asset manifest matches the complete mutable asset bundle.');
  } else {
    if (!fs.existsSync(target) || fs.readFileSync(target, 'utf8') !== content) fs.writeFileSync(target, content);
    const data = JSON.parse(content);
    console.log(`UI asset manifest: ${data.files.length} files, ${data.files.reduce((sum, item) => sum + item.length, 0)} bytes, bundle ${data.bundleId}.`);
  }
}
