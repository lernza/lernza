import { WINDOW } from '../../../types.js';

const getNavigationEntry = (checkResponseStart = true) => {
  const navigationEntry = WINDOW.performance?.getEntriesByType?.("navigation")[0];
  if (
    // sentry-specific change:
    // We don't want to check for responseStart for our own use of `getNavigationEntry`
    !checkResponseStart || navigationEntry && navigationEntry.responseStart > 0 && navigationEntry.responseStart < performance.now()
  ) {
    return navigationEntry;
  }
};

export { getNavigationEntry };
//# sourceMappingURL=getNavigationEntry.js.map
