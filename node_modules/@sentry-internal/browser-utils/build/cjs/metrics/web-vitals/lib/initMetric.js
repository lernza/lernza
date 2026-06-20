Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const types = require('../../../types.js');
const generateUniqueID = require('./generateUniqueID.js');
const getActivationStart = require('./getActivationStart.js');
const getNavigationEntry = require('./getNavigationEntry.js');

const initMetric = (name, value = -1) => {
  const navEntry = getNavigationEntry.getNavigationEntry();
  let navigationType = "navigate";
  if (navEntry) {
    if (types.WINDOW.document?.prerendering || getActivationStart.getActivationStart() > 0) {
      navigationType = "prerender";
    } else if (types.WINDOW.document?.wasDiscarded) {
      navigationType = "restore";
    } else if (navEntry.type) {
      navigationType = navEntry.type.replace(/_/g, "-");
    }
  }
  const entries = [];
  return {
    name,
    value,
    rating: "good",
    // If needed, will be updated when reported. `const` to keep the type from widening to `string`.
    delta: 0,
    entries,
    id: generateUniqueID.generateUniqueID(),
    navigationType
  };
};

exports.initMetric = initMetric;
//# sourceMappingURL=initMetric.js.map
