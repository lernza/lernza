Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const instrumentation = require('./reactrouter-compat-utils/instrumentation.js');
require('@sentry/core/browser');
require('@sentry/browser');
require('@sentry/core');

function reactRouterV7BrowserTracingIntegration(options) {
  return instrumentation.createReactRouterV6CompatibleTracingIntegration(options, "7");
}
function withSentryReactRouterV7Routing(routes) {
  return instrumentation.createV6CompatibleWithSentryReactRouterRouting(routes, "7");
}
function wrapCreateBrowserRouterV7(createRouterFunction) {
  return instrumentation.createV6CompatibleWrapCreateBrowserRouter(createRouterFunction, "7");
}
function wrapCreateMemoryRouterV7(createMemoryRouterFunction) {
  return instrumentation.createV6CompatibleWrapCreateMemoryRouter(createMemoryRouterFunction, "7");
}
function wrapUseRoutesV7(origUseRoutes) {
  return instrumentation.createV6CompatibleWrapUseRoutes(origUseRoutes, "7");
}

exports.reactRouterV7BrowserTracingIntegration = reactRouterV7BrowserTracingIntegration;
exports.withSentryReactRouterV7Routing = withSentryReactRouterV7Routing;
exports.wrapCreateBrowserRouterV7 = wrapCreateBrowserRouterV7;
exports.wrapCreateMemoryRouterV7 = wrapCreateMemoryRouterV7;
exports.wrapUseRoutesV7 = wrapUseRoutesV7;
//# sourceMappingURL=reactrouterv7.js.map
