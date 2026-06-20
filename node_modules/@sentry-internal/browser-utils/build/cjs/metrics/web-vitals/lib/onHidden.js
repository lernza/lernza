Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const types = require('../../../types.js');
const globalListeners = require('./globalListeners.js');

const onHidden = (cb) => {
  const onHiddenOrPageHide = (event) => {
    if (event.type === "pagehide" || types.WINDOW.document?.visibilityState === "hidden") {
      cb(event);
    }
  };
  globalListeners.addPageListener("visibilitychange", onHiddenOrPageHide, { capture: true, once: true });
  globalListeners.addPageListener("pagehide", onHiddenOrPageHide, { capture: true, once: true });
};

exports.onHidden = onHidden;
//# sourceMappingURL=onHidden.js.map
