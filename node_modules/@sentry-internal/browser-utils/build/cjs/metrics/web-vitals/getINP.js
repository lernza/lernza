Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const bindReporter = require('./lib/bindReporter.js');
const getVisibilityWatcher = require('./lib/getVisibilityWatcher.js');
const initMetric = require('./lib/initMetric.js');
const initUnique = require('./lib/initUnique.js');
const InteractionManager = require('./lib/InteractionManager.js');
const observe = require('./lib/observe.js');
const interactionCountPolyfill = require('./lib/polyfills/interactionCountPolyfill.js');
const whenActivated = require('./lib/whenActivated.js');
const whenIdleOrHidden = require('./lib/whenIdleOrHidden.js');

const INPThresholds = [200, 500];
const DEFAULT_DURATION_THRESHOLD = 40;
const onINP = (onReport, opts = {}) => {
  if (!(globalThis.PerformanceEventTiming && "interactionId" in PerformanceEventTiming.prototype)) {
    return;
  }
  const visibilityWatcher = getVisibilityWatcher.getVisibilityWatcher();
  whenActivated.whenActivated(() => {
    interactionCountPolyfill.initInteractionCountPolyfill();
    const metric = initMetric.initMetric("INP");
    let report;
    const interactionManager = initUnique.initUnique(opts, InteractionManager.InteractionManager);
    const handleEntries = (entries) => {
      whenIdleOrHidden.whenIdleOrHidden(() => {
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
    const po = observe.observe("event", handleEntries, {
      // Event Timing entries have their durations rounded to the nearest 8ms,
      // so a duration of 40ms would be any event that spans 2.5 or more frames
      // at 60Hz. This threshold is chosen to strike a balance between usefulness
      // and performance. Running this callback for any interaction that spans
      // just one or two frames is likely not worth the insight that could be
      // gained.
      durationThreshold: opts.durationThreshold ?? DEFAULT_DURATION_THRESHOLD
    });
    report = bindReporter.bindReporter(onReport, metric, INPThresholds, opts.reportAllChanges);
    if (po) {
      po.observe({ type: "first-input", buffered: true });
      visibilityWatcher.onHidden(() => {
        handleEntries(po.takeRecords());
        report(true);
      });
    }
  });
};

exports.INPThresholds = INPThresholds;
exports.onINP = onINP;
//# sourceMappingURL=getINP.js.map
