import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const sourceRoot = process.argv[2] ? path.resolve(process.argv[2]) : path.join(repoRoot, "Source Code");
const splashPath = path.join(sourceRoot, "BlackSpiritHub", "StartupSplashWindow.cs");
const formPath = path.join(sourceRoot, "BlackSpiritHub", "CalculatorForm.cs");
const programPath = path.join(sourceRoot, "BlackSpiritHub", "Program.cs");
const iconPath = path.join(sourceRoot, "Assets", "AppIcon", "app-icon-ui.png");

for (const requiredPath of [splashPath, formPath, programPath, iconPath]) {
  assert.ok(fs.existsSync(requiredPath), `Missing startup dependency: ${requiredPath}`);
}

const splash = fs.readFileSync(splashPath, "utf8");
const form = fs.readFileSync(formPath, "utf8");
const program = fs.readFileSync(programPath, "utf8");

for (const state of ["Intro", "Holding", "Exiting", "Error", "Restoring", "Hidden"]) {
  assert.match(splash, new RegExp(`\\b${state}\\b`), `Startup lifecycle is missing ${state}`);
}

function numericConstant(name) {
  const match = splash.match(new RegExp(`const int ${name} = ([0-9_]+);`));
  assert.ok(match, `Missing ${name}`);
  return Number(match[1].replaceAll("_", ""));
}

const pulseDuration = numericConstant("PulseCycleDurationMilliseconds");
const pulseCount = numericConstant("PulseCycleCount");
const minimumDuration = numericConstant("MinimumColdLaunchDurationMilliseconds");
const exitDuration = numericConstant("ExitFadeDurationMilliseconds");
const animationInterval = numericConstant("AnimationIntervalMilliseconds");
assert.equal(pulseDuration, 900, "Each startup pulse must last 900 ms");
assert.equal(pulseCount, 3, "Cold start must show exactly three strong pulses");
assert.equal(minimumDuration, pulseDuration * pulseCount, "Cold-start minimum must equal all three pulse cycles");
assert.equal(exitDuration, 420, "Startup fade must remain approximately 420 ms");
assert.ok(animationInterval <= 16, "Native animation should target a 60 FPS-class cadence");

assert.match(splash, /return ready && elapsedMilliseconds >= MinimumColdLaunchDurationMilliseconds;/, "Cold exit must require readiness and the full minimum duration");
assert.match(splash, /return ready\s*&& \(!coldMinimumRequired\s*\|\| coldLaunchElapsedMilliseconds >= MinimumColdLaunchDurationMilliseconds\);/, "Initial recovery must retain the cold minimum while later recovery exits as soon as ready");
assert.doesNotMatch(splash, /force.?ready|watchdog|\b8_?000\b|TimeSpan\.FromSeconds\(8\)/i, "The startup overlay must not contain a fail-open watchdog");
assert.doesNotMatch(splash, /Task\.Delay/, "Splash lifecycle must stay on its UI-thread timer");
assert.match(splash, /System\.Windows\.Forms\.Timer \{ Interval = AnimationIntervalMilliseconds \}/, "Animation must use a responsive WinForms timer");
assert.match(splash, /Stopwatch animationClock/, "Animation must use monotonic elapsed time");
assert.match(splash, /Stopwatch coldLaunchClock/, "Cold-start timing must survive a WebView recreation before first reveal");
assert.match(splash, /sealed class SplashAnimationSurface : Control/, "Animation must repaint through a small dedicated surface");
assert.match(splash, /animationSurface\.Invalidate\(\);/, "Animation ticks must invalidate only the bounded center surface");
assert.match(splash, /CreateDitheredBackground/, "The static dark background must use a dithered cache to prevent visible banding");
assert.doesNotMatch(splash, /gridPen|PathGradientBrush|DrawRadialGlow/, "The splash must not restore the striped grid or band-prone GDI+ radial glows");
assert.match(splash, /state != StartupSplashState\.Exiting && !reducedMotion/, "Exit frames must freeze before the compositor opacity fade");
assert.match(splash, /timeBeginPeriod\(TimerResolutionMilliseconds\)/, "The short startup animation should request stable timer cadence");
assert.match(splash, /Math\.Cos\(phase \* Math\.PI \* 2d\)/, "The aura pulse must use a continuous sinusoidal envelope without a velocity cusp");

