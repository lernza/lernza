import { defineIntegration, browserPerformanceTimeOrigin, metrics } from '@sentry/core';
import { addPerformanceInstrumentationHandler } from './instrument.js';
import { getBrowserPerformanceAPI } from './utils.js';

const INTEGRATION_NAME = "ElementTiming";
const _elementTimingIntegration = (() => {
  return {
    name: INTEGRATION_NAME,
    setup() {
      const performance = getBrowserPerformanceAPI();
      if (!performance || !browserPerformanceTimeOrigin()) {
        return;
      }
      addPerformanceInstrumentationHandler("element", ({ entries }) => {
        for (const entry of entries) {
          const elementEntry = entry;
          if (!elementEntry.identifier) {
            continue;
          }
          const identifier = elementEntry.identifier;
          const paintType = elementEntry.name;
          const renderTime = elementEntry.renderTime;
          const loadTime = elementEntry.loadTime;
          const metricAttributes = {
            "sentry.origin": "auto.ui.browser.element_timing",
            "ui.element.identifier": identifier
          };
          if (paintType) {
            metricAttributes["ui.element.paint_type"] = paintType;
          }
          if (elementEntry.id) {
            metricAttributes["ui.element.id"] = elementEntry.id;
          }
          if (elementEntry.element) {
            metricAttributes["ui.element.type"] = elementEntry.element.tagName.toLowerCase();
          }
          if (elementEntry.url) {
            metricAttributes["ui.element.url"] = elementEntry.url;
          }
          if (elementEntry.naturalWidth) {
            metricAttributes["ui.element.width"] = elementEntry.naturalWidth;
          }
          if (elementEntry.naturalHeight) {
            metricAttributes["ui.element.height"] = elementEntry.naturalHeight;
          }
          if (renderTime > 0) {
            metrics.distribution(`ui.element.render_time`, renderTime, {
              unit: "millisecond",
              attributes: metricAttributes
            });
          }
          if (loadTime > 0) {
            metrics.distribution(`ui.element.load_time`, loadTime, {
              unit: "millisecond",
              attributes: metricAttributes
            });
          }
        }
      });
    }
  };
});
const elementTimingIntegration = defineIntegration(_elementTimingIntegration);
function startTrackingElementTiming() {
  return () => void 0;
}

export { elementTimingIntegration, startTrackingElementTiming };
//# sourceMappingURL=elementTiming.js.map
