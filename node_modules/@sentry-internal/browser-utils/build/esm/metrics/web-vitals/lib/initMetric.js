import { WINDOW } from '../../../types.js';
import { generateUniqueID } from './generateUniqueID.js';
import { getActivationStart } from './getActivationStart.js';
import { getNavigationEntry } from './getNavigationEntry.js';

const initMetric = (name, value = -1) => {
  const navEntry = getNavigationEntry();
  let navigationType = "navigate";
  if (navEntry) {
    if (WINDOW.document?.prerendering || getActivationStart() > 0) {
      navigationType = "prerender";
    } else if (WINDOW.document?.wasDiscarded) {
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
    id: generateUniqueID(),
    navigationType
  };
};

export { initMetric };
//# sourceMappingURL=initMetric.js.map
