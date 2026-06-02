import { browserTracingIntegration, WINDOW, startBrowserTracingPageLoadSpan, startBrowserTracingNavigationSpan } from '@sentry/browser';
import { SEMANTIC_ATTRIBUTE_SENTRY_SOURCE, SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN, SEMANTIC_ATTRIBUTE_SENTRY_OP } from '@sentry/core/browser';

function tanstackRouterBrowserTracingIntegration(router, options = {}) {
  const castRouterInstance = router;
  const browserTracingIntegrationInstance = browserTracingIntegration({
    ...options,
    instrumentNavigation: false,
    instrumentPageLoad: false
  });
  const { instrumentPageLoad = true, instrumentNavigation = true } = options;
  return {
    ...browserTracingIntegrationInstance,
    afterAllSetup(client) {
      browserTracingIntegrationInstance.afterAllSetup(client);
      const initialWindowLocation = WINDOW.location;
      if (instrumentPageLoad && initialWindowLocation) {
        const matchedRoutes = castRouterInstance.matchRoutes(
          initialWindowLocation.pathname,
          castRouterInstance.options.parseSearch(initialWindowLocation.search),
          { preload: false, throwOnError: false }
        );
        const lastMatch = matchedRoutes[matchedRoutes.length - 1];
        const routeMatch = lastMatch?.routeId !== "__root__" ? lastMatch : void 0;
        startBrowserTracingPageLoadSpan(client, {
          name: routeMatch ? routeMatch.routeId : initialWindowLocation.pathname,
          attributes: {
            [SEMANTIC_ATTRIBUTE_SENTRY_OP]: "pageload",
            [SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN]: "auto.pageload.react.tanstack_router",
            [SEMANTIC_ATTRIBUTE_SENTRY_SOURCE]: routeMatch ? "route" : "url",
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
          const navigationLocation = WINDOW.location;
          const navigationSpan = startBrowserTracingNavigationSpan(client, {
            name: onBeforeNavigateRouteMatch ? onBeforeNavigateRouteMatch.routeId : navigationLocation.pathname,
            attributes: {
              [SEMANTIC_ATTRIBUTE_SENTRY_OP]: "navigation",
              [SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN]: "auto.navigation.react.tanstack_router",
              [SEMANTIC_ATTRIBUTE_SENTRY_SOURCE]: onBeforeNavigateRouteMatch ? "route" : "url"
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
                navigationSpan.setAttribute(SEMANTIC_ATTRIBUTE_SENTRY_SOURCE, "route");
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

export { tanstackRouterBrowserTracingIntegration };
//# sourceMappingURL=tanstackrouter.js.map
