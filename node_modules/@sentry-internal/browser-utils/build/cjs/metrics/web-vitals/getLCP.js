Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const bindReporter = require('./lib/bindReporter.js');
const getActivationStart = require('./lib/getActivationStart.js');
const getVisibilityWatcher = require('./lib/getVisibilityWatcher.js');
const globalListeners = require('./lib/globalListeners.js');
const initMetric = require('./lib/initMetric.js');
const initUnique = require('./lib/initUnique.js');
const LCPEntryManager = require('./lib/LCPEntryManager.js');
const observe = require('./lib/observe.js');
const runOnce = require('./lib/runOnce.js');
const whenActivated = require('./lib/whenActivated.js');
const whenIdleOrHidden = require('./lib/whenIdleOrHidden.js');

const LCPThresholds = [2500, 4e3];
const onLCP = (onReport, opts = {}) => {
  whenActivated.whenActivated(() => {
    const visibilityWatcher = getVisibilityWatcher.getVisibilityWatcher();
    const metric = initMetric.initMetric("LCP");
    let report;
    const lcpEntryManager = initUnique.initUnique(opts, LCPEntryManager.LCPEntryManager);
    const handleEntries = (entries) => {
      if (!opts.reportAllChanges) {
        entries = entries.slice(-1);
      }
      for (const entry of entries) {
        lcpEntryManager._processEntry(entry);
        if (entry.startTime < visibilityWatcher.firstHiddenTime) {
          metric.value = Math.max(entry.startTime - getActivationStart.getActivationStart(), 0);
          metric.entries = [entry];
          report();
        }
      }
    };
    const po = observe.observe("largest-contentful-paint", handleEntries);
    if (po) {
      report = bindReporter.bindReporter(onReport, metric, LCPThresholds, opts.reportAllChanges);
      const stopListening = runOnce.runOnce(() => {
        handleEntries(po.takeRecords());
        po.disconnect();
        report(true);
      });
      const stopListeningWrapper = (event) => {
        if (event.isTrusted) {
          whenIdleOrHidden.whenIdleOrHidden(stopListening);
          globalListeners.removePageListener(event.type, stopListeningWrapper, {
            capture: true
          });
        }
      };
      for (const type of ["keydown", "click", "visibilitychange"]) {
        globalListeners.addPageListener(type, stopListeningWrapper, {
          capture: true
        });
      }
    }
  });
};

exports.LCPThresholds = LCPThresholds;
exports.onLCP = onLCP;
//# sourceMappingURL=getLCP.js.map
