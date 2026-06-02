import { getNavigationEntry } from './getNavigationEntry.js';

const getActivationStart = () => {
  const navEntry = getNavigationEntry();
  return navEntry?.activationStart ?? 0;
};

export { getActivationStart };
//# sourceMappingURL=getActivationStart.js.map
