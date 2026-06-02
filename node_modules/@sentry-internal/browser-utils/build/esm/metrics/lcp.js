import { debug, browserPerformanceTimeOrigin, getCurrentScope, SEMANTIC_ATTRIBUTE_SENTRY_MEASUREMENT_VALUE, SEMANTIC_ATTRIBUTE_SENTRY_MEASUREMENT_UNIT, SEMANTIC_ATTRIBUTE_EXCLUSIVE_TIME, SEMANTIC_ATTRIBUTE_SENTRY_OP, SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN } from '@sentry/core';
import { DEBUG_BUILD } from '../debug-build.js';
import { htmlTreeAsString } from '../htmlTreeAsString.js';
import { addLcpInstrumentationHandler } from './instrument.js';
import { supportsWebVital, listenForWebVitalReportEvents, msToSec, startStandaloneWebVitalSpan } from './utils.js';

const MAX_PLAUSIBLE_LCP_DURATION = 6e4;
function isValidLcpMetric(lcpValue) {
  return lcpValue != null && lcpValue > 0 && lcpValue <= MAX_PLAUSIBLE_LCP_DURATION;
}
function trackLcpAsStandaloneSpan(client) {
  let standaloneLcpValue = 0;
  let standaloneLcpEntry;
  if (!supportsWebVital("largest-contentful-paint")) {
    return;
  }
  const cleanupLcpHandler = addLcpInstrumentationHandler(({ metric }) => {
    const entry = metric.entries[metric.entries.length - 1];
    if (!entry || !isValidLcpMetric(metric.value)) {
      return;
    }
    standaloneLcpValue = metric.value;
    standaloneLcpEntry = entry;
  }, true);
  listenForWebVitalReportEvents(client, (reportEvent, pageloadSpanId) => {
    _sendStandaloneLcpSpan(standaloneLcpValue, standaloneLcpEntry, pageloadSpanId, reportEvent);
    cleanupLcpHandler();
  });
}
function _sendStandaloneLcpSpan(lcpValue, entry, pageloadSpanId, reportEvent) {
  if (!isValidLcpMetric(lcpValue)) {
    return;
  }
  DEBUG_BUILD && debug.log(`Sending LCP span (${lcpValue})`);
  const startTime = msToSec((browserPerformanceTimeOrigin() || 0) + (entry?.startTime || 0));
  const routeName = getCurrentScope().getScopeData().transactionName;
  const name = entry ? htmlTreeAsString(entry.element) : "Largest contentful paint";
  const attributes = {
    [SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN]: "auto.http.browser.lcp",
    [SEMANTIC_ATTRIBUTE_SENTRY_OP]: "ui.webvital.lcp",
    [SEMANTIC_ATTRIBUTE_EXCLUSIVE_TIME]: 0,
    // LCP is a point-in-time metric
    // attach the pageload span id to the LCP span so that we can link them in the UI
    "sentry.pageload.span_id": pageloadSpanId,
    // describes what triggered the web vital to be reported
    "sentry.report_event": reportEvent
  };
  if (entry) {
    entry.element && (attributes["lcp.element"] = htmlTreeAsString(entry.element));
    entry.id && (attributes["lcp.id"] = entry.id);
    entry.url && (attributes["lcp.url"] = entry.url);
    entry.loadTime != null && (attributes["lcp.loadTime"] = entry.loadTime);
    entry.renderTime != null && (attributes["lcp.renderTime"] = entry.renderTime);
    entry.size != null && (attributes["lcp.size"] = entry.size);
  }
  const span = startStandaloneWebVitalSpan({
    name,
    transaction: routeName,
    attributes,
    startTime
  });
  if (span) {
    span.addEvent("lcp", {
      [SEMANTIC_ATTRIBUTE_SENTRY_MEASUREMENT_UNIT]: "millisecond",
      [SEMANTIC_ATTRIBUTE_SENTRY_MEASUREMENT_VALUE]: lcpValue
    });
    span.end(startTime);
  }
}

export { MAX_PLAUSIBLE_LCP_DURATION, _sendStandaloneLcpSpan, isValidLcpMetric, trackLcpAsStandaloneSpan };
//# sourceMappingURL=lcp.js.map
