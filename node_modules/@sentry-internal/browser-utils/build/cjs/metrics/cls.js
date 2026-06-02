Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const core = require('@sentry/core');
const debugBuild = require('../debug-build.js');
const htmlTreeAsString = require('../htmlTreeAsString.js');
const instrument = require('./instrument.js');
const utils = require('./utils.js');

function trackClsAsStandaloneSpan(client) {
  let standaloneCLsValue = 0;
  let standaloneClsEntry;
  if (!utils.supportsWebVital("layout-shift")) {
    return;
  }
  const cleanupClsHandler = instrument.addClsInstrumentationHandler(({ metric }) => {
    const entry = metric.entries[metric.entries.length - 1];
    if (!entry) {
      return;
    }
    standaloneCLsValue = metric.value;
    standaloneClsEntry = entry;
  }, true);
  utils.listenForWebVitalReportEvents(client, (reportEvent, pageloadSpanId) => {
    _sendStandaloneClsSpan(standaloneCLsValue, standaloneClsEntry, pageloadSpanId, reportEvent);
    cleanupClsHandler();
  });
}
function _sendStandaloneClsSpan(clsValue, entry, pageloadSpanId, reportEvent) {
  debugBuild.DEBUG_BUILD && core.debug.log(`Sending CLS span (${clsValue})`);
  const startTime = entry ? utils.msToSec((core.browserPerformanceTimeOrigin() || 0) + entry.startTime) : core.timestampInSeconds();
  const routeName = core.getCurrentScope().getScopeData().transactionName;
  const name = entry ? htmlTreeAsString.htmlTreeAsString(entry.sources[0]?.node) : "Layout shift";
  const attributes = {
    [core.SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN]: "auto.http.browser.cls",
    [core.SEMANTIC_ATTRIBUTE_SENTRY_OP]: "ui.webvital.cls",
    [core.SEMANTIC_ATTRIBUTE_EXCLUSIVE_TIME]: 0,
    // attach the pageload span id to the CLS span so that we can link them in the UI
    "sentry.pageload.span_id": pageloadSpanId,
    // describes what triggered the web vital to be reported
    "sentry.report_event": reportEvent
  };
  if (entry?.sources) {
    entry.sources.forEach((source, index) => {
      attributes[`cls.source.${index + 1}`] = htmlTreeAsString.htmlTreeAsString(source.node);
    });
  }
  const span = utils.startStandaloneWebVitalSpan({
    name,
    transaction: routeName,
    attributes,
    startTime
  });
  if (span) {
    span.addEvent("cls", {
      [core.SEMANTIC_ATTRIBUTE_SENTRY_MEASUREMENT_UNIT]: "",
      [core.SEMANTIC_ATTRIBUTE_SENTRY_MEASUREMENT_VALUE]: clsValue
    });
    span.end(startTime);
  }
}

exports._sendStandaloneClsSpan = _sendStandaloneClsSpan;
exports.trackClsAsStandaloneSpan = trackClsAsStandaloneSpan;
//# sourceMappingURL=cls.js.map
