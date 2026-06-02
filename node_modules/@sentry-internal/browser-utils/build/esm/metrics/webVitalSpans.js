import { browserPerformanceTimeOrigin, debug, timestampInSeconds, getCurrentScope, spanToStreamedSpanJSON, SEMANTIC_ATTRIBUTE_SENTRY_OP, startInactiveSpan, SEMANTIC_ATTRIBUTE_EXCLUSIVE_TIME, SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN, getActiveSpan, getRootSpan } from '@sentry/core';
import { DEBUG_BUILD } from '../debug-build.js';
import { htmlTreeAsString } from '../htmlTreeAsString.js';
import { WINDOW } from '../types.js';
import { MAX_PLAUSIBLE_INP_DURATION, INP_ENTRY_MAP, getCachedInteractionContext } from './inp.js';
import { addClsInstrumentationHandler, addInpInstrumentationHandler, addLcpInstrumentationHandler } from './instrument.js';
import { isValidLcpMetric } from './lcp.js';
import { supportsWebVital, listenForWebVitalReportEvents, getBrowserPerformanceAPI, msToSec } from './utils.js';

function _emitWebVitalSpan(options) {
  const {
    name,
    op,
    origin,
    metricName,
    value,
    attributes: passedAttributes,
    parentSpan,
    reportEvent,
    startTime,
    endTime
  } = options;
  const routeName = getCurrentScope().getScopeData().transactionName;
  const attributes = {
    [SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN]: origin,
    [SEMANTIC_ATTRIBUTE_SENTRY_OP]: op,
    [SEMANTIC_ATTRIBUTE_EXCLUSIVE_TIME]: 0,
    [`browser.web_vital.${metricName}.value`]: value,
    "sentry.transaction": routeName,
    // Web vital score calculation relies on the user agent
    "user_agent.original": WINDOW.navigator?.userAgent,
    ...passedAttributes
  };
  if (parentSpan && spanToStreamedSpanJSON(parentSpan).attributes?.[SEMANTIC_ATTRIBUTE_SENTRY_OP] === "pageload") {
    attributes["sentry.pageload.span_id"] = parentSpan.spanContext().spanId;
  }
  if (reportEvent) {
    attributes[`browser.web_vital.${metricName}.report_event`] = reportEvent;
  }
  const span = startInactiveSpan({
    name,
    attributes,
    startTime,
    // if we have a pageload span, we let the web vital span start as its parent. This ensures that
    // it is not started as a segment span, without having to manually set it to a "standalone" v2 span
    // that has `segment: false` but no actual parent span.
    parentSpan
  });
  if (span) {
    span.end(endTime ?? startTime);
  }
}
function trackLcpAsSpan(client) {
  let lcpValue = 0;
  let lcpEntry;
  if (!supportsWebVital("largest-contentful-paint")) {
    return;
  }
  const cleanupLcpHandler = addLcpInstrumentationHandler(({ metric }) => {
    const entry = metric.entries[metric.entries.length - 1];
    if (!entry || !isValidLcpMetric(metric.value)) {
      return;
    }
    lcpValue = metric.value;
    lcpEntry = entry;
  }, true);
  listenForWebVitalReportEvents(client, (reportEvent, _, pageloadSpan) => {
    _sendLcpSpan(lcpValue, lcpEntry, pageloadSpan, reportEvent);
    cleanupLcpHandler();
  });
}
function _sendLcpSpan(lcpValue, entry, pageloadSpan, reportEvent) {
  if (!isValidLcpMetric(lcpValue)) {
    return;
  }
  DEBUG_BUILD && debug.log(`Sending LCP span (${lcpValue})`);
  const performanceTimeOrigin = browserPerformanceTimeOrigin() || 0;
  const timeOrigin = msToSec(performanceTimeOrigin);
  const endTime = msToSec(performanceTimeOrigin + (entry?.startTime || 0));
  const name = entry ? htmlTreeAsString(entry.element) : "Largest contentful paint";
  const attributes = {};
  entry?.element && (attributes["browser.web_vital.lcp.element"] = htmlTreeAsString(entry.element));
  entry?.id && (attributes["browser.web_vital.lcp.id"] = entry.id);
  entry?.url && (attributes["browser.web_vital.lcp.url"] = entry.url);
  entry?.loadTime != null && (attributes["browser.web_vital.lcp.load_time"] = entry.loadTime);
  entry?.renderTime != null && (attributes["browser.web_vital.lcp.render_time"] = entry.renderTime);
  entry?.size != null && (attributes["browser.web_vital.lcp.size"] = entry.size);
  _emitWebVitalSpan({
    name,
    op: "ui.webvital.lcp",
    origin: "auto.http.browser.lcp",
    metricName: "lcp",
    value: lcpValue,
    attributes,
    parentSpan: pageloadSpan,
    reportEvent,
    startTime: timeOrigin,
    endTime
  });
}
function trackClsAsSpan(client) {
  let clsValue = 0;
  let clsEntry;
  if (!supportsWebVital("layout-shift")) {
    return;
  }
  const cleanupClsHandler = addClsInstrumentationHandler(({ metric }) => {
    const entry = metric.entries[metric.entries.length - 1];
    if (!entry) {
      return;
    }
    clsValue = metric.value;
    clsEntry = entry;
  }, true);
  listenForWebVitalReportEvents(client, (reportEvent, _, pageloadSpan) => {
    _sendClsSpan(clsValue, clsEntry, pageloadSpan, reportEvent);
    cleanupClsHandler();
  });
}
function _sendClsSpan(clsValue, entry, pageloadSpan, reportEvent) {
  DEBUG_BUILD && debug.log(`Sending CLS span (${clsValue})`);
  const startTime = entry ? msToSec((browserPerformanceTimeOrigin() || 0) + entry.startTime) : timestampInSeconds();
  const name = entry ? htmlTreeAsString(entry.sources[0]?.node) : "Layout shift";
  const attributes = {};
  if (entry?.sources) {
    entry.sources.forEach((source, index) => {
      attributes[`browser.web_vital.cls.source.${index + 1}`] = htmlTreeAsString(source.node);
    });
  }
  _emitWebVitalSpan({
    name,
    op: "ui.webvital.cls",
    origin: "auto.http.browser.cls",
    metricName: "cls",
    value: clsValue,
    attributes,
    parentSpan: pageloadSpan,
    reportEvent,
    startTime
  });
}
function trackInpAsSpan() {
  const performance = getBrowserPerformanceAPI();
  if (!performance || !browserPerformanceTimeOrigin()) {
    return;
  }
  const onInp = ({ metric }) => {
    if (metric.value == null) {
      return;
    }
    const duration = msToSec(metric.value);
    if (duration > MAX_PLAUSIBLE_INP_DURATION) {
      return;
    }
    const entry = metric.entries.find((e) => e.duration === metric.value && INP_ENTRY_MAP[e.name]);
    if (!entry) {
      return;
    }
    _sendInpSpan(metric.value, entry);
  };
  addInpInstrumentationHandler(onInp);
}
function _sendInpSpan(inpValue, entry) {
  DEBUG_BUILD && debug.log(`Sending INP span (${inpValue})`);
  const startTime = msToSec(browserPerformanceTimeOrigin() + entry.startTime);
  const duration = msToSec(inpValue);
  const interactionType = INP_ENTRY_MAP[entry.name];
  const cachedContext = getCachedInteractionContext(entry.interactionId);
  const activeSpan = getActiveSpan();
  const rootSpan = activeSpan ? getRootSpan(activeSpan) : void 0;
  const spanToUse = cachedContext?.span || rootSpan;
  const routeName = spanToUse ? spanToStreamedSpanJSON(spanToUse).name : getCurrentScope().getScopeData().transactionName;
  const name = cachedContext?.elementName || htmlTreeAsString(entry.target);
  _emitWebVitalSpan({
    name,
    op: `ui.interaction.${interactionType}`,
    origin: "auto.http.browser.inp",
    metricName: "inp",
    value: inpValue,
    attributes: {
      [SEMANTIC_ATTRIBUTE_EXCLUSIVE_TIME]: entry.duration,
      "sentry.transaction": routeName
    },
    startTime,
    endTime: startTime + duration,
    parentSpan: spanToUse
  });
}

export { _emitWebVitalSpan, _sendClsSpan, _sendInpSpan, _sendLcpSpan, trackClsAsSpan, trackInpAsSpan, trackLcpAsSpan };
//# sourceMappingURL=webVitalSpans.js.map