assert.match(splash, /sealed class StartupSplashWindow : Form/, "The fade must use an owned native window rather than an alpha-painted WebView sibling");
assert.match(splash, /protected override bool ShowWithoutActivation => true;/, "The owned splash must not steal activation from the main window");
assert.match(splash, /parameters\.ExStyle \|= WsExToolWindow \| WsExNoActivate;/, "The splash must remain a non-activating tool window");
assert.match(splash, /Opacity = Math\.Clamp\(opacity, 0d, 1d\);/, "The exit must drive native top-level window opacity");
assert.match(splash, /nativeOpacitySupported = false;[\s\S]*?Opacity = 1d;/, "A failed opacity transition must retain a safe opaque handoff");
assert.match(splash, /ownerForm\.LocationChanged \+= OnOwnerBoundsChanged;[\s\S]*?ownerForm\.VisibleChanged \+= OnOwnerVisibleChanged;/, "The owned overlay must follow move, resize, minimize, and tray visibility");
assert.match(splash, /Bounds = ownerForm\.Bounds;/, "The splash must remain full-window at every owner size and DPI");
assert.doesNotMatch(splash, /SetLayeredWindowAttributes|WsExLayered/, "The implementation must not rely on unreliable child-window alpha over WebView2");
assert.match(splash, /SpiGetClientAreaAnimation = 0x1042/, "Startup must respect the Windows client-animation preference");
assert.match(splash, /!SystemInformation\.UIEffectsEnabled \|\| SystemInformation\.HighContrast/, "Reduced-motion detection must combine managed accessibility settings");
assert.doesNotMatch(splash, /exitExpansion|ghostAlpha/, "The exit must not resample or ghost the logo while fading");

const pngPreference = splash.indexOf('"app-icon-ui.png"');
const icoFallback = splash.indexOf('"app-icon.ico"');
assert.ok(pngPreference >= 0 && icoFallback > pngPreference, "The native splash must prefer the packaged UI PNG before the ICO fallback");
const icon = fs.readFileSync(iconPath);
assert.equal(icon.readUInt32BE(16), 256, "Packaged startup artwork must retain its 256px width");
assert.equal(icon.readUInt32BE(20), 256, "Packaged startup artwork must retain its 256px height");

assert.doesNotMatch(form, /loadingLabel/, "The plain startup loading label must be fully removed");
const shownBlock = form.match(/protected override async void OnShown\(EventArgs e\)[\s\S]*?\n\t\}/)?.[0] ?? "";
assert.ok(shownBlock.indexOf("startupSplash.StartColdLaunch();") >= 0, "Cold-start animation must begin when the form is shown");
assert.ok(shownBlock.indexOf("startupSplash.StartColdLaunch();") < shownBlock.indexOf("await InitializeAsync();"), "Cold-start animation must start before asynchronous initialization");

const readinessStart = form.indexOf("private async Task InitializeMainWebViewControlAsync(");
const readinessEnd = form.indexOf("private void ConfigureMainWebView", readinessStart);
const readinessBlock = form.slice(readinessStart, readinessEnd);
const healthCheck = readinessBlock.indexOf('Boolean(document.readyState === \'complete\' && document.body)');
const reveal = readinessBlock.indexOf("target.Visible = true;");
const readySignal = readinessBlock.indexOf("startupSplash.MarkApplicationReady();");
assert.ok(healthCheck >= 0 && reveal > healthCheck && readySignal > reveal, "The WebView must pass document health before it is revealed beneath the splash and marked ready");
assert.match(readinessBlock, /WaitAsync\(TimeSpan\.FromSeconds\(20\), cancellationToken\)/, "The existing 20-second navigation timeout must remain intact");
assert.match(form, /DefaultBackgroundColor = Color\.FromArgb\(7, 17, 31\)/, "The hidden WebView surface must stay dark beneath the fade");
assert.match(form, /marketInitializationTask = Task\.Run\([\s\S]*?marketService\.InitializeAsync\(cancellationToken\)/, "Synchronous SQLite startup work must not starve splash frames on the UI thread");

const recoveryStart = form.indexOf("private async Task RecreateMainWebViewAsync(");
const recoveryEnd = form.indexOf("private void CancelActiveBridgeRequests", recoveryStart);
const recoveryBlock = form.slice(recoveryStart, recoveryEnd);
assert.match(recoveryBlock, /startupSplash\.ShowRestoring\("Restoring Black Spirit Hub\.\.\."\);/, "Recovery must show the short restoring state");
assert.doesNotMatch(recoveryBlock, /StartColdLaunch/, "Recovery must not replay the mandatory cold-start sequence");
assert.match(recoveryBlock, /replacement\.SendToBack\(\);[\s\S]*?startupSplash\.BringToFront\(\);/, "Replacement WebView z-order must remain behind the native overlay");
assert.match(form, /private void ShowError\(string message\)[\s\S]*?startupSplash\.ShowError\(message\);[\s\S]*?webView\.Visible = false;/, "Terminal startup errors must stop on a readable native error state");
assert.match(form, /lifetimeCancellation\.Cancel\(\);[\s\S]*?startupSplash\.Stop\(\);/, "Closing must stop the splash timer");
assert.match(splash, /protected override void Dispose\(bool disposing\)[\s\S]*?animationTimer\.Dispose\(\);[\s\S]*?markImage\.Dispose\(\);/, "Parent-control disposal must release the timer, caches, and owned image");

assert.doesNotMatch(program, /StartColdLaunch|ShowRestoring\("Restoring Black Spirit Hub/, "Single-instance and tray orchestration must not replay the splash");

console.log("Native startup splash regression checks passed.");
