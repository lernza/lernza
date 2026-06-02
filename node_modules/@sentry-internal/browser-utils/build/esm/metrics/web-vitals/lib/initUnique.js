const instanceMap = /* @__PURE__ */ new WeakMap();
function initUnique(identityObj, ClassObj) {
  try {
    if (!instanceMap.get(identityObj)) {
      instanceMap.set(identityObj, new ClassObj());
    }
    return instanceMap.get(identityObj);
  } catch (_e) {
    return new ClassObj();
  }
}

export { initUnique };
//# sourceMappingURL=initUnique.js.map
