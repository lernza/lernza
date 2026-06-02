Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const bindReporter = require('./lib/bindReporter.js');
const getActivationStart = require('./lib/getActivationStart.js');
const getVisibilityWatcher = require('./lib/getVisibilityWatcher.js');
const initMetric = require('./lib/initMetric.js');
const observe = require('./lib/observe.js');
const whenActivated = require('./lib/whenActivated.js');

const FCPThresholds = [1800, 3e3];
const onFCP = (onReport, opts = {}) => {
  whenActivated.whenActivated(() => {
    const visibilityWatcher = getVisibilityWatcher.getVisibilityWatcher();
    const metric = initMetric.initMetric("FCP");
    let report;
    const handleEntries = (entries) => {
      for (const entry of entries) {
        if (entry.name === "first-contentful-paint") {
          po.disconnect();
          if (entry.startTime < visibilityWatcher.firstHiddenTime) {
            metric.value = Math.max(entry.startTime - getActivationStart.getActivationStart(), 0);
            metric.entries.push(entry);
            report(true);
          }
        }
      }
    };
    const po = observe.observe("paint", handleEntries);
    if (po) {
      report = bindReporter.bindReporter(onReport, metric, FCPThresholds, opts.reportAllChanges);
    }
  });
};

exports.FCPThresholds = FCPThresholds;
exports.onFCP = onFCP;
//# sourceMappingURL=onFCP.js.map
