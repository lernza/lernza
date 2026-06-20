import { bindReporter } from './lib/bindReporter.js';
import { getActivationStart } from './lib/getActivationStart.js';
import { getVisibilityWatcher } from './lib/getVisibilityWatcher.js';
import { addPageListener, removePageListener } from './lib/globalListeners.js';
import { initMetric } from './lib/initMetric.js';
import { initUnique } from './lib/initUnique.js';
import { LCPEntryManager } from './lib/LCPEntryManager.js';
import { observe } from './lib/observe.js';
import { runOnce } from './lib/runOnce.js';
import { whenActivated } from './lib/whenActivated.js';
import { whenIdleOrHidden } from './lib/whenIdleOrHidden.js';

const LCPThresholds = [2500, 4e3];
const onLCP = (onReport, opts = {}) => {
  whenActivated(() => {
    const visibilityWatcher = getVisibilityWatcher();
    const metric = initMetric("LCP");
    let report;
    const lcpEntryManager = initUnique(opts, LCPEntryManager);
    const handleEntries = (entries) => {
      if (!opts.reportAllChanges) {
        entries = entries.slice(-1);
      }
      for (const entry of entries) {
        lcpEntryManager._processEntry(entry);
        if (entry.startTime < visibilityWatcher.firstHiddenTime) {
          metric.value = Math.max(entry.startTime - getActivationStart(), 0);
          metric.entries = [entry];
          report();
        }
      }
    };
    const po = observe("largest-contentful-paint", handleEntries);
    if (po) {
      report = bindReporter(onReport, metric, LCPThresholds, opts.reportAllChanges);
      const stopListening = runOnce(() => {
        handleEntries(po.takeRecords());
        po.disconnect();
        report(true);
      });
      const stopListeningWrapper = (event) => {
        if (event.isTrusted) {
          whenIdleOrHidden(stopListening);
          removePageListener(event.type, stopListeningWrapper, {
            capture: true
          });
        }
      };
      for (const type of ["keydown", "click", "visibilitychange"]) {
        addPageListener(type, stopListeningWrapper, {
          capture: true
        });
      }
    }
  });
};

export { LCPThresholds, onLCP };
//# sourceMappingURL=getLCP.js.map
