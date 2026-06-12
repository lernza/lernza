Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const browser = require('@sentry/core/browser');
const helpers = require('../helpers.js');
const fetch = require('./fetch.js');

function promisifyRequest(request) {
  return new Promise((resolve, reject) => {
    request.oncomplete = request.onsuccess = () => resolve(request.result);
    request.onabort = request.onerror = () => reject(request.error);
  });
}
function createStore(dbName, storeName) {
  const request = indexedDB.open(dbName);
  request.onupgradeneeded = () => request.result.createObjectStore(storeName);
  const dbp = promisifyRequest(request);
  return (callback) => dbp.then((db) => callback(db.transaction(storeName, "readwrite").objectStore(storeName)));
}
function keys(store) {
  return promisifyRequest(store.getAllKeys());
}
function push(store, value, maxQueueSize) {
  return store((store2) => {
    return keys(store2).then((keys2) => {
      if (keys2.length >= maxQueueSize) {
        return;
      }
      store2.put(value, Math.max(...keys2, 0) + 1);
      return promisifyRequest(store2.transaction);
    });
  });
}
function unshift(store, value, maxQueueSize) {
  return store((store2) => {
    return keys(store2).then((keys2) => {
      if (keys2.length >= maxQueueSize) {
        return;
      }
      store2.put(value, Math.min(...keys2, 0) - 1);
      return promisifyRequest(store2.transaction);
    });
  });
}
function shift(store) {
  return store((store2) => {
    return keys(store2).then((keys2) => {
      const firstKey = keys2[0];
      if (firstKey == null) {
        return void 0;
      }
      return promisifyRequest(store2.get(firstKey)).then((value) => {
        store2.delete(firstKey);
        return promisifyRequest(store2.transaction).then(() => value);
      });
    });
  });
}
function createIndexedDbStore(options) {
  let store;
  function getStore() {
    if (store == void 0) {
      store = createStore(options.dbName || "sentry-offline", options.storeName || "queue");
    }
    return store;
  }
  return {
    push: async (env) => {
      try {
        const serialized = browser.serializeEnvelope(env);
        await push(getStore(), serialized, options.maxQueueSize || 30);
      } catch {
      }
    },
    unshift: async (env) => {
      try {
        const serialized = browser.serializeEnvelope(env);
        await unshift(getStore(), serialized, options.maxQueueSize || 30);
      } catch {
      }
    },
    shift: async () => {
      try {
        const deserialized = await shift(getStore());
        if (deserialized) {
          return browser.parseEnvelope(deserialized);
        }
      } catch {
      }
      return void 0;
    }
  };
}
function makeIndexedDbOfflineTransport(createTransport) {
  return (options) => {
    const transport = createTransport({ ...options, createStore: createIndexedDbStore });
    helpers.WINDOW.addEventListener("online", async (_) => {
      await transport.flush();
    });
    return transport;
  };
}
function makeBrowserOfflineTransport(createTransport = fetch.makeFetchTransport) {
  return makeIndexedDbOfflineTransport(browser.makeOfflineTransport(createTransport));
}

exports.createStore = createStore;
exports.makeBrowserOfflineTransport = makeBrowserOfflineTransport;
exports.push = push;
exports.shift = shift;
exports.unshift = unshift;
//# sourceMappingURL=offline.js.map
