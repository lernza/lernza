import { bindReporter } from './lib/bindReporter.js';
import { getVisibilityWatcher } from './lib/getVisibilityWatcher.js';
import { initMetric } from './lib/initMetric.js';
import { initUnique } from './lib/initUnique.js';
import { InteractionManager } from './lib/InteractionManager.js';
import { observe } from './lib/observe.js';
import { initInteractionCountPolyfill } from './lib/polyfills/interactionCountPolyfill.js';
import { whenActivated } from './lib/whenActivated.js';
import { whenIdleOrHidden } from './lib/whenIdleOrHidden.js';

const INPThresholds = [200, 500];
const DEFAULT_DURATION_THRESHOLD = 40;
const onINP = (onReport, opts = {}) => {
  if (!(globalThis.PerformanceEventTiming && "interactionId" in PerformanceEventTiming.prototype)) {
    return;
  }
  const visibilityWatcher = getVisibilityWatcher();
  whenActivated(() => {
    initInteractionCountPolyfill();
    const metric = initMetric("INP");
    let report;
    const interactionManager = initUnique(opts, InteractionManager);
    const handleEntries = (entries) => {
      whenIdleOrHidden(() => {
        for (const entry of entries) {
          interactionManager._processEntry(entry);
        }
        const inp = interactionManager._estimateP98LongestInteraction();
        if (inp && inp._latency !== metric.value) {
          metric.value = inp._latency;
          metric.entries = inp.entries;
          report();
        }
      });
    };
    const po = observe("event", handleEntries, {
      // Event Timing entries have their durations rounded to the nearest 8ms,
      // so a duration of 40ms would be any event that spans 2.5 or more frames
      // at 60Hz. This threshold is chosen to strike a balance between usefulness
      // and performance. Running this callback for any interaction that spans
      // just one or two frames is likely not worth the insight that could be
      // gained.
      durationThreshold: opts.durationThreshold ?? DEFAULT_DURATION_THRESHOLD
    });
    report = bindReporter(onReport, metric, INPThresholds, opts.reportAllChanges);
    if (po) {
      po.observe({ type: "first-input", buffered: true });
      visibilityWatcher.onHidden(() => {
        handleEntries(po.takeRecords());
        report(true);
      });
    }
  });
};

export { INPThresholds, onINP };
//# sourceMappingURL=getINP.js.map
