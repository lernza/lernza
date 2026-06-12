import { isNativeFunction, debug } from '@sentry/core';
import { DEBUG_BUILD } from './debug-build.js';
import { WINDOW } from './types.js';

const cachedImplementations = {};
function getNativeImplementation(name) {
  const cached = cachedImplementations[name];
  if (cached) {
    return cached;
  }
  let impl = WINDOW[name];
  if (isNativeFunction(impl)) {
    return cachedImplementations[name] = impl.bind(WINDOW);
  }
  const document = WINDOW.document;
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
      DEBUG_BUILD && debug.warn(`Could not create sandbox iframe for ${name} check, bailing to window.${name}: `, e);
    }
  }
  if (!impl) {
    return impl;
  }
  return cachedImplementations[name] = impl.bind(WINDOW);
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

export { clearCachedImplementation, fetch, getNativeImplementation, setTimeout };
//# sourceMappingURL=getNativeImplementation.js.map
