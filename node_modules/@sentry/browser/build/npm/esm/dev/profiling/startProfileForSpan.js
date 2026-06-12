import { timestampInSeconds, debug, spanToJSON, uuid4, getCurrentScope } from '@sentry/core/browser';
import { DEBUG_BUILD } from '../debug-build.js';
import { WINDOW } from '../helpers.js';
import { isAutomatedPageLoadSpan, startJSSelfProfile, PROFILED_ROOT_SPANS, setThreadAttributes, MAX_PROFILE_DURATION_MS, addProfileToGlobalCache } from './utils.js';

function startProfileForSpan(span) {
  let startTimestamp;
  if (isAutomatedPageLoadSpan(span)) {
    startTimestamp = timestampInSeconds() * 1e3;
  }
  const profiler = startJSSelfProfile();
  if (!profiler) {
    return;
  }
  if (DEBUG_BUILD) {
    debug.log(`[Profiling] started profiling span: ${spanToJSON(span).description}`);
  }
  const profileId = uuid4();
  let processedProfile = null;
  getCurrentScope().setContext("profile", {
    profile_id: profileId,
    start_timestamp: startTimestamp
  });
  PROFILED_ROOT_SPANS.add(span);
  setThreadAttributes(span);
  async function onProfileHandler() {
    if (!span) {
      return;
    }
    if (!profiler) {
      return;
    }
    if (processedProfile) {
      if (DEBUG_BUILD) {
        debug.log("[Profiling] profile for:", spanToJSON(span).description, "already exists, returning early");
      }
      return;
    }
    return profiler.stop().then((profile) => {
      if (maxDurationTimeoutID) {
        WINDOW.clearTimeout(maxDurationTimeoutID);
        maxDurationTimeoutID = void 0;
      }
      if (DEBUG_BUILD) {
        debug.log(`[Profiling] stopped profiling of span: ${spanToJSON(span).description}`);
      }
      if (!profile) {
        if (DEBUG_BUILD) {
          debug.log(
            `[Profiling] profiler returned null profile for: ${spanToJSON(span).description}`,
            "this may indicate an overlapping span or a call to stopProfiling with a profile title that was never started"
          );
        }
        return;
      }
      processedProfile = profile;
      addProfileToGlobalCache(profileId, profile);
    }).catch((error) => {
      if (DEBUG_BUILD) {
        debug.log("[Profiling] error while stopping profiler:", error);
      }
    });
  }
  let maxDurationTimeoutID = WINDOW.setTimeout(() => {
    if (DEBUG_BUILD) {
      debug.log("[Profiling] max profile duration elapsed, stopping profiling for:", spanToJSON(span).description);
    }
    onProfileHandler();
  }, MAX_PROFILE_DURATION_MS);
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

export { startProfileForSpan };
//# sourceMappingURL=startProfileForSpan.js.map
