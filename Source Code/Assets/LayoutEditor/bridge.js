/* Only the actual embedding parent can establish the private command channel. */
(() => {
  'use strict';
  if (window.parent === window || new URLSearchParams(location.search).get('embedded') !== '1') return;
  let connected = false;
  window.addEventListener('message', async function connect(event) {
    if (connected || event.source !== window.parent || event.data?.type !== 'bdo:connect'
        || event.data.version !== 1 || event.ports.length !== 1) return;
    connected = true;
    window.removeEventListener('message', connect);
    const port = event.ports[0], pendingSaves = new Map();
    let sequence = 0, ready = false;
    const send = value => port.postMessage(value);
    const options = event.data.options || {};
    function hostSave(state) {
      return new Promise((resolve, reject) => {
        const id = 'save-' + (++sequence);
        const timeout = setTimeout(() => {pendingSaves.delete(id);reject(Error('The host did not confirm the save within 60 seconds'));}, 60000);
        pendingSaves.set(id, {resolve, reject, timeout});
        send({event:'save-request', id, state});
      });
    }
    port.onmessage = async ({data}) => {
      if (!data || typeof data !== 'object') return;
      if (typeof data.saveId === 'string') {
        const pending = pendingSaves.get(data.saveId);if (!pending) return;
        clearTimeout(pending.timeout);pendingSaves.delete(data.saveId);
        if (data.ok === true) pending.resolve();else pending.reject(Error(typeof data.error === 'string' ? data.error : 'The host could not save'));
        return;
      }
      if (typeof data.id !== 'string') return;
      try {
        if (!ready) throw Error('The editor is not ready.');
        let result;
        switch (data.method) {
          case 'getState': result = window.BDOEditor.getState();break;
          case 'loadState': result = window.BDOEditor.loadState(data.params?.state, data.params?.options);break;
          case 'apply': result = await window.BDOEditor.apply();break;
          default: throw Error('Unsupported editor method.');
        }
        send({id:data.id, result});
      } catch (error) {send({id:data.id, error:error.message});}
    };
    port.start();
    ['change', 'applied', 'error'].forEach(name => window.addEventListener('bdo:'+name, e => send({event:name, detail:e.detail})));
    try {
      const state = await window.BDOEditor.initialize({
        initialState:options.initialState, storageKey:options.storageKey, theme:options.theme,
        ...(options.managed ? {save:hostSave} : {})
      });
      ready = true;send({event:'ready',detail:{state,mode:options.managed?'host':'browser'}});
      new ResizeObserver(() => send({event:'resize',detail:{width:document.documentElement.clientWidth,height:document.documentElement.scrollHeight}})).observe(document.documentElement);
    } catch(error) {send({event:'error',detail:{message:error.message,operation:'initialize',fatal:true}});}
  });
})();
