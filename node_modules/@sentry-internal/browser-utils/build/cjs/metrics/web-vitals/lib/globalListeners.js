Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const types = require('../../../types.js');

function addPageListener(type, listener, options) {
  if (types.WINDOW.document) {
    types.WINDOW.addEventListener(type, listener, options);
  }
}
function removePageListener(type, listener, options) {
  if (types.WINDOW.document) {
    types.WINDOW.removeEventListener(type, listener, options);
  }
}

exports.addPageListener = addPageListener;
exports.removePageListener = removePageListener;
//# sourceMappingURL=globalListeners.js.map
