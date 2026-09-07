import assert from "node:assert/strict";
import fs from "node:fs/promises";
import http from "node:http";
import { createRequire } from "node:module";
import path from "node:path";

// Optional browser regression test. Use an installed Playwright package, or:
// node scripts/test-navigation-layout.mjs <UI.js> --playwright-dir <package-directory>
// Optional: --browser-executable <path> and --screenshots <output-directory>.
const [scriptPath, ...argumentsList] = process.argv.slice(2);
assert.ok(scriptPath, "Pass the Black Spirit Hub JavaScript path.");
assert.equal(argumentsList.length % 2, 0, "Browser options require a value.");
const options = new Map();
for (let index = 0; index < argumentsList.length; index += 2) {
  assert.ok(["--playwright-dir", "--browser-executable", "--screenshots"].includes(argumentsList[index]), "Unknown browser option: " + argumentsList[index]);
  options.set(argumentsList[index], argumentsList[index + 1]);
}
const require = createRequire(import.meta.url);
const { chromium } = require(options.get("--playwright-dir") || "playwright");
const resourceRoot = path.resolve(path.dirname(scriptPath));
const htmlName = path.basename(scriptPath).replace(/\.js$/i, ".html");
const contentTypes = { ".html": "text/html", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".woff2": "font/woff2" };
const server = http.createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    const filePath = path.resolve(resourceRoot, "." + pathname);
    const relativePath = path.relative(resourceRoot, filePath);
    if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
      response.writeHead(403).end();
      return;
    }
    const extension = path.extname(filePath);
    let content = await fs.readFile(filePath);
    // Native-host app initialization is tested separately. Keep the actual page
    // and stylesheet while preventing services, timers, and data calls here.
    if (extension === ".html") content = content.toString("utf8").replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
    response.writeHead(200, { "Content-Type": contentTypes[extension] || "application/octet-stream" }).end(content);
  } catch {
    response.writeHead(404).end();
  }
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const origin = "http://127.0.0.1:" + server.address().port;
let browser;
try {
  const executablePath = options.get("--browser-executable");
  browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : process.platform === "win32" ? { channel: "msedge" } : {}) });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" });
  await page.route("**/*", (route) => route.request().url().startsWith(origin + "/") ? route.continue() : route.abort());
  await page.goto(origin + "/" + encodeURIComponent(htmlName), { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);

  const sprite = await page.evaluate(async () => {
    const reference = document.querySelector(".appNav .navGlyph use").getAttribute("href");
    const response = await fetch(reference.split("#")[0]);
    const xml = new DOMParser().parseFromString(await response.text(), "image/svg+xml");
    return {
      status: response.status,
      parserError: xml.querySelector("parsererror")?.textContent || null,
      namespace: xml.documentElement.namespaceURI,
      symbols: [...xml.querySelectorAll("symbol")].map((symbol) => ({ id: symbol.id, viewBox: symbol.getAttribute("viewBox") })),
      paints: [...xml.querySelectorAll("*")].flatMap((element) => [...element.attributes].filter((attribute) => ["fill", "stroke", "color", "stop-color", "flood-color", "lighting-color"].includes(attribute.name)).map((attribute) => attribute.value)),
      forbiddenElements: [...xml.querySelectorAll("image, foreignObject, script, style")].map((element) => element.tagName),
    };
  });
  assert.equal(sprite.status, 200, "The browser must load the shared navigation sprite.");
  assert.equal(sprite.parserError, null, "The navigation sprite must be well-formed XML: " + sprite.parserError);
  assert.equal(sprite.namespace, "http://www.w3.org/2000/svg");
  assert.equal(sprite.symbols.length, 17);
  assert.equal(new Set(sprite.symbols.map((symbol) => symbol.id)).size, 17);
  assert.ok(sprite.symbols.every((symbol) => symbol.viewBox === "0 0 64 64"));
  assert.ok(sprite.paints.length > 0 && sprite.paints.every((paint) => ["currentColor", "none"].includes(paint)), "Every SVG paint must inherit the active theme.");
  assert.deepEqual(sprite.forbiddenElements, []);

  const styles = await page.locator("#interfaceStyle option").evaluateAll((elements) => elements.map((element) => element.value));
  assert.equal(styles.length, 13);
  const widths = [
    [1440, [8, 8]], [1080, [8, 8]], [901, [8, 8]],
    [900, [6, 6, 4]], [651, [6, 6, 4]],
    [650, [4, 4, 4, 4]], [481, [4, 4, 4, 4]],
    [480, [3, 3, 3, 3, 3, 1]], [360, [3, 3, 3, 3, 3, 1]],
  ];
  const readLayout = async () => page.evaluate(() => {
    const rectangle = (element) => {
      const value = element.getBoundingClientRect();
      return { x: value.x, y: value.y, width: value.width, height: value.height, right: value.right, bottom: value.bottom };
    };
    const obsoletePseudoIcon = (element, pseudo) => {
      const style = getComputedStyle(element, pseudo);
      const visible = !["none", "normal"].includes(style.content) && style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity) !== 0;
      // Empty, gradient-only pseudos form the shared glass mount. Text glyphs,
      // raster artwork, and old per-theme icon masks must not reappear.
      return visible && (style.content !== '""' || style.maskImage !== "none" || /url\(/i.test(style.backgroundImage));
    };
    const frame = document.querySelector('.navFrame[data-nav-design="arcane-glass"]');
    const nav = frame.querySelector(".appNav");
    return {
      frame: rectangle(frame), nav: rectangle(nav), pin: rectangle(frame.querySelector(".navPinButton")),
      overflow: { client: nav.clientWidth, scroll: nav.scrollWidth },
      crestVisible: [...document.querySelectorAll(".navCrest, .headerCenterCrest")].some((element) => {
        const style = getComputedStyle(element);
        return style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity) !== 0;
      }),
      buttons: [...nav.querySelectorAll(":scope > .navButton[data-app-view]")].map((button) => {
        const icon = button.querySelector(".navIcon");
        const glyph = button.querySelector(".navGlyph");
        const label = button.querySelector(".navLabel");
        const style = getComputedStyle(button);
        const labelStyle = getComputedStyle(label);
        const range = document.createRange();
        range.selectNodeContents(label);
        const bbox = glyph.getBBox();
        return {
          view: button.dataset.appView, box: rectangle(button), icon: rectangle(icon), glyph: rectangle(glyph), label: rectangle(label),
          text: [...range.getClientRects()].map((value) => ({ x: value.x, y: value.y, right: value.right, bottom: value.bottom })),
          textOverflow: label.scrollWidth > label.clientWidth + 1 || label.scrollHeight > label.clientHeight + 1,
          glyphRendered: bbox.width > 0 && bbox.height > 0,
          obsoleteIcon: obsoletePseudoIcon(icon, "::before") || obsoletePseudoIcon(icon, "::after"),
          font: [labelStyle.fontFamily, labelStyle.fontSize, labelStyle.fontWeight, labelStyle.letterSpacing, labelStyle.textAlign],
          shape: [style.borderRadius, style.clipPath, style.maskImage, style.transform, getComputedStyle(icon).borderRadius],
          background: style.backgroundImage,
        };
      }),
    };
  });
  const near = (actual, expected, message, tolerance = 1.1) => assert.ok(Math.abs(actual - expected) <= tolerance, message + ": " + actual + " vs " + expected);
  const geometry = (layout) => layout.buttons.map((button) => ({
    x: Math.round((button.box.x - layout.nav.x) * 10), y: Math.round((button.box.y - layout.nav.y) * 10),
    width: Math.round(button.box.width * 10), height: Math.round(button.box.height * 10),
    iconWidth: Math.round(button.icon.width * 10), iconHeight: Math.round(button.icon.height * 10),
    glyphWidth: Math.round(button.glyph.width * 10), glyphHeight: Math.round(button.glyph.height * 10),
    labelTop: Math.round((button.label.y - button.box.y) * 10), font: button.font, shape: button.shape,
  }));
  let combinations = 0;
  for (const [width, rowCounts] of widths) {
    await page.setViewportSize({ width, height: 1100 });
    let referenceGeometry;
    for (const style of styles) {
      await page.evaluate((style) => {
        document.body.dataset.style = style;
        document.body.dataset.motion = "reduced";
        document.body.classList.add("navPinned");
      }, style);
      const layout = await readLayout();
      const context = style + " at " + width + "px";
      assert.equal(layout.buttons.length, 16, context);
      assert.ok(layout.frame.x >= -1 && layout.frame.right <= width + 1, context + " frame must fit the viewport.");
      assert.ok(layout.overflow.scroll <= layout.overflow.client + 1, context + " must wrap without horizontal navigation scrolling.");
      assert.ok(layout.pin.x >= layout.frame.right, context + " pin must sit outside the right edge.");
      near(layout.pin.y, layout.frame.y, context + " pin must align with the top edge");
      assert.ok(layout.pin.right <= width + 1, context + " pin must remain within the viewport.");
      if (style === "custom") assert.equal(layout.crestVisible, false, "Custom must hide the obsolete center crests.");
      const rows = [];
      for (const button of layout.buttons) {
        const row = rows.at(-1);
        if (!row || Math.abs(row[0].box.y - button.box.y) > 1) rows.push([button]);
        else row.push(button);
        near(button.box.width, layout.buttons[0].box.width, context + " equal button widths");
        near(button.box.height, layout.buttons[0].box.height, context + " equal button heights");
        assert.ok(button.box.height <= 88, context + " navigation buttons must retain their compact height.");
        near(button.icon.x + button.icon.width / 2, button.box.x + button.box.width / 2, context + " centered icon mount");
        near(button.glyph.x + button.glyph.width / 2, button.box.x + button.box.width / 2, context + " centered glyph");
        near(button.label.x + button.label.width / 2, button.box.x + button.box.width / 2, context + " centered label");
        assert.ok(button.icon.bottom <= button.label.y + 1, context + " icon must sit above the label for " + button.view);
        assert.equal(button.font.at(-1), "center", context + " text alignment");
        assert.equal(button.textOverflow, false, context + " label must fit: " + button.view);
        for (const line of button.text) assert.ok(line.x >= button.box.x - 1 && line.right <= button.box.right + 1 && line.y >= button.box.y - 1 && line.bottom <= button.box.bottom + 1, context + " label must remain inside its button: " + button.view);
        assert.equal(button.glyphRendered, true, context + " SVG must render: " + button.view);
        assert.equal(button.obsoleteIcon, false, context + " old pseudo-icons must stay suppressed: " + button.view);
        assert.doesNotMatch(button.background, /url\(/i, context + " buttons must use the shared glass surface.");
      }
      assert.deepEqual(rows.map((row) => row.length), rowCounts, context + " responsive rows");
      for (const row of rows) near((row[0].box.x + row.at(-1).box.right) / 2, layout.nav.x + layout.nav.width / 2, context + " centered rows");
      const currentGeometry = geometry(layout);
      if (referenceGeometry) assert.deepEqual(currentGeometry, referenceGeometry, context + " themes must preserve button shape, typography and icon placement.");
      else referenceGeometry = currentGeometry;
      combinations += 1;
    }
  }

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.evaluate(() => { document.body.dataset.style = "custom"; document.body.dataset.mode = "light"; });
  const customLight = await readLayout();
  assert.equal(customLight.buttons.length, 16);
  assert.equal(customLight.crestVisible, false);
  for (const [reducedMotion, appMotion] of [["no-preference", "full"], ["no-preference", "reduced"], ["reduce", "full"]]) {
    await page.emulateMedia({ reducedMotion });
    await page.evaluate((motion) => { document.body.dataset.mode = "dark"; document.body.dataset.motion = motion; }, appMotion);
    await page.mouse.move(0, 900);
    const before = await readLayout();
    await page.locator('.navButton[data-app-view="calculatorView"]').hover();
    await page.waitForTimeout(450);
    const hovered = await readLayout();
    assert.deepEqual(geometry(hovered), geometry(before), "Hover must not move or resize navigation, including under reduced motion.");
    await page.evaluate(() => document.querySelector('[data-app-view="calculatorView"]').classList.add("active"));
    const active = await readLayout();
    assert.deepEqual(geometry(active), geometry(before), "Active navigation must preserve button and glyph geometry.");
    if (reducedMotion === "reduce" || appMotion === "reduced") {
      const animated = await page.locator(".appNav .navButton, .appNav .navButton *").evaluateAll((elements) => elements.flatMap((element) => [null, "::before", "::after"].flatMap((pseudo) => {
        const style = getComputedStyle(element, pseudo);
        const moving = style.transitionDuration.split(",").some((duration) => parseFloat(duration) > 0.001) || style.animationName.split(",").some((name) => name.trim() && name.trim() !== "none");
        return moving ? [{ element: element.getAttribute("class") || element.tagName, pseudo, transition: style.transitionDuration, animation: style.animationName }] : [];
      })));
      assert.deepEqual(animated.slice(0, 5), [], "Reduced motion must disable navigation animations and transitions.");
    }
    await page.evaluate(() => document.querySelector('[data-app-view="calculatorView"]').classList.remove("active"));
  }
  const screenshotDirectory = options.get("--screenshots");
  if (screenshotDirectory) {
    await fs.mkdir(screenshotDirectory, { recursive: true });
    for (const [width, style] of [[1388, "custom"], [1100, "royal"], [650, "cyber"], [360, "paper"]]) {
      await page.setViewportSize({ width, height: 1100 });
      await page.mouse.move(0, 1000);
      await page.evaluate((style) => { document.body.dataset.style = style; }, style);
      const frame = await page.locator(".navFrame").boundingBox();
      const clip = { x: Math.max(0, frame.x - 3), y: frame.y, width: Math.min(width - Math.max(0, frame.x - 3), frame.width + 36), height: frame.height + 6 };
      await page.screenshot({ path: path.join(screenshotDirectory, "navigation-" + style + "-" + width + ".png"), clip });
      if (width === 1388) {
        await page.locator('.navButton[data-app-view="calculatorView"]').hover();
        await page.screenshot({ path: path.join(screenshotDirectory, "navigation-custom-1388-hover.png"), clip });
      }
    }
  }
  console.log("Arcane Glass browser verification passed: " + combinations + " theme/width combinations, rendered SVG/XML, wrapping, labels, lock, hover and reduced motion.");
} finally {
  if (browser) await browser.close();
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}
