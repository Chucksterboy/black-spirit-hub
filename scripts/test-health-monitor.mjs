import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const sourceRoot=process.argv[2];
if(!sourceRoot)throw new Error("Pass the Source Code directory.");
const js=fs.readFileSync(path.join(sourceRoot,"BlackSpiritHub.Resources.Black_Spirit_Hub.js"),"utf8");
const css=fs.readFileSync(path.join(sourceRoot,"BlackSpiritHub.Resources.Black_Spirit_Hub.css"),"utf8");
const html=fs.readFileSync(path.join(sourceRoot,"BlackSpiritHub.Resources.Black_Spirit_Hub.html"),"utf8");
const calculator=fs.readFileSync(path.join(sourceRoot,"BlackSpiritHub","CalculatorForm.cs"),"utf8");
const healthService=fs.readFileSync(path.join(sourceRoot,"BlackSpiritHub","AppHealthService.cs"),"utf8");
const database=fs.readFileSync(path.join(sourceRoot,"BlackSpiritHub","MarketDatabase.cs"),"utf8");

const functionSource=name=>{
  const start=js.indexOf(`function ${name}(`);
  assert.ok(start>=0,`Missing ${name}().`);
  let cursor=js.indexOf("{",start),depth=0,quote="";
  for(;cursor<js.length;cursor++){
    const ch=js[cursor],prev=js[cursor-1];
    if(quote){if(ch===quote&&prev!=="\\")quote="";continue}
    if(ch==='"'||ch==="'"||ch==='`'){quote=ch;continue}
    if(ch==="{")depth++;
    else if(ch==="}"&&--depth===0)return js.slice(start,cursor+1);
  }
  throw new Error(`Could not isolate ${name}().`);
};

assert.match(html,/<footer class="appStatusBar" aria-label="Black Spirit Hub status">/);
assert.match(html,/<button id="appHealthMonitor" class="bsh-status-health bsh-status-health--checking"[^>]*aria-busy="true"/);
assert.match(html,/<span class="bsh-status-ecg" aria-hidden="true"><svg viewBox="0 0 46 28" role="presentation">/);
assert.match(html,/<path class="bsh-status-ecg-baseline" d="M1 14H45" \/>/);
assert.match(html,/<path class="bsh-status-ecg-trace" d="M1 14H10L13 11L16 22L21 4L25 18L29 12L33 14H45" \/>/);
assert.match(html,/<span class="bsh-status-health-copy" role="status" aria-live="polite"><small>Health<\/small><strong>Checking core systems\.\.\.<\/strong><\/span>/);
assert.doesNotMatch(html,/class="statusReady"/,"the old unconditional Ready indicator must not contradict real health");

assert.match(css,/:root\{--bsh-status-bar-height:50px/);
assert.match(css,/\.bsh-status-ecg\{width:38px;height:34px;[^}]*border-radius:7px;[^}]*background-size:7px 7px/);
assert.match(css,/\.bsh-status-ecg-trace\{[^}]*stroke-width:1\.55;[^}]*stroke-linecap:round;[^}]*animation:bsh-status-ecg-travel 1\.7s linear infinite/);
assert.match(css,/\.appStatusBar::after\{[^}]*animation:bsh-status-line-scan 3\.4s linear infinite/);
assert.match(css,/\.bsh-status-health-copy small\{color:#d8b36d/);
for(const phase of ["checking","degraded","error"])assert.match(css,new RegExp(`\\.bsh-status-health--${phase}`));
assert.match(css,/@media\(prefers-reduced-motion:reduce\)\{\.appStatusBar \*/);
assert.match(css,/body\{padding-bottom:calc\(var\(--bsh-status-bar-height\) \+ 8px\)!important\}/);
assert.match(css,/\.toastHost\{bottom:calc\(var\(--bsh-status-bar-height\) \+ 10px\)!important\}/);

const decisionContext=vm.createContext({});
new vm.Script(functionSource("healthStateFromPayload")).runInContext(decisionContext);
const decide=payload=>vm.runInContext(`healthStateFromPayload(${JSON.stringify(payload)})`,decisionContext);
assert.equal(decide({databaseReadable:false,contentIndexReadable:true,contentCount:1}).label,"Hub database unavailable");
assert.equal(decide({databaseReadable:true,contentIndexReadable:false,contentCount:1}).label,"Content index unavailable");
assert.equal(decide({databaseReadable:true,contentIndexReadable:true,contentCount:0}).label,"Content index unavailable");
assert.equal(decide({databaseReadable:true,contentIndexReadable:true,contentCount:7100,lastRefreshStatus:"failed",stale:true}).label,"Latest refresh needs attention","failed refresh must outrank stale");
assert.equal(decide({databaseReadable:true,contentIndexReadable:true,contentCount:7100,lastRefreshStatus:"success",stale:true}).label,"Catalogue refresh overdue");
assert.equal(decide({databaseReadable:true,contentIndexReadable:true,contentCount:7100,degradedReasons:["One subsystem is recovering."]}).label,"Hub needs attention");
const healthy=decide({databaseReadable:true,contentIndexReadable:true,contentCount:7100,lastRefreshStatus:"success"});
assert.equal(healthy.phase,"healthy");
assert.equal(healthy.label,"All systems functional");

assert.match(js,/const HEALTH_CHECK_INTERVAL_MS=15\*60_000/);
assert.match(js,/bridgeCall\("healthCheck",\{\}\)/);
assert.match(js,/if\(running\|\|disposed\)return/);
assert.match(js,/document\.visibilityState==="visible"/);
assert.match(js,/document\.addEventListener\("visibilitychange",onVisibility\)/);
assert.match(js,/window\.addEventListener\("pagehide",onPageHide,\{once:true\}\)/);
assert.match(js,/Browser preview active/);
assert.match(js,/healthCheck:6000/);
assert.equal((js.match(/webview\?\.addEventListener\("message"/g)||[]).length,1,"health must reuse the one existing bridge listener");

assert.match(calculator,/"healthCheck" => TimeSpan\.FromSeconds\(6\)/);
assert.match(calculator,/case "healthCheck":/);
assert.match(calculator,/ValidateHealthCheckPayload\(payload\)/);
assert.match(calculator,/payload\.ValueKind != JsonValueKind\.Object \|\| payload\.EnumerateObject\(\)\.Any\(\)/,"native health payload must reject every argument");
assert.match(healthService,/SHA256\.HashDataAsync\(stream/);
assert.match(healthService,/itemAliases/);
assert.match(database,/SELECT 1/);
for(const table of ["settings","tracked_items","snapshots","outfit_catalog","outfit_snapshots"])assert.match(database,new RegExp(`'${table}'`));
assert.doesNotMatch(healthService,/HttpClient|https?:\/\//,"core health must not depend on external network access");

console.log("Bottom health monitor frontend and native contract verification passed.");
