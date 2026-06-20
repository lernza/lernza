Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const observe = (type, callback, opts = {}) => {
  try {
    if (PerformanceObserver.supportedEntryTypes.includes(type)) {
      const po = new PerformanceObserver((list) => {
        Promise.resolve().then(() => {
          callback(list.getEntries());
        });
      });
      po.observe({ type, buffered: true, ...opts });
      return po;
    }
  } catch {
  }
  return;
};

exports.observe = observe;
//# sourceMappingURL=observe.js.map
