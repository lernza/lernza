Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const browser = require('@sentry/core/browser');
const debugBuild = require('../debug-build.js');
const helpers = require('../helpers.js');
const startProfileForSpan = require('./startProfileForSpan.js');
const UIProfiler = require('./UIProfiler.js');
const utils = require('./utils.js');

const INTEGRATION_NAME = "BrowserProfiling";
const _browserProfilingIntegration = (() => {
  return {
    name: INTEGRATION_NAME,
    setup(client) {
      const options = client.getOptions();
      const profiler = new UIProfiler.UIProfiler();
      if (!utils.hasLegacyProfiling(options) && !options.profileLifecycle) {
        options.profileLifecycle = "manual";
      }
      if (utils.hasLegacyProfiling(options) && !options.profilesSampleRate) {
        debugBuild.DEBUG_BUILD && browser.debug.log("[Profiling] Profiling disabled, no profiling options found.");
        return;
      }
      const activeSpan = browser.getActiveSpan();
      const rootSpan = activeSpan && browser.getRootSpan(activeSpan);
      if (utils.hasLegacyProfiling(options) && options.profileSessionSampleRate !== void 0) {
        debugBuild.DEBUG_BUILD && browser.debug.warn(
          "[Profiling] Both legacy profiling (`profilesSampleRate`) and UI profiling settings are defined. `profileSessionSampleRate` has no effect when legacy profiling is enabled."
        );
      }
      if (!utils.hasLegacyProfiling(options)) {
        const lifecycleMode = options.profileLifecycle;
        client.on("startUIProfiler", () => profiler.start());
        client.on("stopUIProfiler", () => profiler.stop());
        if (lifecycleMode === "manual") {
          profiler.initialize(client);
        } else if (lifecycleMode === "trace") {
          if (!browser.hasSpansEnabled(options)) {
            debugBuild.DEBUG_BUILD && browser.debug.warn(
              "[Profiling] `profileLifecycle` is 'trace' but tracing is disabled. Set a `tracesSampleRate` or `tracesSampler` to enable span tracing."
            );
            return;
          }
          profiler.initialize(client);
          if (rootSpan) {
            profiler.notifyRootSpanActive(rootSpan);
          }
          helpers.WINDOW.setTimeout(() => {
            const laterActiveSpan = browser.getActiveSpan();
            const laterRootSpan = laterActiveSpan && browser.getRootSpan(laterActiveSpan);
            if (laterRootSpan) {
              profiler.notifyRootSpanActive(laterRootSpan);
            }
          }, 0);
        }
      } else {
        if (rootSpan && utils.isAutomatedPageLoadSpan(rootSpan)) {
          if (utils.shouldProfileSpanLegacy(rootSpan)) {
            startProfileForSpan.startProfileForSpan(rootSpan);
          }
        }
        client.on("spanStart", (span) => {
          const rootSpan2 = browser.getRootSpan(span);
          if (span === rootSpan2) {
            if (utils.shouldProfileSpanLegacy(span)) {
              startProfileForSpan.startProfileForSpan(span);
            }
          } else if (utils.PROFILED_ROOT_SPANS.has(rootSpan2)) {
            utils.setThreadAttributes(span);
          }
        });
        client.on("beforeEnvelope", (envelope) => {
          if (!utils.getActiveProfilesCount()) {
            return;
          }
          const profiledTransactionEvents = utils.findProfiledTransactionsFromEnvelope(envelope);
          if (!profiledTransactionEvents.length) {
            return;
          }
          const profilesToAddToEnvelope = [];
          for (const profiledTransaction of profiledTransactionEvents) {
            const context = profiledTransaction?.contexts;
            const profile_id = context?.profile?.["profile_id"];
            const start_timestamp = context?.profile?.["start_timestamp"];
            if (typeof profile_id !== "string") {
              debugBuild.DEBUG_BUILD && browser.debug.log("[Profiling] cannot find profile for a span without a profile context");
              continue;
            }
            if (!profile_id) {
              debugBuild.DEBUG_BUILD && browser.debug.log("[Profiling] cannot find profile for a span without a profile context");
              continue;
            }
            if (context?.profile) {
              delete context.profile;
            }
            const profile = utils.takeProfileFromGlobalCache(profile_id);
            if (!profile) {
              debugBuild.DEBUG_BUILD && browser.debug.log(`[Profiling] Could not retrieve profile for span: ${profile_id}`);
              continue;
            }
            const profileEvent = utils.createProfilingEvent(
              profile_id,
              start_timestamp,
              profile,
              profiledTransaction
            );
            if (profileEvent) {
              profilesToAddToEnvelope.push(profileEvent);
            }
          }
          utils.addProfilesToEnvelope(envelope, profilesToAddToEnvelope);
        });
      }
    }
  };
});
const browserProfilingIntegration = browser.defineIntegration(_browserProfilingIntegration);

exports.browserProfilingIntegration = browserProfilingIntegration;
//# sourceMappingURL=integration.js.map
