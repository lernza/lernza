Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const types = require('../../../types.js');

const whenActivated = (callback) => {
  if (types.WINDOW.document?.prerendering) {
    addEventListener("prerenderingchange", () => callback(), true);
  } else {
    callback();
  }
};

exports.whenActivated = whenActivated;
//# sourceMappingURL=whenActivated.js.map
