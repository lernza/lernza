Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const types = require('../../../types.js');
const globalListeners = require('./globalListeners.js');
const runOnce = require('./runOnce.js');

const whenIdleOrHidden = (cb) => {
  const rIC = types.WINDOW.requestIdleCallback || types.WINDOW.setTimeout;
  if (types.WINDOW.document?.visibilityState === "hidden") {
    cb();
  } else {
    cb = runOnce.runOnce(cb);
    globalListeners.addPageListener("visibilitychange", cb, { once: true, capture: true });
    globalListeners.addPageListener("pagehide", cb, { once: true, capture: true });
    rIC(() => {
      cb();
      globalListeners.removePageListener("visibilitychange", cb, { capture: true });
      globalListeners.removePageListener("pagehide", cb, { capture: true });
    });
  }
};

exports.whenIdleOrHidden = whenIdleOrHidden;
//# sourceMappingURL=whenIdleOrHidden.js.map
