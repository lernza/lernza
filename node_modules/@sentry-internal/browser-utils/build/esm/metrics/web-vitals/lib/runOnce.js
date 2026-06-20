const runOnce = (cb) => {
  let called = false;
  return () => {
    if (!called) {
      cb();
      called = true;
    }
  };
};

export { runOnce };
//# sourceMappingURL=runOnce.js.map
