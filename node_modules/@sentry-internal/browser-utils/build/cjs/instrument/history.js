Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const core = require('@sentry/core');
const types = require('../types.js');

let lastHref;
function addHistoryInstrumentationHandler(handler) {
  const type = "history";
  core.addHandler(type, handler);
  core.maybeInstrument(type, instrumentHistory);
}
function instrumentHistory() {
  types.WINDOW.addEventListener("popstate", () => {
    const to = types.WINDOW.location.href;
    const from = lastHref;
    lastHref = to;
    if (from === to) {
      return;
    }
    const handlerData = { from, to };
    core.triggerHandlers("history", handlerData);
  });
  if (!core.supportsHistory()) {
    return;
  }
  function historyReplacementFunction(originalHistoryFunction) {
    return function(...args) {
      const url = args.length > 2 ? args[2] : void 0;
      if (url) {
        const from = lastHref;
        const to = getAbsoluteUrl(String(url));
        lastHref = to;
        if (from === to) {
          return originalHistoryFunction.apply(this, args);
        }
        const handlerData = { from, to };
        core.triggerHandlers("history", handlerData);
      }
      return originalHistoryFunction.apply(this, args);
    };
  }
  core.fill(types.WINDOW.history, "pushState", historyReplacementFunction);
  core.fill(types.WINDOW.history, "replaceState", historyReplacementFunction);
}
function getAbsoluteUrl(urlOrPath) {
  try {
    const url = new URL(urlOrPath, types.WINDOW.location.origin);
    return url.toString();
  } catch {
    return urlOrPath;
  }
}

exports.addHistoryInstrumentationHandler = addHistoryInstrumentationHandler;
exports.instrumentHistory = instrumentHistory;
//# sourceMappingURL=history.js.map
