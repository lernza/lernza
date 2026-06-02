import { debug } from '@sentry/core/browser';
import { DEBUG_BUILD } from '../debug-build.js';

function stripBasenameFromPathname(pathname, basename) {
  if (!basename || basename === "/") {
    return pathname;
  }
  if (!pathname.toLowerCase().startsWith(basename.toLowerCase())) {
    return pathname;
  }
  const startIndex = basename.endsWith("/") ? basename.length - 1 : basename.length;
  const nextChar = pathname.charAt(startIndex);
  if (nextChar && nextChar !== "/") {
    return pathname;
  }
  return pathname.slice(startIndex) || "/";
}
const SORTED_MANIFEST_CACHE = /* @__PURE__ */ new WeakMap();
function matchRouteManifest(pathname, manifest, basename) {
  if (!pathname || !manifest?.length) {
    return null;
  }
  const normalizedPathname = basename ? stripBasenameFromPathname(pathname, basename) : pathname;
  let sorted = SORTED_MANIFEST_CACHE.get(manifest);
  if (!sorted) {
    sorted = sortBySpecificity(manifest);
    SORTED_MANIFEST_CACHE.set(manifest, sorted);
    DEBUG_BUILD && debug.log("[React Router] Sorted route manifest by specificity:", sorted.length, "patterns");
  }
  for (const pattern of sorted) {
    if (matchesPattern(normalizedPathname, pattern)) {
      DEBUG_BUILD && debug.log("[React Router] Matched pathname", normalizedPathname, "to pattern", pattern);
      return pattern;
    }
  }
  DEBUG_BUILD && debug.log("[React Router] No manifest match found for pathname:", normalizedPathname);
  return null;
}
function matchesPattern(pathname, pattern) {
  if (pattern === "/") {
    return pathname === "/" || pathname === "";
  }
  const pathSegments = splitPath(pathname);
  const patternSegments = splitPath(pattern);
  const hasWildcard = patternSegments.length > 0 && patternSegments[patternSegments.length - 1] === "*";
  if (hasWildcard) {
    const patternSegmentsWithoutWildcard = patternSegments.slice(0, -1);
    if (pathSegments.length < patternSegmentsWithoutWildcard.length) {
      return false;
    }
    for (const [i, patternSegment] of patternSegmentsWithoutWildcard.entries()) {
      if (!segmentMatches(pathSegments[i], patternSegment)) {
        return false;
      }
    }
    return true;
  }
  if (pathSegments.length !== patternSegments.length) {
    return false;
  }
  for (const [i, patternSegment] of patternSegments.entries()) {
    if (!segmentMatches(pathSegments[i], patternSegment)) {
      return false;
    }
  }
  return true;
}
function segmentMatches(pathSegment, patternSegment) {
  if (pathSegment === void 0 || patternSegment === void 0) {
    return false;
  }
  if (PARAM_RE.test(patternSegment)) {
    return true;
  }
  return pathSegment === patternSegment;
}
function splitPath(path) {
  return path.split("/").filter(Boolean);
}
const PARAM_RE = /^:[\w-]+$/;
const STATIC_SEGMENT_SCORE = 10;
const DYNAMIC_SEGMENT_SCORE = 3;
const EMPTY_SEGMENT_SCORE = 1;
const SPLAT_PENALTY = -2;
function computeScore(pattern) {
  const segments = pattern.split("/");
  let score = segments.length;
  if (segments.includes("*")) {
    score += SPLAT_PENALTY;
  }
  for (const segment of segments) {
    if (segment === "*") {
      continue;
    } else if (PARAM_RE.test(segment)) {
      score += DYNAMIC_SEGMENT_SCORE;
    } else if (segment === "") {
      score += EMPTY_SEGMENT_SCORE;
    } else {
      score += STATIC_SEGMENT_SCORE;
    }
  }
  return score;
}
function sortBySpecificity(manifest) {
  return [...manifest].sort((a, b) => {
    const aScore = computeScore(a);
    const bScore = computeScore(b);
    return bScore - aScore;
  });
}

export { matchRouteManifest, stripBasenameFromPathname };
//# sourceMappingURL=route-manifest.js.map
