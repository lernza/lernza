Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const browser = require('@sentry/browser');
const core = require('@sentry/core');
const React = require('react');
const hoistNonReactStatics = require('./hoist-non-react-statics.js');

function reactRouterV4BrowserTracingIntegration(options) {
  const integration = browser.browserTracingIntegration({
    ...options,
    instrumentPageLoad: false,
    instrumentNavigation: false
  });
  const { history, routes, matchPath, instrumentPageLoad = true, instrumentNavigation = true } = options;
  return {
    ...integration,
    afterAllSetup(client) {
      integration.afterAllSetup(client);
      instrumentReactRouter(
        client,
        instrumentPageLoad,
        instrumentNavigation,
        history,
        "reactrouter_v4",
        routes,
        matchPath
      );
    }
  };
}
function reactRouterV5BrowserTracingIntegration(options) {
  const integration = browser.browserTracingIntegration({
    ...options,
    instrumentPageLoad: false,
    instrumentNavigation: false
  });
  const { history, routes, matchPath, instrumentPageLoad = true, instrumentNavigation = true } = options;
  return {
    ...integration,
    afterAllSetup(client) {
      integration.afterAllSetup(client);
      instrumentReactRouter(
        client,
        instrumentPageLoad,
        instrumentNavigation,
        history,
        "reactrouter_v5",
        routes,
        matchPath
      );
    }
  };
}
function instrumentReactRouter(client, instrumentPageLoad, instrumentNavigation, history, instrumentationName, allRoutes = [], matchPath) {
  function getInitPathName() {
    if (history.location) {
      return history.location.pathname;
    }
    if (browser.WINDOW.location) {
      return browser.WINDOW.location.pathname;
    }
    return void 0;
  }
  function normalizeTransactionName(pathname) {
    if (allRoutes.length === 0 || !matchPath) {
      return [pathname, "url"];
    }
    const branches = matchRoutes(allRoutes, pathname, matchPath);
    for (const branch of branches) {
      if (branch.match.isExact) {
        return [branch.match.path, "route"];
      }
    }
    return [pathname, "url"];
  }
  if (instrumentPageLoad) {
    const initPathName = getInitPathName();
    if (initPathName) {
      const [name, source] = normalizeTransactionName(initPathName);
      browser.startBrowserTracingPageLoadSpan(client, {
        name,
        attributes: {
          [core.SEMANTIC_ATTRIBUTE_SENTRY_OP]: "pageload",
          [core.SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN]: `auto.pageload.react.${instrumentationName}`,
          [core.SEMANTIC_ATTRIBUTE_SENTRY_SOURCE]: source
        }
      });
    }
  }
  if (instrumentNavigation && history.listen) {
    history.listen((location, action) => {
      if (action && (action === "PUSH" || action === "POP")) {
        const [name, source] = normalizeTransactionName(location.pathname);
        browser.startBrowserTracingNavigationSpan(client, {
          name,
          attributes: {
            [core.SEMANTIC_ATTRIBUTE_SENTRY_OP]: "navigation",
            [core.SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN]: `auto.navigation.react.${instrumentationName}`,
            [core.SEMANTIC_ATTRIBUTE_SENTRY_SOURCE]: source
          }
        });
      }
    });
  }
}
function matchRoutes(routes, pathname, matchPath, branch = []) {
  routes.some((route) => {
    const match = route.path ? matchPath(pathname, route) : branch.length ? (
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      branch[branch.length - 1].match
    ) : computeRootMatch(pathname);
    if (match) {
      branch.push({ route, match });
      if (route.routes) {
        matchRoutes(route.routes, pathname, matchPath, branch);
      }
    }
    return !!match;
  });
  return branch;
}
function computeRootMatch(pathname) {
  return { path: "/", url: "/", params: {}, isExact: pathname === "/" };
}
function withSentryRouting(Route) {
  const componentDisplayName = Route.displayName || Route.name;
  const WrappedRoute = (props) => {
    if (props?.computedMatch?.isExact) {
      const route = props.computedMatch.path;
      const activeRootSpan = getActiveRootSpan();
      core.getCurrentScope().setTransactionName(route);
      if (activeRootSpan) {
        activeRootSpan.updateName(route);
        activeRootSpan.setAttribute(core.SEMANTIC_ATTRIBUTE_SENTRY_SOURCE, "route");
      }
    }
    return /* @__PURE__ */ React.createElement(Route, { ...props });
  };
  WrappedRoute.displayName = `sentryRoute(${componentDisplayName})`;
  hoistNonReactStatics.hoistNonReactStatics(WrappedRoute, Route);
  return WrappedRoute;
}
function getActiveRootSpan() {
  const span = core.getActiveSpan();
  const rootSpan = span && core.getRootSpan(span);
  if (!rootSpan) {
    return void 0;
  }
  const op = core.spanToJSON(rootSpan).op;
  return op === "navigation" || op === "pageload" ? rootSpan : void 0;
}

exports.reactRouterV4BrowserTracingIntegration = reactRouterV4BrowserTracingIntegration;
exports.reactRouterV5BrowserTracingIntegration = reactRouterV5BrowserTracingIntegration;
exports.withSentryRouting = withSentryRouting;
//# sourceMappingURL=reactrouter.js.map
