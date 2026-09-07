import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = path.resolve(process.argv[2] ?? 'Source Code');
const scriptPath = path.join(root, 'Assets/AppBehavior/app-behavior-preferences.js');
const script = fs.readFileSync(scriptPath, 'utf8');
assert.ok(script.length < 9000, 'Preference module must remain small.');
const html=fs.readFileSync(path.join(root,'BlackSpiritHub.Resources.Black_Spirit_Hub.html'),'utf8');
assert.ok(html.indexOf('Assets/AppBehavior/app-behavior-preferences.js') < html.indexOf('<script src="BlackSpiritHub.Resources.Black_Spirit_Hub.js'), 'Preferences must be available before the shell initializes them.');
const plain = value => JSON.parse(JSON.stringify(value));
const ids = ['openImmediatelyWhenReady', 'backgroundMarketUpdatesEnabled', 'backgroundMarketStatus',
  'backgroundMarketLastRun', 'refreshBackgroundMarketStatus'];
const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
const turn = () => new Promise(resolve => setImmediate(resolve));
function harness(initialBridge = async () => { throw new Error('No bridge response configured.'); }) {
  let bridge = initialBridge;
  const calls = [];
  const messages = [];
  const elements = Object.fromEntries(ids.map(id => [id, {
    id, checked: false, disabled: true, textContent: '', listeners: new Map(),
    addEventListener(name, handler) { this.listeners.set(name, handler); }
  }]));
  const context = vm.createContext({
    document: { getElementById: id => elements[id] ?? null },
    bridgeCall(command, payload) {
      calls.push({ command, payload: payload === undefined ? undefined : plain(payload) });
      return Promise.resolve().then(() => bridge(command, payload));
    },
    NotificationService: {
      ShowInfo(message, title) { messages.push({ kind: 'info', message, title }); },
      ShowError(message, title) { messages.push({ kind: 'error', message, title }); }
    },
    console, Date, Error, Promise
  });
  new vm.Script(script, { filename: scriptPath }).runInContext(context);
  const invoke = (name, value) => { context.input = value; return vm.runInContext(`${name}(input)`, context); };
  return {
    elements, calls, messages,
    bridge: next => { bridge = next; },
    render: settings => invoke('renderStartupAndBackgroundPreferences', settings),
    status: status => invoke('renderBackgroundMarketStatus', status),
    refresh: () => vm.runInContext('refreshBackgroundMarketStatus()', context),
    change(id, checked) {
      const element = elements[id];
      element.checked = checked;
      return element.listeners.get('change')({ currentTarget: element });
    }
  };
}
let failures = 0;
async function check(name, test) {
  try { await test(); console.log(`PASS: ${name}`); }
  catch (error) { failures++; console.error(`FAIL: ${name}\n${error.stack}`); }
}

await check('loaded booleans enable controls; missing settings remain unavailable', () => {
  const h = harness();
  h.render({ openImmediatelyWhenReady: true, backgroundMarketUpdatesEnabled: false });
  assert.equal(h.elements.openImmediatelyWhenReady.checked, true);
  assert.equal(h.elements.backgroundMarketUpdatesEnabled.checked, false);
  assert.equal(h.elements.openImmediatelyWhenReady.disabled, false);
  assert.equal(h.elements.backgroundMarketUpdatesEnabled.disabled, false);
  h.render({});
  assert.equal(h.elements.openImmediatelyWhenReady.disabled, true);
  assert.equal(h.elements.backgroundMarketUpdatesEnabled.disabled, true);
});

await check('status distinguishes completed checks from saved samples and invalid dates', () => {
  const h = harness();
  h.status({ enabled: false, error: 'Windows task unavailable', message: 'Do not prefer this',
    lastCompletedCheckUtc: null, lastSuccessfulSampleUtc: 'invalid', nextRunUtc: 'invalid' });
  assert.equal(h.elements.backgroundMarketStatus.textContent, 'Windows task unavailable');
  assert.equal(h.elements.backgroundMarketLastRun.textContent, 'No completed background check recorded yet.');
  h.status({ enabled: true, message: 'Scheduled', lastCompletedCheckUtc: '2026-09-07T09:00:00Z',
    lastSuccessfulSampleUtc: '2026-09-07T08:00:00Z', nextRunUtc: '2026-09-07T12:00:00Z' });
  assert.match(h.elements.backgroundMarketLastRun.textContent, /Last completed background check:/);
  assert.match(h.elements.backgroundMarketLastRun.textContent, /Latest saved EU market sample:/);
  assert.match(h.elements.backgroundMarketLastRun.textContent, /Next check:/);
});

