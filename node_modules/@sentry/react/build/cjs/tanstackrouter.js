Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const browser = require('@sentry/browser');
const browser$1 = require('@sentry/core/browser');

function tanstackRouterBrowserTracingIntegration(router, options = {}) {
  const castRouterInstance = router;
  const browserTracingIntegrationInstance = browser.browserTracingIntegration({
    ...options,
    instrumentNavigation: false,
    instrumentPageLoad: false
  });
  const { instrumentPageLoad = true, instrumentNavigation = true } = options;
  return {
    ...browserTracingIntegrationInstance,
    afterAllSetup(client) {
      browserTracingIntegrationInstance.afterAllSetup(client);
      const initialWindowLocation = browser.WINDOW.location;
      if (instrumentPageLoad && initialWindowLocation) {
        const matchedRoutes = castRouterInstance.matchRoutes(
          initialWindowLocation.pathname,
          castRouterInstance.options.parseSearch(initialWindowLocation.search),
          { preload: false, throwOnError: false }
        );
        const lastMatch = matchedRoutes[matchedRoutes.length - 1];
        const routeMatch = lastMatch?.routeId !== "__root__" ? lastMatch : void 0;
        browser.startBrowserTracingPageLoadSpan(client, {
          name: routeMatch ? routeMatch.routeId : initialWindowLocation.pathname,
          attributes: {
            [browser$1.SEMANTIC_ATTRIBUTE_SENTRY_OP]: "pageload",
            [browser$1.SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN]: "auto.pageload.react.tanstack_router",
            [browser$1.SEMANTIC_ATTRIBUTE_SENTRY_SOURCE]: routeMatch ? "route" : "url",
            ...routeMatchToParamSpanAttributes(routeMatch)
          }
        });
      }
      if (instrumentNavigation) {
        castRouterInstance.subscribe("onBeforeNavigate", (onBeforeNavigateArgs) => {
          if (!onBeforeNavigateArgs.fromLocation || onBeforeNavigateArgs.toLocation.state === onBeforeNavigateArgs.fromLocation.state) {
            return;
          }
          const matchedRoutesOnBeforeNavigate = castRouterInstance.matchRoutes(
            onBeforeNavigateArgs.toLocation.pathname,
            onBeforeNavigateArgs.toLocation.search,
            { preload: false, throwOnError: false }
          );
          const onBeforeNavigateLastMatch = matchedRoutesOnBeforeNavigate[matchedRoutesOnBeforeNavigate.length - 1];
          const onBeforeNavigateRouteMatch = onBeforeNavigateLastMatch?.routeId !== "__root__" ? onBeforeNavigateLastMatch : void 0;
          const navigationLocation = browser.WINDOW.location;
          const navigationSpan = browser.startBrowserTracingNavigationSpan(client, {
            name: onBeforeNavigateRouteMatch ? onBeforeNavigateRouteMatch.routeId : navigationLocation.pathname,
            attributes: {
              [browser$1.SEMANTIC_ATTRIBUTE_SENTRY_OP]: "navigation",
              [browser$1.SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN]: "auto.navigation.react.tanstack_router",
              [browser$1.SEMANTIC_ATTRIBUTE_SENTRY_SOURCE]: onBeforeNavigateRouteMatch ? "route" : "url"
            }
          });
          const unsubscribeOnResolved = castRouterInstance.subscribe("onResolved", (onResolvedArgs) => {
            unsubscribeOnResolved();
            if (navigationSpan) {
              const matchedRoutesOnResolved = castRouterInstance.matchRoutes(
                onResolvedArgs.toLocation.pathname,
                onResolvedArgs.toLocation.search,
                { preload: false, throwOnError: false }
              );
              const onResolvedLastMatch = matchedRoutesOnResolved[matchedRoutesOnResolved.length - 1];
              const onResolvedRouteMatch = onResolvedLastMatch?.routeId !== "__root__" ? onResolvedLastMatch : void 0;
              if (onResolvedRouteMatch) {
                navigationSpan.updateName(onResolvedRouteMatch.routeId);
                navigationSpan.setAttribute(browser$1.SEMANTIC_ATTRIBUTE_SENTRY_SOURCE, "route");
                navigationSpan.setAttributes(routeMatchToParamSpanAttributes(onResolvedRouteMatch));
              }
            }
          });
        });
      }
    }
  };
}
function routeMatchToParamSpanAttributes(match) {
  if (!match) {
    return {};
  }
  const paramAttributes = {};
  Object.entries(match.params).forEach(([key, value]) => {
    paramAttributes[`url.path.params.${key}`] = value;
    paramAttributes[`url.path.parameter.${key}`] = value;
    paramAttributes[`params.${key}`] = value;
  });
  return paramAttributes;
}

exports.tanstackRouterBrowserTracingIntegration = tanstackRouterBrowserTracingIntegration;
//# sourceMappingURL=tanstackrouter.js.map
