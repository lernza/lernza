import { WINDOW } from '../../types.js';
import { bindReporter } from './lib/bindReporter.js';
import { getActivationStart } from './lib/getActivationStart.js';
import { getNavigationEntry } from './lib/getNavigationEntry.js';
import { initMetric } from './lib/initMetric.js';
import { whenActivated } from './lib/whenActivated.js';

const TTFBThresholds = [800, 1800];
const whenReady = (callback) => {
  if (WINDOW.document?.prerendering) {
    whenActivated(() => whenReady(callback));
  } else if (WINDOW.document?.readyState !== "complete") {
    addEventListener("load", () => whenReady(callback), true);
  } else {
    setTimeout(callback);
  }
};
const onTTFB = (onReport, opts = {}) => {
  const metric = initMetric("TTFB");
  const report = bindReporter(onReport, metric, TTFBThresholds, opts.reportAllChanges);
  whenReady(() => {
    const navigationEntry = getNavigationEntry();
    if (navigationEntry) {
      metric.value = Math.max(navigationEntry.responseStart - getActivationStart(), 0);
      metric.entries = [navigationEntry];
      report(true);
    }
  });
};

export { TTFBThresholds, onTTFB };
//# sourceMappingURL=onTTFB.js.map
