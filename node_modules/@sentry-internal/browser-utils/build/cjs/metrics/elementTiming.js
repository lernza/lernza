Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const core = require('@sentry/core');
const instrument = require('./instrument.js');
const utils = require('./utils.js');

const INTEGRATION_NAME = "ElementTiming";
const _elementTimingIntegration = (() => {
  return {
    name: INTEGRATION_NAME,
    setup() {
      const performance = utils.getBrowserPerformanceAPI();
      if (!performance || !core.browserPerformanceTimeOrigin()) {
        return;
      }
      instrument.addPerformanceInstrumentationHandler("element", ({ entries }) => {
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
            core.metrics.distribution(`ui.element.render_time`, renderTime, {
              unit: "millisecond",
              attributes: metricAttributes
            });
          }
          if (loadTime > 0) {
            core.metrics.distribution(`ui.element.load_time`, loadTime, {
              unit: "millisecond",
              attributes: metricAttributes
            });
          }
        }
      });
    }
  };
});
const elementTimingIntegration = core.defineIntegration(_elementTimingIntegration);
function startTrackingElementTiming() {
  return () => void 0;
}

exports.elementTimingIntegration = elementTimingIntegration;
exports.startTrackingElementTiming = startTrackingElementTiming;
//# sourceMappingURL=elementTiming.js.map
