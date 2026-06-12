Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const core = require('@sentry/core');
const debugBuild = require('../debug-build.js');
const htmlTreeAsString = require('../htmlTreeAsString.js');
const types = require('../types.js');
const inp = require('./inp.js');
const instrument = require('./instrument.js');
const lcp = require('./lcp.js');
const utils = require('./utils.js');

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
  const routeName = core.getCurrentScope().getScopeData().transactionName;
  const attributes = {
    [core.SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN]: origin,
    [core.SEMANTIC_ATTRIBUTE_SENTRY_OP]: op,
    [core.SEMANTIC_ATTRIBUTE_EXCLUSIVE_TIME]: 0,
    [`browser.web_vital.${metricName}.value`]: value,
    "sentry.transaction": routeName,
    // Web vital score calculation relies on the user agent
    "user_agent.original": types.WINDOW.navigator?.userAgent,
    ...passedAttributes
  };
  if (parentSpan && core.spanToStreamedSpanJSON(parentSpan).attributes?.[core.SEMANTIC_ATTRIBUTE_SENTRY_OP] === "pageload") {
    attributes["sentry.pageload.span_id"] = parentSpan.spanContext().spanId;
  }
  if (reportEvent) {
    attributes[`browser.web_vital.${metricName}.report_event`] = reportEvent;
  }
  const span = core.startInactiveSpan({
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
  if (!utils.supportsWebVital("largest-contentful-paint")) {
    return;
  }
  const cleanupLcpHandler = instrument.addLcpInstrumentationHandler(({ metric }) => {
    const entry = metric.entries[metric.entries.length - 1];
    if (!entry || !lcp.isValidLcpMetric(metric.value)) {
      return;
    }
    lcpValue = metric.value;
    lcpEntry = entry;
  }, true);
  utils.listenForWebVitalReportEvents(client, (reportEvent, _, pageloadSpan) => {
    _sendLcpSpan(lcpValue, lcpEntry, pageloadSpan, reportEvent);
    cleanupLcpHandler();
  });
}
function _sendLcpSpan(lcpValue, entry, pageloadSpan, reportEvent) {
  if (!lcp.isValidLcpMetric(lcpValue)) {
    return;
  }
  debugBuild.DEBUG_BUILD && core.debug.log(`Sending LCP span (${lcpValue})`);
  const performanceTimeOrigin = core.browserPerformanceTimeOrigin() || 0;
  const timeOrigin = utils.msToSec(performanceTimeOrigin);
  const endTime = utils.msToSec(performanceTimeOrigin + (entry?.startTime || 0));
  const name = entry ? htmlTreeAsString.htmlTreeAsString(entry.element) : "Largest contentful paint";
  const attributes = {};
  entry?.element && (attributes["browser.web_vital.lcp.element"] = htmlTreeAsString.htmlTreeAsString(entry.element));
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
  if (!utils.supportsWebVital("layout-shift")) {
    return;
  }
  const cleanupClsHandler = instrument.addClsInstrumentationHandler(({ metric }) => {
    const entry = metric.entries[metric.entries.length - 1];
    if (!entry) {
      return;
    }
    clsValue = metric.value;
    clsEntry = entry;
  }, true);
  utils.listenForWebVitalReportEvents(client, (reportEvent, _, pageloadSpan) => {
    _sendClsSpan(clsValue, clsEntry, pageloadSpan, reportEvent);
    cleanupClsHandler();
  });
}
function _sendClsSpan(clsValue, entry, pageloadSpan, reportEvent) {
  debugBuild.DEBUG_BUILD && core.debug.log(`Sending CLS span (${clsValue})`);
  const startTime = entry ? utils.msToSec((core.browserPerformanceTimeOrigin() || 0) + entry.startTime) : core.timestampInSeconds();
  const name = entry ? htmlTreeAsString.htmlTreeAsString(entry.sources[0]?.node) : "Layout shift";
  const attributes = {};
  if (entry?.sources) {
    entry.sources.forEach((source, index) => {
      attributes[`browser.web_vital.cls.source.${index + 1}`] = htmlTreeAsString.htmlTreeAsString(source.node);
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
  const performance = utils.getBrowserPerformanceAPI();
  if (!performance || !core.browserPerformanceTimeOrigin()) {
    return;
  }
  const onInp = ({ metric }) => {
    if (metric.value == null) {
      return;
    }
    const duration = utils.msToSec(metric.value);
    if (duration > inp.MAX_PLAUSIBLE_INP_DURATION) {
      return;
    }
    const entry = metric.entries.find((e) => e.duration === metric.value && inp.INP_ENTRY_MAP[e.name]);
    if (!entry) {
      return;
    }
    _sendInpSpan(metric.value, entry);
  };
  instrument.addInpInstrumentationHandler(onInp);
}
function _sendInpSpan(inpValue, entry) {
  debugBuild.DEBUG_BUILD && core.debug.log(`Sending INP span (${inpValue})`);
  const startTime = utils.msToSec(core.browserPerformanceTimeOrigin() + entry.startTime);
  const duration = utils.msToSec(inpValue);
  const interactionType = inp.INP_ENTRY_MAP[entry.name];
  const cachedContext = inp.getCachedInteractionContext(entry.interactionId);
  const activeSpan = core.getActiveSpan();
  const rootSpan = activeSpan ? core.getRootSpan(activeSpan) : void 0;
  const spanToUse = cachedContext?.span || rootSpan;
  const routeName = spanToUse ? core.spanToStreamedSpanJSON(spanToUse).name : core.getCurrentScope().getScopeData().transactionName;
  const name = cachedContext?.elementName || htmlTreeAsString.htmlTreeAsString(entry.target);
  _emitWebVitalSpan({
    name,
    op: `ui.interaction.${interactionType}`,
    origin: "auto.http.browser.inp",
    metricName: "inp",
    value: inpValue,
    attributes: {
      [core.SEMANTIC_ATTRIBUTE_EXCLUSIVE_TIME]: entry.duration,
      "sentry.transaction": routeName
    },
    startTime,
    endTime: startTime + duration,
    parentSpan: spanToUse
  });
}

exports._emitWebVitalSpan = _emitWebVitalSpan;
exports._sendClsSpan = _sendClsSpan;
exports._sendInpSpan = _sendInpSpan;
exports._sendLcpSpan = _sendLcpSpan;
exports.trackClsAsSpan = trackClsAsSpan;
exports.trackInpAsSpan = trackInpAsSpan;
exports.trackLcpAsSpan = trackLcpAsSpan;
//# sourceMappingURL=webVitalSpans.js.map
