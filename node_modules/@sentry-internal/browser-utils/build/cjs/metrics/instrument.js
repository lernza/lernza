Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const core = require('@sentry/core');
const debugBuild = require('../debug-build.js');
const getCLS = require('./web-vitals/getCLS.js');
const getINP = require('./web-vitals/getINP.js');
const getLCP = require('./web-vitals/getLCP.js');
const observe = require('./web-vitals/lib/observe.js');
const onTTFB = require('./web-vitals/onTTFB.js');

const handlers = {};
const instrumented = {};
let _previousCls;
let _previousLcp;
let _previousTtfb;
let _previousInp;
function addClsInstrumentationHandler(callback, stopOnCallback = false) {
  return addMetricObserver("cls", callback, instrumentCls, _previousCls, stopOnCallback);
}
function addLcpInstrumentationHandler(callback, stopOnCallback = false) {
  return addMetricObserver("lcp", callback, instrumentLcp, _previousLcp, stopOnCallback);
}
function addTtfbInstrumentationHandler(callback) {
  return addMetricObserver("ttfb", callback, instrumentTtfb, _previousTtfb);
}
function addInpInstrumentationHandler(callback) {
  return addMetricObserver("inp", callback, instrumentInp, _previousInp);
}
function addPerformanceInstrumentationHandler(type, callback) {
  addHandler(type, callback);
  if (!instrumented[type]) {
    instrumentPerformanceObserver(type);
    instrumented[type] = true;
  }
  return getCleanupCallback(type, callback);
}
function triggerHandlers(type, data) {
  const typeHandlers = handlers[type];
  if (!typeHandlers?.length) {
    return;
  }
  for (const handler of typeHandlers) {
    try {
      handler(data);
    } catch (e) {
      debugBuild.DEBUG_BUILD && core.debug.error(
        `Error while triggering instrumentation handler.
Type: ${type}
Name: ${core.getFunctionName(handler)}
Error:`,
        e
      );
    }
  }
}
function instrumentCls() {
  return getCLS.onCLS(
    (metric) => {
      triggerHandlers("cls", {
        metric
      });
      _previousCls = metric;
    },
    // We want the callback to be called whenever the CLS value updates.
    // By default, the callback is only called when the tab goes to the background.
    { reportAllChanges: true }
  );
}
function instrumentLcp() {
  return getLCP.onLCP(
    (metric) => {
      triggerHandlers("lcp", {
        metric
      });
      _previousLcp = metric;
    },
    // We want the callback to be called whenever the LCP value updates.
    // By default, the callback is only called when the tab goes to the background.
    { reportAllChanges: true }
  );
}
function instrumentTtfb() {
  return onTTFB.onTTFB((metric) => {
    triggerHandlers("ttfb", {
      metric
    });
    _previousTtfb = metric;
  });
}
function instrumentInp() {
  return getINP.onINP((metric) => {
    triggerHandlers("inp", {
      metric
    });
    _previousInp = metric;
  });
}
function addMetricObserver(type, callback, instrumentFn, previousValue, stopOnCallback = false) {
  addHandler(type, callback);
  let stopListening;
  if (!instrumented[type]) {
    stopListening = instrumentFn();
    instrumented[type] = true;
  }
  if (previousValue) {
    callback({ metric: previousValue });
  }
  return getCleanupCallback(type, callback, stopOnCallback ? stopListening : void 0);
}
function instrumentPerformanceObserver(type) {
  const options = {};
  if (type === "event") {
    options.durationThreshold = 0;
  }
  observe.observe(
    type,
    (entries) => {
      triggerHandlers(type, { entries });
    },
    options
  );
}
function addHandler(type, handler) {
  handlers[type] = handlers[type] || [];
  handlers[type].push(handler);
}
function getCleanupCallback(type, callback, stopListening) {
  return () => {
    if (stopListening) {
      stopListening();
    }
    const typeHandlers = handlers[type];
    if (!typeHandlers) {
      return;
    }
    const index = typeHandlers.indexOf(callback);
    if (index !== -1) {
      typeHandlers.splice(index, 1);
    }
  };
}
function isPerformanceEventTiming(entry) {
  return "duration" in entry;
}

exports.addClsInstrumentationHandler = addClsInstrumentationHandler;
exports.addInpInstrumentationHandler = addInpInstrumentationHandler;
exports.addLcpInstrumentationHandler = addLcpInstrumentationHandler;
exports.addPerformanceInstrumentationHandler = addPerformanceInstrumentationHandler;
exports.addTtfbInstrumentationHandler = addTtfbInstrumentationHandler;
exports.isPerformanceEventTiming = isPerformanceEventTiming;
//# sourceMappingURL=instrument.js.map