await check('status refreshes coalesce, recover after failure, and release refresh control', async () => {
  const pending = deferred();
  const h = harness(() => pending.promise);
  const a = h.refresh();
  const b = h.refresh();
  await turn();
  assert.equal(h.calls.length, 1);
  assert.equal(h.elements.refreshBackgroundMarketStatus.disabled, true);
  pending.reject(new Error('Offline'));
  await Promise.all([a, b]);
  assert.equal(h.elements.backgroundMarketStatus.textContent, 'Offline');
  assert.equal(h.elements.refreshBackgroundMarketStatus.disabled, false);
  h.bridge(async () => ({ enabled: true, message: 'Connected' }));
  await h.refresh();
  assert.equal(h.elements.backgroundMarketStatus.textContent, 'Connected');
});

await check('startup save sends only its field and prevents duplicate in-flight writes', async () => {
  const pending = deferred();
  const h = harness(() => pending.promise);
  h.render({ openImmediatelyWhenReady: false, backgroundMarketUpdatesEnabled: true });
  const saving = h.change('openImmediatelyWhenReady', true);
  await turn();
  await h.elements.openImmediatelyWhenReady.listeners.get('change')({ currentTarget: h.elements.openImmediatelyWhenReady });
  assert.equal(h.calls.length, 1);
  assert.deepEqual(h.calls[0], { command: 'saveStartupPreference', payload: { openImmediatelyWhenReady: true } });
  assert.equal(h.elements.openImmediatelyWhenReady.disabled, true);
  pending.resolve({ openImmediatelyWhenReady: true });
  await saving;
  assert.equal(h.elements.openImmediatelyWhenReady.checked, true);
  assert.equal(h.elements.openImmediatelyWhenReady.disabled, false);
  assert.equal(h.messages.at(-1).kind, 'info');
});

await check('startup timeout reloads durable preference instead of assuming the save failed', async () => {
  const h = harness(async command => {
    if (command === 'saveStartupPreference') throw new Error('Timed out after save');
    if (command === 'getAppBehaviorSettings') return { openImmediatelyWhenReady: true, backgroundMarketUpdatesEnabled: false };
    throw new Error(`Unexpected command: ${command}`);
  });
  h.render({ openImmediatelyWhenReady: false, backgroundMarketUpdatesEnabled: false });
  await h.change('openImmediatelyWhenReady', true);
  assert.equal(h.elements.openImmediatelyWhenReady.checked, true);
  assert.equal(h.messages.at(-1).kind, 'error');
});

await check('startup save rejects malformed native responses without claiming success', async () => {
  const h = harness(async command => command === 'saveStartupPreference' ? {} :
    { openImmediatelyWhenReady: false, backgroundMarketUpdatesEnabled: true });
  h.render({ openImmediatelyWhenReady: false, backgroundMarketUpdatesEnabled: true });
  await h.change('openImmediatelyWhenReady', true);
  assert.equal(h.elements.openImmediatelyWhenReady.checked, false);
  assert.equal(h.messages.at(-1).kind, 'error');
  assert.equal(h.messages.some(message => message.kind === 'info'), false);
});

await check('background success is confirmed and subsequent status is refreshed', async () => {
  const h = harness(async command => {
    if (command === 'setBackgroundMarketPreference') return { success: true, enabled: true, message: 'Scheduled' };
    if (command === 'getBackgroundMarketStatus') return { enabled: true, message: 'Confirmed by Windows' };
    throw new Error(`Unexpected command: ${command}`);
  });
  h.render({ openImmediatelyWhenReady: false, backgroundMarketUpdatesEnabled: false });
  await h.change('backgroundMarketUpdatesEnabled', true);
  assert.deepEqual(h.calls[0], { command: 'setBackgroundMarketPreference', payload: { enabled: true } });
  assert.equal(h.elements.backgroundMarketUpdatesEnabled.checked, true);
  assert.equal(h.elements.backgroundMarketUpdatesEnabled.disabled, false);
  assert.equal(h.elements.backgroundMarketStatus.textContent, 'Confirmed by Windows');
  assert.equal(h.messages.at(-1).kind, 'info');
});

await check('Windows task failure displays durable OFF and reports an error', async () => {
  const h = harness(async command => command === 'setBackgroundMarketPreference'
    ? { success: false, enabled: false, error: 'Access denied' }
    : { enabled: false, message: 'Background collection is disabled.' });
  h.render({ openImmediatelyWhenReady: false, backgroundMarketUpdatesEnabled: false });
  await h.change('backgroundMarketUpdatesEnabled', true);
  assert.equal(h.elements.backgroundMarketUpdatesEnabled.checked, false);
  assert.equal(h.messages.at(-1).kind, 'error');
  assert.equal(h.messages.at(-1).message, 'Access denied');
});

