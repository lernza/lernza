import { WINDOW } from '@sentry/browser';
import { addNonEnumerableProperty, debug, isThenable } from '@sentry/core';
import { DEBUG_BUILD } from '../debug-build.js';
import { getActiveRootSpan, getNavigationContext } from './utils.js';

function captureCurrentLocation() {
  const navContext = getNavigationContext();
  if (navContext) {
    if (navContext.targetPath) {
      return {
        pathname: navContext.targetPath,
        search: "",
        hash: "",
        state: null,
        key: "default"
      };
    }
    return null;
  }
  if (typeof WINDOW !== "undefined") {
    try {
      const windowLocation = WINDOW.location;
      if (windowLocation) {
        return {
          pathname: windowLocation.pathname,
          search: windowLocation.search || "",
          hash: windowLocation.hash || "",
          state: null,
          key: "default"
        };
      }
    } catch {
      DEBUG_BUILD && debug.warn("[React Router] Could not access window.location");
    }
  }
  return null;
}
function captureActiveSpan() {
  const navContext = getNavigationContext();
  if (navContext) {
    return navContext.span;
  }
  return getActiveRootSpan();
}
function createAsyncHandlerProxy(originalFunction, route, handlerKey, processResolvedRoutes) {
  const proxy = new Proxy(originalFunction, {
    apply(target, thisArg, argArray) {
      const locationAtInvocation = captureCurrentLocation();
      const spanAtInvocation = captureActiveSpan();
      const result = target.apply(thisArg, argArray);
      handleAsyncHandlerResult(
        result,
        route,
        handlerKey,
        processResolvedRoutes,
        locationAtInvocation,
        spanAtInvocation
      );
      return result;
    }
  });
  addNonEnumerableProperty(proxy, "__sentry_proxied__", true);
  return proxy;
}
function handleAsyncHandlerResult(result, route, handlerKey, processResolvedRoutes, currentLocation, capturedSpan) {
  if (isThenable(result)) {
    result.then((resolvedRoutes) => {
      if (Array.isArray(resolvedRoutes)) {
        processResolvedRoutes(resolvedRoutes, route, currentLocation ?? void 0, capturedSpan);
      }
    }).catch((e) => {
      DEBUG_BUILD && debug.warn(`Error resolving async handler '${handlerKey}' for route`, route, e);
    });
  } else if (Array.isArray(result)) {
    processResolvedRoutes(result, route, currentLocation ?? void 0, capturedSpan);
  }
}
function checkRouteForAsyncHandler(route, processResolvedRoutes) {
  if (route.handle && typeof route.handle === "object") {
    for (const key of Object.keys(route.handle)) {
      const maybeFn = route.handle[key];
      if (typeof maybeFn === "function" && !maybeFn.__sentry_proxied__) {
        route.handle[key] = createAsyncHandlerProxy(maybeFn, route, key, processResolvedRoutes);
      }
    }
  }
  if (Array.isArray(route.children)) {
    for (const child of route.children) {
      checkRouteForAsyncHandler(child, processResolvedRoutes);
    }
  }
}

export { checkRouteForAsyncHandler, createAsyncHandlerProxy, handleAsyncHandlerResult };
//# sourceMappingURL=lazy-routes.js.map
