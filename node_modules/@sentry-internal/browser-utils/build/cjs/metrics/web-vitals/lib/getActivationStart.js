Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const getNavigationEntry = require('./getNavigationEntry.js');

const getActivationStart = () => {
  const navEntry = getNavigationEntry.getNavigationEntry();
  return navEntry?.activationStart ?? 0;
};

exports.getActivationStart = getActivationStart;
//# sourceMappingURL=getActivationStart.js.map
