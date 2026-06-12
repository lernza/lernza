import { defineIntegration, debug, getActiveSpan, getRootSpan, hasSpansEnabled } from '@sentry/core/browser';
import { DEBUG_BUILD } from '../debug-build.js';
import { WINDOW } from '../helpers.js';
import { startProfileForSpan } from './startProfileForSpan.js';
import { UIProfiler } from './UIProfiler.js';
import { hasLegacyProfiling, isAutomatedPageLoadSpan, shouldProfileSpanLegacy, PROFILED_ROOT_SPANS, setThreadAttributes, getActiveProfilesCount, findProfiledTransactionsFromEnvelope, takeProfileFromGlobalCache, createProfilingEvent, addProfilesToEnvelope } from './utils.js';

const INTEGRATION_NAME = "BrowserProfiling";
const _browserProfilingIntegration = (() => {
  return {
    name: INTEGRATION_NAME,
    setup(client) {
      const options = client.getOptions();
      const profiler = new UIProfiler();
      if (!hasLegacyProfiling(options) && !options.profileLifecycle) {
        options.profileLifecycle = "manual";
      }
      if (hasLegacyProfiling(options) && !options.profilesSampleRate) {
        DEBUG_BUILD && debug.log("[Profiling] Profiling disabled, no profiling options found.");
        return;
      }
      const activeSpan = getActiveSpan();
      const rootSpan = activeSpan && getRootSpan(activeSpan);
      if (hasLegacyProfiling(options) && options.profileSessionSampleRate !== void 0) {
        DEBUG_BUILD && debug.warn(
          "[Profiling] Both legacy profiling (`profilesSampleRate`) and UI profiling settings are defined. `profileSessionSampleRate` has no effect when legacy profiling is enabled."
        );
      }
      if (!hasLegacyProfiling(options)) {
        const lifecycleMode = options.profileLifecycle;
        client.on("startUIProfiler", () => profiler.start());
        client.on("stopUIProfiler", () => profiler.stop());
        if (lifecycleMode === "manual") {
          profiler.initialize(client);
        } else if (lifecycleMode === "trace") {
          if (!hasSpansEnabled(options)) {
            DEBUG_BUILD && debug.warn(
              "[Profiling] `profileLifecycle` is 'trace' but tracing is disabled. Set a `tracesSampleRate` or `tracesSampler` to enable span tracing."
            );
            return;
          }
          profiler.initialize(client);
          if (rootSpan) {
            profiler.notifyRootSpanActive(rootSpan);
          }
          WINDOW.setTimeout(() => {
            const laterActiveSpan = getActiveSpan();
            const laterRootSpan = laterActiveSpan && getRootSpan(laterActiveSpan);
            if (laterRootSpan) {
              profiler.notifyRootSpanActive(laterRootSpan);
            }
          }, 0);
        }
      } else {
        if (rootSpan && isAutomatedPageLoadSpan(rootSpan)) {
          if (shouldProfileSpanLegacy(rootSpan)) {
            startProfileForSpan(rootSpan);
          }
        }
        client.on("spanStart", (span) => {
          const rootSpan2 = getRootSpan(span);
          if (span === rootSpan2) {
            if (shouldProfileSpanLegacy(span)) {
              startProfileForSpan(span);
            }
          } else if (PROFILED_ROOT_SPANS.has(rootSpan2)) {
            setThreadAttributes(span);
          }
        });
        client.on("beforeEnvelope", (envelope) => {
          if (!getActiveProfilesCount()) {
            return;
          }
          const profiledTransactionEvents = findProfiledTransactionsFromEnvelope(envelope);
          if (!profiledTransactionEvents.length) {
            return;
          }
          const profilesToAddToEnvelope = [];
          for (const profiledTransaction of profiledTransactionEvents) {
            const context = profiledTransaction?.contexts;
            const profile_id = context?.profile?.["profile_id"];
            const start_timestamp = context?.profile?.["start_timestamp"];
            if (typeof profile_id !== "string") {
              DEBUG_BUILD && debug.log("[Profiling] cannot find profile for a span without a profile context");
              continue;
            }
            if (!profile_id) {
              DEBUG_BUILD && debug.log("[Profiling] cannot find profile for a span without a profile context");
              continue;
            }
            if (context?.profile) {
              delete context.profile;
            }
            const profile = takeProfileFromGlobalCache(profile_id);
            if (!profile) {
              DEBUG_BUILD && debug.log(`[Profiling] Could not retrieve profile for span: ${profile_id}`);
              continue;
            }
            const profileEvent = createProfilingEvent(
              profile_id,
              start_timestamp,
              profile,
              profiledTransaction
            );
            if (profileEvent) {
              profilesToAddToEnvelope.push(profileEvent);
            }
          }
          addProfilesToEnvelope(envelope, profilesToAddToEnvelope);
        });
      }
    }
  };
});
const browserProfilingIntegration = defineIntegration(_browserProfilingIntegration);

export { browserProfilingIntegration };
//# sourceMappingURL=integration.js.map
