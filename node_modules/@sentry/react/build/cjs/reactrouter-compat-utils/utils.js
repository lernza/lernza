Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const browser = require('@sentry/core/browser');
const debugBuild = require('../debug-build.js');
const routeManifest = require('./route-manifest.js');

let _matchRoutes;
let _stripBasename = false;
const _navigationContextStack = [];
const MAX_CONTEXT_STACK_SIZE = 10;
function setNavigationContext(targetPath, span) {
  const token = {};
  if (_navigationContextStack.length >= MAX_CONTEXT_STACK_SIZE) {
    debugBuild.DEBUG_BUILD && browser.debug.warn("[React Router] Navigation context stack overflow - removing oldest context");
    _navigationContextStack.shift();
  }
  _navigationContextStack.push({ token, targetPath, span });
  return token;
}
function clearNavigationContext(token) {
  const top = _navigationContextStack[_navigationContextStack.length - 1];
  if (top?.token === token) {
    _navigationContextStack.pop();
  }
}
function getNavigationContext() {
  const length = _navigationContextStack.length;
  return length > 0 ? _navigationContextStack[length - 1] ?? null : null;
}
function initializeRouterUtils(matchRoutes, stripBasename = false) {
  _matchRoutes = matchRoutes;
  _stripBasename = stripBasename;
}
function pickPath(match) {
  return trimWildcard(match.route.path || "");
}
function pickSplat(match) {
  return match.params["*"] || "";
}
function trimWildcard(path) {
  return path[path.length - 1] === "*" ? path.slice(0, -1) : path;
}
function trimSlash(path) {
  return path[path.length - 1] === "/" ? path.slice(0, -1) : path;
}
function pathEndsWithWildcard(path) {
  return path.endsWith("*");
}
function transactionNameHasWildcard(name) {
  return name.includes("/*") || name.endsWith("*");
}
function pathIsWildcardAndHasChildren(path, branch) {
  return pathEndsWithWildcard(path) && !!branch.route.children?.length || false;
}
function routeIsDescendant(route) {
  return !!(!route.children && route.element && route.path?.endsWith("/*"));
}
function sendIndexPath(pathBuilder, pathname, basename) {
  const reconstructedPath = pathBuilder && pathBuilder.length > 0 ? pathBuilder : _stripBasename ? routeManifest.stripBasenameFromPathname(pathname, basename) : pathname;
  let formattedPath = (
    // If the path ends with a wildcard suffix, remove both the slash and the asterisk
    reconstructedPath.slice(-2) === "/*" ? reconstructedPath.slice(0, -2) : reconstructedPath
  );
  if (formattedPath.length > 1 && formattedPath[formattedPath.length - 1] === "/") {
    formattedPath = formattedPath.slice(0, -1);
  }
  return [formattedPath, "route"];
}
function getNumberOfUrlSegments(url) {
  return url.split(/\\?\//).filter((s) => s.length > 0 && s !== ",").length;
}
function prefixWithSlash(path) {
  return path[0] === "/" ? path : `/${path}`;
}
function rebuildRoutePathFromAllRoutes(allRoutes, location) {
  const matchedRoutes = _matchRoutes(allRoutes, location);
  if (!matchedRoutes || matchedRoutes.length === 0) {
    return "";
  }
  for (const match of matchedRoutes) {
    if (match.route.path && match.route.path !== "*") {
      const path = pickPath(match);
      const strippedPath = routeManifest.stripBasenameFromPathname(location.pathname, prefixWithSlash(match.pathnameBase));
      if (location.pathname === strippedPath) {
        return trimSlash(strippedPath);
      }
      return trimSlash(
        trimSlash(path || "") + prefixWithSlash(
          rebuildRoutePathFromAllRoutes(
            allRoutes.filter((route) => route !== match.route),
            {
              pathname: strippedPath
            }
          )
        )
      );
    }
  }
  return "";
}
function locationIsInsideDescendantRoute(location, routes) {
  const matchedRoutes = _matchRoutes(routes, location);
  if (matchedRoutes) {
    for (const match of matchedRoutes) {
      if (routeIsDescendant(match.route) && pickSplat(match)) {
        return true;
      }
    }
  }
  return false;
}
function getFallbackTransactionName(location, basename) {
  return _stripBasename ? routeManifest.stripBasenameFromPathname(location.pathname, basename) : location.pathname || "";
}
function getNormalizedName(routes, location, branches, basename = "") {
  if (!routes || routes.length === 0) {
    return [_stripBasename ? routeManifest.stripBasenameFromPathname(location.pathname, basename) : location.pathname, "url"];
  }
  if (!branches) {
    return [getFallbackTransactionName(location, basename), "url"];
  }
  let pathBuilder = "";
  for (const branch of branches) {
    const route = branch.route;
    if (!route) {
      continue;
    }
    if (route.index) {
      return sendIndexPath(pathBuilder, branch.pathname, basename);
    }
    const path = route.path;
    if (!path || pathIsWildcardAndHasChildren(path, branch)) {
      continue;
    }
    const newPath = path[0] === "/" || pathBuilder[pathBuilder.length - 1] === "/" ? path : `/${path}`;
    pathBuilder = trimSlash(pathBuilder) + prefixWithSlash(newPath);
    if (trimSlash(location.pathname) !== trimSlash(basename + branch.pathname)) {
      continue;
    }
    if (getNumberOfUrlSegments(pathBuilder) !== getNumberOfUrlSegments(branch.pathname) && !pathEndsWithWildcard(pathBuilder)) {
      return [(_stripBasename ? "" : basename) + newPath, "route"];
    }
    if (pathIsWildcardAndHasChildren(pathBuilder, branch)) {
      pathBuilder = pathBuilder.slice(0, -1);
    }
    return [(_stripBasename ? "" : basename) + pathBuilder, "route"];
  }
  return [getFallbackTransactionName(location, basename), "url"];
}
function resolveRouteNameAndSource(location, routes, allRoutes, branches, basename = "", lazyRouteManifest, enableAsyncRouteHandlers) {
  if (enableAsyncRouteHandlers && lazyRouteManifest && lazyRouteManifest.length > 0) {
    const manifestMatch = routeManifest.matchRouteManifest(location.pathname, lazyRouteManifest, basename);
    if (manifestMatch) {
      return [(_stripBasename ? "" : basename) + manifestMatch, "route"];
    }
  }
  let name;
  let source = "url";
  const isInDescendantRoute = locationIsInsideDescendantRoute(location, allRoutes);
  if (isInDescendantRoute) {
    name = prefixWithSlash(rebuildRoutePathFromAllRoutes(allRoutes, location));
    source = "route";
  }
  if (!isInDescendantRoute || !name) {
    [name, source] = getNormalizedName(routes, location, branches, basename);
  }
  return [name || location.pathname, source];
}
function getActiveRootSpan() {
  const span = browser.getActiveSpan();
  const rootSpan = span ? browser.getRootSpan(span) : void 0;
  if (!rootSpan) {
    return void 0;
  }
  const op = browser.spanToJSON(rootSpan).op;
  return op === "navigation" || op === "pageload" ? rootSpan : void 0;
}

exports.clearNavigationContext = clearNavigationContext;
exports.getActiveRootSpan = getActiveRootSpan;
exports.getNavigationContext = getNavigationContext;
exports.getNormalizedName = getNormalizedName;
exports.getNumberOfUrlSegments = getNumberOfUrlSegments;
exports.initializeRouterUtils = initializeRouterUtils;
exports.locationIsInsideDescendantRoute = locationIsInsideDescendantRoute;
exports.pathEndsWithWildcard = pathEndsWithWildcard;
exports.pathIsWildcardAndHasChildren = pathIsWildcardAndHasChildren;
exports.prefixWithSlash = prefixWithSlash;
exports.rebuildRoutePathFromAllRoutes = rebuildRoutePathFromAllRoutes;
exports.resolveRouteNameAndSource = resolveRouteNameAndSource;
exports.routeIsDescendant = routeIsDescendant;
exports.setNavigationContext = setNavigationContext;
exports.transactionNameHasWildcard = transactionNameHasWildcard;
//# sourceMappingURL=utils.js.map
