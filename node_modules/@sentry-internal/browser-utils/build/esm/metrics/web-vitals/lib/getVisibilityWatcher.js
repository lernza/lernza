import { WINDOW } from '../../../types.js';
import { getActivationStart } from './getActivationStart.js';
import { addPageListener, removePageListener } from './globalListeners.js';

let firstHiddenTime = -1;
const onHiddenFunctions = /* @__PURE__ */ new Set();
const initHiddenTime = () => {
  return WINDOW.document?.visibilityState === "hidden" && !WINDOW.document?.prerendering ? 0 : Infinity;
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
      removePageListener("prerenderingchange", onVisibilityUpdate, true);
    }
  }
};
const getVisibilityWatcher = () => {
  if (WINDOW.document && firstHiddenTime < 0) {
    const activationStart = getActivationStart();
    const firstVisibilityStateHiddenTime = !WINDOW.document.prerendering ? globalThis.performance.getEntriesByType("visibility-state").filter((e) => e.name === "hidden" && e.startTime > activationStart)[0]?.startTime : void 0;
    firstHiddenTime = firstVisibilityStateHiddenTime ?? initHiddenTime();
    addPageListener("visibilitychange", onVisibilityUpdate, true);
    addPageListener("pagehide", onVisibilityUpdate, true);
    addPageListener("prerenderingchange", onVisibilityUpdate, true);
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
  return event.type === "pagehide" || WINDOW.document?.visibilityState === "hidden";
}

export { getVisibilityWatcher };
//# sourceMappingURL=getVisibilityWatcher.js.map
