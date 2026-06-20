Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const instrumentation = require('./reactrouter-compat-utils/instrumentation.js');
require('@sentry/core/browser');
require('@sentry/browser');
require('@sentry/core');

function reactRouterV6BrowserTracingIntegration(options) {
  return instrumentation.createReactRouterV6CompatibleTracingIntegration(options, "6");
}
function wrapUseRoutesV6(origUseRoutes) {
  return instrumentation.createV6CompatibleWrapUseRoutes(origUseRoutes, "6");
}
function wrapCreateBrowserRouterV6(createRouterFunction) {
  return instrumentation.createV6CompatibleWrapCreateBrowserRouter(createRouterFunction, "6");
}
function wrapCreateMemoryRouterV6(createMemoryRouterFunction) {
  return instrumentation.createV6CompatibleWrapCreateMemoryRouter(createMemoryRouterFunction, "6");
}
function withSentryReactRouterV6Routing(routes) {
  return instrumentation.createV6CompatibleWithSentryReactRouterRouting(routes, "6");
}

exports.reactRouterV6BrowserTracingIntegration = reactRouterV6BrowserTracingIntegration;
exports.withSentryReactRouterV6Routing = withSentryReactRouterV6Routing;
exports.wrapCreateBrowserRouterV6 = wrapCreateBrowserRouterV6;
exports.wrapCreateMemoryRouterV6 = wrapCreateMemoryRouterV6;
exports.wrapUseRoutesV6 = wrapUseRoutesV6;
//# sourceMappingURL=reactrouterv6.js.map
