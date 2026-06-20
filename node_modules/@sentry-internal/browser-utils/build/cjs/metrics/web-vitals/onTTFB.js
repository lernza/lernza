Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const types = require('../../types.js');
const bindReporter = require('./lib/bindReporter.js');
const getActivationStart = require('./lib/getActivationStart.js');
const getNavigationEntry = require('./lib/getNavigationEntry.js');
const initMetric = require('./lib/initMetric.js');
const whenActivated = require('./lib/whenActivated.js');

const TTFBThresholds = [800, 1800];
const whenReady = (callback) => {
  if (types.WINDOW.document?.prerendering) {
    whenActivated.whenActivated(() => whenReady(callback));
  } else if (types.WINDOW.document?.readyState !== "complete") {
    addEventListener("load", () => whenReady(callback), true);
  } else {
    setTimeout(callback);
  }
};
const onTTFB = (onReport, opts = {}) => {
  const metric = initMetric.initMetric("TTFB");
  const report = bindReporter.bindReporter(onReport, metric, TTFBThresholds, opts.reportAllChanges);
  whenReady(() => {
    const navigationEntry = getNavigationEntry.getNavigationEntry();
    if (navigationEntry) {
      metric.value = Math.max(navigationEntry.responseStart - getActivationStart.getActivationStart(), 0);
      metric.entries = [navigationEntry];
      report(true);
    }
  });
};

exports.TTFBThresholds = TTFBThresholds;
exports.onTTFB = onTTFB;
//# sourceMappingURL=onTTFB.js.map