await check('background bridge timeout reloads the actual durable value', async () => {
  const h = harness(async command => {
    if (command === 'setBackgroundMarketPreference') throw new Error('Reply timed out');
    if (command === 'getAppBehaviorSettings') return { openImmediatelyWhenReady: false, backgroundMarketUpdatesEnabled: true };
    if (command === 'getBackgroundMarketStatus') return { enabled: true, message: 'Enabled after save' };
    throw new Error(`Unexpected command: ${command}`);
  });
  h.render({ openImmediatelyWhenReady: false, backgroundMarketUpdatesEnabled: false });
  await h.change('backgroundMarketUpdatesEnabled', true);
  assert.equal(h.elements.backgroundMarketUpdatesEnabled.checked, true);
  assert.equal(h.messages.at(-1).kind, 'error');
});

await check('malformed background save response is never announced as enabled', async () => {
  const h = harness(async command => command === 'setBackgroundMarketPreference' ? {} :
    command === 'getAppBehaviorSettings' ? { openImmediatelyWhenReady: false, backgroundMarketUpdatesEnabled: false } :
    { enabled: false, message: 'Disabled' });
  h.render({ openImmediatelyWhenReady: false, backgroundMarketUpdatesEnabled: false });
  await h.change('backgroundMarketUpdatesEnabled', true);
  assert.equal(h.messages.at(-1).kind, 'error');
  assert.equal(h.messages.some(message => message.kind === 'info'), false);
  assert.equal(h.elements.backgroundMarketUpdatesEnabled.checked, false);
});

await check('old in-flight status cannot overwrite a completed preference change', async () => {
  const stale = deferred();
  let statusCalls = 0;
  const h = harness(async command => {
    if (command === 'getBackgroundMarketStatus') {
      statusCalls++;
      return statusCalls === 1 ? stale.promise : { enabled: true, message: 'Fresh enabled status' };
    }
    if (command === 'setBackgroundMarketPreference') return { success: true, enabled: true, message: 'Enabled now' };
    throw new Error(`Unexpected command: ${command}`);
  });
  h.render({ openImmediatelyWhenReady: false, backgroundMarketUpdatesEnabled: false });
  const oldRefresh = h.refresh();
  await turn();
  const changing = h.change('backgroundMarketUpdatesEnabled', true);
  await turn();
  stale.resolve({ enabled: false, message: 'Stale disabled status' });
  await Promise.all([oldRefresh, changing]);
  assert.equal(h.elements.backgroundMarketUpdatesEnabled.checked, true);
  assert.equal(h.elements.backgroundMarketStatus.textContent, 'Fresh enabled status');
  assert.ok(statusCalls >= 2, 'A post-save status query must not reuse the pre-save answer.');
});

await check('native saves serialize and preserve unrelated preference fields', () => {
  const native = fs.readFileSync(path.join(root, 'BlackSpiritHub/CalculatorForm.cs'), 'utf8');
  for (const [command, field] of [['saveStartupPreference', 'OpenImmediatelyWhenReady'],
    ['saveAppBehaviorSettings', 'MinimizeToTray'], ['setBackgroundMarketPreference', 'BackgroundMarketUpdatesEnabled']]) {
    const begin = native.indexOf(`case "${command}":`);
    const end = native.indexOf('\n\t\tcase ', begin + 1);
    const block = native.slice(begin, end < 0 ? native.length : end);
    assert.match(block, /await appBehaviorGate\.WaitAsync\(cancellationToken\)/, `${command} uses shared write lock.`);
    assert.match(block, /finally\s*\{ appBehaviorGate\.Release\(\); \}/, `${command} releases shared write lock.`);
    assert.match(block, new RegExp(`appBehaviorSettings with \\{ ${field} =`), `${command} preserves other fields.`);
  }
  const initialize = native.indexOf('appBehaviorSettings = await AppBehaviorSettings.LoadAsync');
  assert.ok(native.indexOf('startupSplash.OpenImmediatelyWhenReady = appBehaviorSettings.OpenImmediatelyWhenReady;', initialize) > initialize,
    'Startup mode is read from persisted preferences before readiness.');
});

if (failures) throw new Error(`${failures} startup/background preference regressions failed.`);
console.log('Startup/background preference workflow tests passed without Windows tasks, UI automation, or user data.');
