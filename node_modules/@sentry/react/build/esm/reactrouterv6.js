import { createReactRouterV6CompatibleTracingIntegration, createV6CompatibleWithSentryReactRouterRouting, createV6CompatibleWrapCreateBrowserRouter, createV6CompatibleWrapCreateMemoryRouter, createV6CompatibleWrapUseRoutes } from './reactrouter-compat-utils/instrumentation.js';
import '@sentry/core/browser';
import '@sentry/browser';
import '@sentry/core';

function reactRouterV6BrowserTracingIntegration(options) {
  return createReactRouterV6CompatibleTracingIntegration(options, "6");
}
function wrapUseRoutesV6(origUseRoutes) {
  return createV6CompatibleWrapUseRoutes(origUseRoutes, "6");
}
function wrapCreateBrowserRouterV6(createRouterFunction) {
  return createV6CompatibleWrapCreateBrowserRouter(createRouterFunction, "6");
}
function wrapCreateMemoryRouterV6(createMemoryRouterFunction) {
  return createV6CompatibleWrapCreateMemoryRouter(createMemoryRouterFunction, "6");
}
function withSentryReactRouterV6Routing(routes) {
  return createV6CompatibleWithSentryReactRouterRouting(routes, "6");
}

export { reactRouterV6BrowserTracingIntegration, withSentryReactRouterV6Routing, wrapCreateBrowserRouterV6, wrapCreateMemoryRouterV6, wrapUseRoutesV6 };
//# sourceMappingURL=reactrouterv6.js.map
