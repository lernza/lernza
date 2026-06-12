Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const types = require('../../../types.js');
const getActivationStart = require('./getActivationStart.js');
const globalListeners = require('./globalListeners.js');

let firstHiddenTime = -1;
const onHiddenFunctions = /* @__PURE__ */ new Set();
const initHiddenTime = () => {
  return types.WINDOW.document?.visibilityState === "hidden" && !types.WINDOW.document?.prerendering ? 0 : Infinity;
};
const onVisibilityUpdate = (event) => {
  if (isPageHidden(event) && firstHiddenTime > -1) {
    if (event.type === "visibilitychange" || event.type === "pagehide") {
      for (const onHiddenFunction of onHiddenFunctions) {
        onHiddenFunction();
      }
    }
    if (!isFinite(firstHiddenTime)) {
      firstHiddenTime = event.type === "visibilitychange" ? event.timeStamp : 0;
      globalListeners.removePageListener("prerenderingchange", onVisibilityUpdate, true);
    }
  }
};
const getVisibilityWatcher = () => {
  if (types.WINDOW.document && firstHiddenTime < 0) {
    const activationStart = getActivationStart.getActivationStart();
    const firstVisibilityStateHiddenTime = !types.WINDOW.document.prerendering ? globalThis.performance.getEntriesByType("visibility-state").filter((e) => e.name === "hidden" && e.startTime > activationStart)[0]?.startTime : void 0;
    firstHiddenTime = firstVisibilityStateHiddenTime ?? initHiddenTime();
    globalListeners.addPageListener("visibilitychange", onVisibilityUpdate, true);
    globalListeners.addPageListener("pagehide", onVisibilityUpdate, true);
    globalListeners.addPageListener("prerenderingchange", onVisibilityUpdate, true);
  }
  return {
    get firstHiddenTime() {
      return firstHiddenTime;
    },
    onHidden(cb) {
      onHiddenFunctions.add(cb);
    }
  };
};
function isPageHidden(event) {
  return event.type === "pagehide" || types.WINDOW.document?.visibilityState === "hidden";
}

exports.getVisibilityWatcher = getVisibilityWatcher;
//# sourceMappingURL=getVisibilityWatcher.js.map
