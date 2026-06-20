Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const core = require('@sentry/core');
const debugBuild = require('../debug-build.js');
const htmlTreeAsString = require('../htmlTreeAsString.js');
const instrument = require('./instrument.js');
const utils = require('./utils.js');

const MAX_PLAUSIBLE_LCP_DURATION = 6e4;
function isValidLcpMetric(lcpValue) {
  return lcpValue != null && lcpValue > 0 && lcpValue <= MAX_PLAUSIBLE_LCP_DURATION;
}
function trackLcpAsStandaloneSpan(client) {
  let standaloneLcpValue = 0;
  let standaloneLcpEntry;
  if (!utils.supportsWebVital("largest-contentful-paint")) {
    return;
  }
  const cleanupLcpHandler = instrument.addLcpInstrumentationHandler(({ metric }) => {
    const entry = metric.entries[metric.entries.length - 1];
    if (!entry || !isValidLcpMetric(metric.value)) {
      return;
    }
    standaloneLcpValue = metric.value;
    standaloneLcpEntry = entry;
  }, true);
  utils.listenForWebVitalReportEvents(client, (reportEvent, pageloadSpanId) => {
    _sendStandaloneLcpSpan(standaloneLcpValue, standaloneLcpEntry, pageloadSpanId, reportEvent);
    cleanupLcpHandler();
  });
}
function _sendStandaloneLcpSpan(lcpValue, entry, pageloadSpanId, reportEvent) {
  if (!isValidLcpMetric(lcpValue)) {
    return;
  }
  debugBuild.DEBUG_BUILD && core.debug.log(`Sending LCP span (${lcpValue})`);
  const startTime = utils.msToSec((core.browserPerformanceTimeOrigin() || 0) + (entry?.startTime || 0));
  const routeName = core.getCurrentScope().getScopeData().transactionName;
  const name = entry ? htmlTreeAsString.htmlTreeAsString(entry.element) : "Largest contentful paint";
  const attributes = {
    [core.SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN]: "auto.http.browser.lcp",
    [core.SEMANTIC_ATTRIBUTE_SENTRY_OP]: "ui.webvital.lcp",
    [core.SEMANTIC_ATTRIBUTE_EXCLUSIVE_TIME]: 0,
    // LCP is a point-in-time metric
    // attach the pageload span id to the LCP span so that we can link them in the UI
    "sentry.pageload.span_id": pageloadSpanId,
    // describes what triggered the web vital to be reported
    "sentry.report_event": reportEvent
  };
  if (entry) {
    entry.element && (attributes["lcp.element"] = htmlTreeAsString.htmlTreeAsString(entry.element));
    entry.id && (attributes["lcp.id"] = entry.id);
    entry.url && (attributes["lcp.url"] = entry.url);
    entry.loadTime != null && (attributes["lcp.loadTime"] = entry.loadTime);
    entry.renderTime != null && (attributes["lcp.renderTime"] = entry.renderTime);
    entry.size != null && (attributes["lcp.size"] = entry.size);
  }
  const span = utils.startStandaloneWebVitalSpan({
    name,
    transaction: routeName,
    attributes,
    startTime
  });
  if (span) {
    span.addEvent("lcp", {
      [core.SEMANTIC_ATTRIBUTE_SENTRY_MEASUREMENT_UNIT]: "millisecond",
      [core.SEMANTIC_ATTRIBUTE_SENTRY_MEASUREMENT_VALUE]: lcpValue
    });
    span.end(startTime);
  }
}

exports.MAX_PLAUSIBLE_LCP_DURATION = MAX_PLAUSIBLE_LCP_DURATION;
exports._sendStandaloneLcpSpan = _sendStandaloneLcpSpan;
exports.isValidLcpMetric = isValidLcpMetric;
exports.trackLcpAsStandaloneSpan = trackLcpAsStandaloneSpan;
//# sourceMappingURL=lcp.js.map
