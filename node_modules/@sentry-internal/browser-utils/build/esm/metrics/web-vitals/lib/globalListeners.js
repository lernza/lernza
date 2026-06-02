import { WINDOW } from '../../../types.js';

function addPageListener(type, listener, options) {
  if (WINDOW.document) {
    WINDOW.addEventListener(type, listener, options);
  }
}
function removePageListener(type, listener, options) {
  if (WINDOW.document) {
    WINDOW.removeEventListener(type, listener, options);
  }
}

export { addPageListener, removePageListener };
//# sourceMappingURL=globalListeners.js.map
