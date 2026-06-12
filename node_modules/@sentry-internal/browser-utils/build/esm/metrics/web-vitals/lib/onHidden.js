import { WINDOW } from '../../../types.js';
import { addPageListener } from './globalListeners.js';

const onHidden = (cb) => {
  const onHiddenOrPageHide = (event) => {
    if (event.type === "pagehide" || WINDOW.document?.visibilityState === "hidden") {
      cb(event);
    }
  };
  addPageListener("visibilitychange", onHiddenOrPageHide, { capture: true, once: true });
  addPageListener("pagehide", onHiddenOrPageHide, { capture: true, once: true });
};

export { onHidden };
//# sourceMappingURL=onHidden.js.map
