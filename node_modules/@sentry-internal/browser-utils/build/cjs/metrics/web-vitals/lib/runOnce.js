Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const runOnce = (cb) => {
  let called = false;
  return () => {
    if (!called) {
      cb();
      called = true;
    }
  };
};

exports.runOnce = runOnce;
//# sourceMappingURL=runOnce.js.map
