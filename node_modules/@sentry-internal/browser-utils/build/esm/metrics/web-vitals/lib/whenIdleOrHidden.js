import { WINDOW } from '../../../types.js';
import { addPageListener, removePageListener } from './globalListeners.js';
import { runOnce } from './runOnce.js';

const whenIdleOrHidden = (cb) => {
  const rIC = WINDOW.requestIdleCallback || WINDOW.setTimeout;
  if (WINDOW.document?.visibilityState === "hidden") {
    cb();
  } else {
    cb = runOnce(cb);
    addPageListener("visibilitychange", cb, { once: true, capture: true });
    addPageListener("pagehide", cb, { once: true, capture: true });
    rIC(() => {
      cb();
      removePageListener("visibilitychange", cb, { capture: true });
      removePageListener("pagehide", cb, { capture: true });
    });
  }
};

export { whenIdleOrHidden };
//# sourceMappingURL=whenIdleOrHidden.js.map
