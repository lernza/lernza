import { createReactRouterV6CompatibleTracingIntegration, createV6CompatibleWithSentryReactRouterRouting, createV6CompatibleWrapCreateBrowserRouter, createV6CompatibleWrapCreateMemoryRouter, createV6CompatibleWrapUseRoutes } from './reactrouter-compat-utils/instrumentation.js';
import '@sentry/core/browser';
import '@sentry/browser';
import '@sentry/core';

function reactRouterV7BrowserTracingIntegration(options) {
  return createReactRouterV6CompatibleTracingIntegration(options, "7");
}
function withSentryReactRouterV7Routing(routes) {
  return createV6CompatibleWithSentryReactRouterRouting(routes, "7");
}
function wrapCreateBrowserRouterV7(createRouterFunction) {
  return createV6CompatibleWrapCreateBrowserRouter(createRouterFunction, "7");
}
function wrapCreateMemoryRouterV7(createMemoryRouterFunction) {
  return createV6CompatibleWrapCreateMemoryRouter(createMemoryRouterFunction, "7");
}
function wrapUseRoutesV7(origUseRoutes) {
  return createV6CompatibleWrapUseRoutes(origUseRoutes, "7");
}

export { reactRouterV7BrowserTracingIntegration, withSentryReactRouterV7Routing, wrapCreateBrowserRouterV7, wrapCreateMemoryRouterV7, wrapUseRoutesV7 };
//# sourceMappingURL=reactrouterv7.js.map
