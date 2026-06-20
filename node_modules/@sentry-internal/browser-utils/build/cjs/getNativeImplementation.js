Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const core = require('@sentry/core');
const debugBuild = require('./debug-build.js');
const types = require('./types.js');

const cachedImplementations = {};
function getNativeImplementation(name) {
  const cached = cachedImplementations[name];
  if (cached) {
    return cached;
  }
  let impl = types.WINDOW[name];
  if (core.isNativeFunction(impl)) {
    return cachedImplementations[name] = impl.bind(types.WINDOW);
  }
  const document = types.WINDOW.document;
  if (document && typeof document.createElement === "function") {
    try {
      const sandbox = document.createElement("iframe");
      sandbox.hidden = true;
      document.head.appendChild(sandbox);
      const contentWindow = sandbox.contentWindow;
      if (contentWindow?.[name]) {
        impl = contentWindow[name];
      }
      document.head.removeChild(sandbox);
    } catch (e) {
      debugBuild.DEBUG_BUILD && core.debug.warn(`Could not create sandbox iframe for ${name} check, bailing to window.${name}: `, e);
    }
  }
  if (!impl) {
    return impl;
  }
  return cachedImplementations[name] = impl.bind(types.WINDOW);
}
function clearCachedImplementation(name) {
  cachedImplementations[name] = void 0;
}
function fetch(...rest) {
  return getNativeImplementation("fetch")(...rest);
}
function setTimeout(...rest) {
  return getNativeImplementation("setTimeout")(...rest);
}

exports.clearCachedImplementation = clearCachedImplementation;
exports.fetch = fetch;
exports.getNativeImplementation = getNativeImplementation;
exports.setTimeout = setTimeout;
//# sourceMappingURL=getNativeImplementation.js.map
