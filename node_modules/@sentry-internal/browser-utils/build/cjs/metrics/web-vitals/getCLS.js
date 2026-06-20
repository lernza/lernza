Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const types = require('../../types.js');
const bindReporter = require('./lib/bindReporter.js');
const getVisibilityWatcher = require('./lib/getVisibilityWatcher.js');
const initMetric = require('./lib/initMetric.js');
const initUnique = require('./lib/initUnique.js');
const LayoutShiftManager = require('./lib/LayoutShiftManager.js');
const observe = require('./lib/observe.js');
const runOnce = require('./lib/runOnce.js');
const onFCP = require('./onFCP.js');

const CLSThresholds = [0.1, 0.25];
const onCLS = (onReport, opts = {}) => {
  onFCP.onFCP(
    runOnce.runOnce(() => {
      const metric = initMetric.initMetric("CLS", 0);
      let report;
      const visibilityWatcher = getVisibilityWatcher.getVisibilityWatcher();
      const layoutShiftManager = initUnique.initUnique(opts, LayoutShiftManager.LayoutShiftManager);
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
      const po = observe.observe("layout-shift", handleEntries);
      if (po) {
        report = bindReporter.bindReporter(onReport, metric, CLSThresholds, opts.reportAllChanges);
        visibilityWatcher.onHidden(() => {
          handleEntries(po.takeRecords());
          report(true);
        });
        types.WINDOW?.setTimeout?.(report);
      }
    })
  );
};

exports.CLSThresholds = CLSThresholds;
exports.onCLS = onCLS;
//# sourceMappingURL=getCLS.js.map
