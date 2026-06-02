Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const browser = require('@sentry/core/browser');
const debugBuild = require('../debug-build.js');
const helpers = require('../helpers.js');
const utils = require('./utils.js');

function startProfileForSpan(span) {
  let startTimestamp;
  if (utils.isAutomatedPageLoadSpan(span)) {
    startTimestamp = browser.timestampInSeconds() * 1e3;
  }
  const profiler = utils.startJSSelfProfile();
  if (!profiler) {
    return;
  }
  if (debugBuild.DEBUG_BUILD) {
    browser.debug.log(`[Profiling] started profiling span: ${browser.spanToJSON(span).description}`);
  }
  const profileId = browser.uuid4();
  let processedProfile = null;
  browser.getCurrentScope().setContext("profile", {
    profile_id: profileId,
    start_timestamp: startTimestamp
  });
  utils.PROFILED_ROOT_SPANS.add(span);
  utils.setThreadAttributes(span);
  async function onProfileHandler() {
    if (!span) {
      return;
    }
    if (!profiler) {
      return;
    }
    if (processedProfile) {
      if (debugBuild.DEBUG_BUILD) {
        browser.debug.log("[Profiling] profile for:", browser.spanToJSON(span).description, "already exists, returning early");
      }
      return;
    }
    return profiler.stop().then((profile) => {
      if (maxDurationTimeoutID) {
        helpers.WINDOW.clearTimeout(maxDurationTimeoutID);
        maxDurationTimeoutID = void 0;
      }
      if (debugBuild.DEBUG_BUILD) {
        browser.debug.log(`[Profiling] stopped profiling of span: ${browser.spanToJSON(span).description}`);
      }
      if (!profile) {
        if (debugBuild.DEBUG_BUILD) {
          browser.debug.log(
            `[Profiling] profiler returned null profile for: ${browser.spanToJSON(span).description}`,
            "this may indicate an overlapping span or a call to stopProfiling with a profile title that was never started"
          );
        }
        return;
      }
      processedProfile = profile;
      utils.addProfileToGlobalCache(profileId, profile);
    }).catch((error) => {
      if (debugBuild.DEBUG_BUILD) {
        browser.debug.log("[Profiling] error while stopping profiler:", error);
      }
    });
  }
  let maxDurationTimeoutID = helpers.WINDOW.setTimeout(() => {
    if (debugBuild.DEBUG_BUILD) {
      browser.debug.log("[Profiling] max profile duration elapsed, stopping profiling for:", browser.spanToJSON(span).description);
    }
    onProfileHandler();
  }, utils.MAX_PROFILE_DURATION_MS);
  const originalEnd = span.end.bind(span);
  function profilingWrappedSpanEnd() {
    if (!span) {
      return originalEnd();
    }
    void onProfileHandler().then(
      () => {
        originalEnd();
      },
      () => {
        originalEnd();
      }
    );
    return span;
  }
  span.end = profilingWrappedSpanEnd;
}

exports.startProfileForSpan = startProfileForSpan;
//# sourceMappingURL=startProfileForSpan.js.map
