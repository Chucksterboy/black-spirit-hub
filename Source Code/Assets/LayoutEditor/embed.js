(function (global) {
  'use strict';

  var scriptURL = document.currentScript && document.currentScript.src;
  var defaultURL = new URL('./index.html', scriptURL || document.baseURI).href;
  var READY_TIMEOUT = 15000;
  var REQUEST_TIMEOUT = 70000;

  function makeError(value, fallback) {
    if (value instanceof Error) return value;
    var message = typeof value === 'string' ? value : value && value.message;
    return new Error(message || fallback || 'The layout editor could not complete the request.');
  }

  function mount(container, options) {
    options = options || {};
    if (typeof container === 'string') container = document.querySelector(container);
    if (!container || typeof container.appendChild !== 'function') {
      throw new TypeError('BDOLayoutEditor.mount requires a container element.');
    }
    if (options.onSave !== undefined && typeof options.onSave !== 'function') {
      throw new TypeError('onSave must be a function.');
    }
    if (options.theme !== undefined && options.theme !== 'dark' && options.theme !== 'light') {
      throw new TypeError('theme must be "dark" or "light".');
    }
    if (options.storageKey !== undefined && typeof options.storageKey !== 'string') {
      throw new TypeError('storageKey must be a string.');
    }
    if (typeof global.MessageChannel !== 'function') {
      throw new Error('This browser does not support MessageChannel.');
    }

    var url = new URL(options.url || defaultURL, document.baseURI);
    if (!['http:', 'https:', 'file:'].includes(url.protocol)) {
      throw new TypeError('The editor URL must use HTTP, HTTPS, or a local file.');
    }
    url.searchParams.set('embedded', '1');
    var targetOrigin = url.protocol === 'file:' || url.origin === 'null' ? '*' : url.origin;
    var frame = document.createElement('iframe');
    frame.title = 'Black Desert layout editor';
    frame.setAttribute('allow', 'fullscreen');
    frame.setAttribute('allowfullscreen', '');
    frame.style.width = '100%';
    frame.style.height = '100%';
    frame.style.border = '0';
    frame.style.display = 'block';
    frame.src = url.href;

    var port = null;
    var connected = false;
    var initialized = false;
    var destroyed = false;
    var failure = null;
    var nextId = 0;
    var pending = new Map();
    var listeners = new Map();
    var resolveReady;
    var rejectReady;
    var ready = new Promise(function (resolve, reject) {
      resolveReady = resolve;
      rejectReady = reject;
    });
    // A host may attach a ready handler later. Calls still receive its rejection.
    ready.catch(function () {});
    var readyTimer = global.setTimeout(function () {
      fail(new Error('The layout editor did not become ready within 15 seconds.'), 'ready-timeout');
    }, READY_TIMEOUT);

    function emit(event, detail) {
      var callbacks = listeners.get(event);
      if (!callbacks) return;
      Array.from(callbacks).forEach(function (callback) {
        try { callback(detail); }
        catch (error) {
          if (global.console && typeof global.console.error === 'function') {
            global.console.error('BDOLayoutEditor event callback failed:', error);
          }
        }
      });
    }

    function detachConnection(error) {
      global.clearTimeout(readyTimer);
      frame.removeEventListener('load', onLoad);
      frame.removeEventListener('error', onFrameError);
      if (port) {
        port.onmessage = null;
        port.onmessageerror = null;
        port.close();
        port = null;
      }
      pending.forEach(function (request) {
        global.clearTimeout(request.timer);
        request.reject(error);
      });
      pending.clear();
      if (!initialized) rejectReady(error);
    }

    function fail(error, code) {
      if (destroyed || failure) return;
      failure = makeError(error);
      detachConnection(failure);
      emit('error', { message: failure.message, code: code || 'connection-error' });
    }

    function post(message) {
      if (destroyed) throw new Error('This layout editor has been destroyed.');
      if (failure) throw failure;
      if (!port) throw new Error('The layout editor is not connected.');
      port.postMessage(message);
    }

    function handleSave(message) {
      if (message.id === undefined) return;
      var saveId = message.id;
      Promise.resolve().then(function () {
        if (destroyed || failure) throw failure || new Error('The layout editor was destroyed.');
        if (typeof options.onSave !== 'function') {
          throw new Error('The host has not provided an onSave handler.');
        }
        return options.onSave(message.state);
      }).then(function () {
        if (!destroyed && !failure) post({ saveId: saveId, ok: true });
      }, function (error) {
        if (!destroyed && !failure) {
          post({ saveId: saveId, ok: false, error: makeError(error, 'The host could not save this layout.').message });
        }
      }).catch(function (error) {
        fail(error, 'save-response-error');
      });
    }

    function onMessage(event) {
      if (destroyed || failure) return;
      var message = event.data;
      if (!message || typeof message !== 'object') return;
      if (message.event === 'save-request') {
        handleSave(message);
        return;
      }
      if (typeof message.event === 'string') {
        if (message.event === 'error' && message.detail && message.detail.fatal === true) {
          fail(makeError(message.detail), 'initialization-error');
          return;
        }
        if (message.event === 'ready' && !initialized) {
          initialized = true;
          global.clearTimeout(readyTimer);
          resolveReady(controller);
        }
        emit(message.event, message.detail);
        return;
      }
      if (message.id === undefined || !pending.has(message.id)) return;
      var request = pending.get(message.id);
      pending.delete(message.id);
      global.clearTimeout(request.timer);
      if (message.error !== undefined && message.error !== null) {
        request.reject(makeError(message.error));
      } else {
        request.resolve(message.result);
      }
    }

    function onFrameError() {
      fail(new Error('The layout editor frame could not be loaded.'), 'frame-load-error');
    }

    function onLoad() {
      if (destroyed || failure) return;
      if (connected) {
        fail(new Error('The layout editor frame reloaded. Destroy this instance and mount a new one.'), 'frame-reloaded');
        return;
      }
      connected = true;
      var channel = new global.MessageChannel();
      port = channel.port1;
      port.onmessage = onMessage;
      port.onmessageerror = function () {
        fail(new Error('The layout editor sent an unreadable message.'), 'message-error');
      };
      port.start();
      var connectOptions = { managed: typeof options.onSave === 'function' };
      if (options.initialState !== undefined) connectOptions.initialState = options.initialState;
      if (options.storageKey !== undefined) connectOptions.storageKey = options.storageKey;
      if (options.theme !== undefined) connectOptions.theme = options.theme;
      try {
        frame.contentWindow.postMessage({ type: 'bdo:connect', version: 1, options: connectOptions }, targetOrigin, [channel.port2]);
      } catch (error) {
        channel.port2.close();
        fail(error, 'connect-error');
      }
    }

    function request(method, params) {
      if (destroyed) return Promise.reject(new Error('This layout editor has been destroyed.'));
      if (failure) return Promise.reject(failure);
      return ready.then(function () {
        if (destroyed) throw new Error('This layout editor has been destroyed.');
        if (failure) throw failure;
        return new Promise(function (resolve, reject) {
          var id = 'request-' + (++nextId);
          var timer = global.setTimeout(function () {
            pending.delete(id);
            reject(new Error('The layout editor request "' + method + '" timed out after 70 seconds.'));
          }, REQUEST_TIMEOUT);
          pending.set(id, { resolve: resolve, reject: reject, timer: timer });
          try { post({ id: id, method: method, params: params || {} }); }
          catch (error) {
            global.clearTimeout(timer);
            pending.delete(id);
            reject(error);
          }
        });
      });
    }

    var controller = {
      ready: ready,
      getState: function () { return request('getState'); },
      loadState: function (state, loadOptions) {
        loadOptions = loadOptions || {};
        return request('loadState', { state: state, options: { markSaved: loadOptions.markSaved === true } });
      },
      apply: function () { return request('apply'); },
      on: function (event, callback) {
        if (destroyed) throw new Error('This layout editor has been destroyed.');
        if (typeof event !== 'string' || typeof callback !== 'function') {
          throw new TypeError('on requires an event name and a callback.');
        }
        var callbacks = listeners.get(event);
        if (!callbacks) {
          callbacks = new Set();
          listeners.set(event, callbacks);
        }
        callbacks.add(callback);
        return function () {
          callbacks.delete(callback);
          if (!callbacks.size) listeners.delete(event);
        };
      },
      destroy: function () {
        if (destroyed) return;
        destroyed = true;
        detachConnection(new Error('This layout editor has been destroyed.'));
        listeners.clear();
        frame.remove();
      }
    };

    frame.addEventListener('load', onLoad);
    frame.addEventListener('error', onFrameError);
    container.appendChild(frame);
    return controller;
  }

  global.BDOLayoutEditor = Object.freeze({ version: '1.0.0', mount: mount });
})(window);
