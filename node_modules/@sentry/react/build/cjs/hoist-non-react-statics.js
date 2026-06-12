Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const REACT_STATICS = {
  childContextTypes: true,
  contextType: true,
  contextTypes: true,
  defaultProps: true,
  displayName: true,
  getDefaultProps: true,
  getDerivedStateFromError: true,
  getDerivedStateFromProps: true,
  mixins: true,
  propTypes: true,
  type: true
};
const KNOWN_STATICS = {
  name: true,
  length: true,
  prototype: true,
  caller: true,
  callee: true,
  arguments: true,
  arity: true
};
const FORWARD_REF_STATICS = {
  $$typeof: true,
  render: true,
  defaultProps: true,
  displayName: true,
  propTypes: true
};
const MEMO_STATICS = {
  $$typeof: true,
  compare: true,
  defaultProps: true,
  displayName: true,
  propTypes: true,
  type: true
};
const ForwardRefType = /* @__PURE__ */ Symbol.for("react.forward_ref");
const MemoType = /* @__PURE__ */ Symbol.for("react.memo");
function isMemo(component) {
  return typeof component === "object" && component !== null && component.$$typeof === MemoType;
}
const TYPE_STATICS = {};
TYPE_STATICS[ForwardRefType] = FORWARD_REF_STATICS;
TYPE_STATICS[MemoType] = MEMO_STATICS;
function getStatics(component) {
  if (isMemo(component)) {
    return MEMO_STATICS;
  }
  const componentType = component.$$typeof;
  return componentType && TYPE_STATICS[componentType] || REACT_STATICS;
}
const defineProperty = Object.defineProperty.bind(Object);
const getOwnPropertyNames = Object.getOwnPropertyNames.bind(Object);
const getOwnPropertySymbols = Object.getOwnPropertySymbols?.bind(Object);
const getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor.bind(Object);
const getPrototypeOf = Object.getPrototypeOf.bind(Object);
const objectPrototype = Object.prototype;
function hoistNonReactStatics(targetComponent, sourceComponent, excludelist) {
  if (typeof sourceComponent !== "string") {
    if (objectPrototype) {
      const inheritedComponent = getPrototypeOf(sourceComponent);
      if (inheritedComponent && inheritedComponent !== objectPrototype) {
        hoistNonReactStatics(targetComponent, inheritedComponent);
      }
    }
    let keys = getOwnPropertyNames(sourceComponent);
    if (getOwnPropertySymbols) {
      keys = keys.concat(getOwnPropertySymbols(sourceComponent));
    }
    const targetStatics = getStatics(targetComponent);
    const sourceStatics = getStatics(sourceComponent);
    for (const key of keys) {
      if (!KNOWN_STATICS[key] && true && !sourceStatics?.[key] && !targetStatics?.[key] && !getOwnPropertyDescriptor(targetComponent, key)) {
        const descriptor = getOwnPropertyDescriptor(sourceComponent, key);
        if (descriptor) {
          try {
            defineProperty(targetComponent, key, descriptor);
          } catch (_e) {
          }
        }
      }
    }
  }
  return targetComponent;
}

exports.hoistNonReactStatics = hoistNonReactStatics;
//# sourceMappingURL=hoist-non-react-statics.js.map
