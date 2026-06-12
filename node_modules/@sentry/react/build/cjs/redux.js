Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const browser = require('@sentry/core/browser');

const ACTION_BREADCRUMB_CATEGORY = "redux.action";
const ACTION_BREADCRUMB_TYPE = "info";
const defaultOptions = {
  attachReduxState: true,
  actionTransformer: (action) => action,
  stateTransformer: (state) => state || null
};
function createReduxEnhancer(enhancerOptions) {
  const options = {
    ...defaultOptions,
    ...enhancerOptions
  };
  return (next) => (reducer, initialState) => {
    options.attachReduxState && browser.getGlobalScope().addEventProcessor((event, hint) => {
      try {
        if (event.type === void 0 && event.contexts.state.state.type === "redux") {
          hint.attachments = [
            ...hint.attachments || [],
            // @ts-expect-error try catch to reduce bundle size
            { filename: "redux_state.json", data: JSON.stringify(event.contexts.state.state.value) }
          ];
        }
      } catch {
      }
      return event;
    });
    function sentryWrapReducer(reducer2) {
      return (state, action) => {
        const newState = reducer2(state, action);
        const scope = browser.getCurrentScope();
        const transformedAction = options.actionTransformer(action);
        if (typeof transformedAction !== "undefined" && transformedAction !== null) {
          browser.addBreadcrumb({
            category: ACTION_BREADCRUMB_CATEGORY,
            data: transformedAction,
            type: ACTION_BREADCRUMB_TYPE
          });
        }
        const transformedState = options.stateTransformer(newState);
        if (typeof transformedState !== "undefined" && transformedState !== null) {
          const client = browser.getClient();
          const options2 = client?.getOptions();
          const normalizationDepth = options2?.normalizeDepth || 3;
          const newStateContext = { state: { type: "redux", value: transformedState } };
          browser.setNormalizationDepthOverrideHint(
            newStateContext,
            3 + // 3 layers for `state.value.transformedState`
            normalizationDepth
            // rest for the actual state
          );
          scope.setContext("state", newStateContext);
        } else {
          scope.setContext("state", null);
        }
        const { configureScopeWithState } = options;
        if (typeof configureScopeWithState === "function") {
          configureScopeWithState(scope, newState);
        }
        return newState;
      };
    }
    const store = next(sentryWrapReducer(reducer), initialState);
    store.replaceReducer = new Proxy(store.replaceReducer, {
      apply: function(target, thisArg, args) {
        target.apply(thisArg, [sentryWrapReducer(args[0])]);
      }
    });
    return store;
  };
}

exports.createReduxEnhancer = createReduxEnhancer;
//# sourceMappingURL=redux.js.map
