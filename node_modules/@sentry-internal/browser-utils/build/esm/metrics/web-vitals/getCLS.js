import { WINDOW } from '../../types.js';
import { bindReporter } from './lib/bindReporter.js';
import { getVisibilityWatcher } from './lib/getVisibilityWatcher.js';
import { initMetric } from './lib/initMetric.js';
import { initUnique } from './lib/initUnique.js';
import { LayoutShiftManager } from './lib/LayoutShiftManager.js';
import { observe } from './lib/observe.js';
import { runOnce } from './lib/runOnce.js';
import { onFCP } from './onFCP.js';

const CLSThresholds = [0.1, 0.25];
const onCLS = (onReport, opts = {}) => {
  onFCP(
    runOnce(() => {
      const metric = initMetric("CLS", 0);
      let report;
      const visibilityWatcher = getVisibilityWatcher();
      const layoutShiftManager = initUnique(opts, LayoutShiftManager);
      const handleEntries = (entries) => {
        for (const entry of entries) {
          layoutShiftManager._processEntry(entry);
        }
        if (layoutShiftManager._sessionValue > metric.value) {
          metric.value = layoutShiftManager._sessionValue;
          metric.entries = layoutShiftManager._sessionEntries;
          report();
        }
      };
      const po = observe("layout-shift", handleEntries);
      if (po) {
        report = bindReporter(onReport, metric, CLSThresholds, opts.reportAllChanges);
        visibilityWatcher.onHidden(() => {
          handleEntries(po.takeRecords());
          report(true);
        });
        WINDOW?.setTimeout?.(report);
      }
    })
  );
};

export { CLSThresholds, onCLS };
//# sourceMappingURL=getCLS.js.map
