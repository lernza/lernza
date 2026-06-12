Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const core = require('@sentry/core');
const types = require('../types.js');
const onHidden = require('./web-vitals/lib/onHidden.js');

function isMeasurementValue(value) {
  return typeof value === "number" && isFinite(value);
}
function startAndEndSpan(parentSpan, startTimeInSeconds, endTime, { ...ctx }) {
  const parentStartTime = core.spanToJSON(parentSpan).start_timestamp;
  if (parentStartTime && parentStartTime > startTimeInSeconds) {
    if (typeof parentSpan.updateStartTime === "function") {
      parentSpan.updateStartTime(startTimeInSeconds);
    }
  }
  return core.withActiveSpan(parentSpan, () => {
    const span = core.startInactiveSpan({
      startTime: startTimeInSeconds,
      ...ctx
    });
    if (span) {
      span.end(endTime);
    }
    return span;
  });
}
function startStandaloneWebVitalSpan(options) {
  const client = core.getClient();
  if (!client) {
    return;
  }
  const { name, transaction, attributes: passedAttributes, startTime } = options;
  const { release, environment } = client.getOptions();
  const { userInfo } = client.getDataCollectionOptions();
  const replay = client.getIntegrationByName("Replay");
  const replayId = replay?.getReplayId();
  const scope = core.getCurrentScope();
  const user = scope.getUser();
  const userDisplay = user !== void 0 ? user.email || user.id || user.ip_address : void 0;
  let profileId;
  try {
    profileId = scope.getScopeData().contexts.profile.profile_id;
  } catch {
  }
  const attributes = {
    release,
    environment,
    user: userDisplay || void 0,
    profile_id: profileId || void 0,
    replay_id: replayId || void 0,
    transaction,
    // Web vital score calculation relies on the user agent to account for different
    // browsers setting different thresholds for what is considered a good/meh/bad value.
    // For example: Chrome vs. Chrome Mobile
    "user_agent.original": types.WINDOW.navigator?.userAgent,
    // This tells Sentry to infer the IP address from the request
    "client.address": userInfo ? "{{auto}}" : void 0,
    ...passedAttributes
  };
  return core.startInactiveSpan({
    name,
    attributes,
    startTime,
    experimental: {
      standalone: true
    }
  });
}
function getBrowserPerformanceAPI() {
  return types.WINDOW.addEventListener && types.WINDOW.performance;
}
function msToSec(time) {
  return time / 1e3;
}
function extractNetworkProtocol(nextHopProtocol) {
  let name = "unknown";
  let version = "unknown";
  let _name = "";
  for (const char of nextHopProtocol) {
    if (char === "/") {
      [name, version] = nextHopProtocol.split("/");
      break;
    }
    if (!isNaN(Number(char))) {
      name = _name === "h" ? "http" : _name;
      version = nextHopProtocol.split(_name)[1];
      break;
    }
    _name += char;
  }
  if (_name === nextHopProtocol) {
    name = _name;
  }
  return { name, version };
}
function supportsWebVital(entryType) {
  try {
    return PerformanceObserver.supportedEntryTypes.includes(entryType);
  } catch {
    return false;
  }
}
function listenForWebVitalReportEvents(client, collectorCallback) {
  let pageloadSpan;
  let collected = false;
  function _runCollectorCallbackOnce(event) {
    if (!collected && pageloadSpan) {
      collectorCallback(event, pageloadSpan.spanContext().spanId, pageloadSpan);
    }
    collected = true;
  }
  onHidden.onHidden(() => {
    _runCollectorCallbackOnce("pagehide");
  });
  const unsubscribeStartNavigation = client.on("beforeStartNavigationSpan", (_, options) => {
    if (!options?.isRedirect) {
      _runCollectorCallbackOnce("navigation");
      unsubscribeStartNavigation();
      unsubscribeAfterStartPageLoadSpan();
    }
  });
  const unsubscribeAfterStartPageLoadSpan = client.on("afterStartPageLoadSpan", (span) => {
    pageloadSpan = span;
    unsubscribeAfterStartPageLoadSpan();
  });
}

exports.extractNetworkProtocol = extractNetworkProtocol;
exports.getBrowserPerformanceAPI = getBrowserPerformanceAPI;
exports.isMeasurementValue = isMeasurementValue;
exports.listenForWebVitalReportEvents = listenForWebVitalReportEvents;
exports.msToSec = msToSec;
exports.startAndEndSpan = startAndEndSpan;
exports.startStandaloneWebVitalSpan = startStandaloneWebVitalSpan;
exports.supportsWebVital = supportsWebVital;
//# sourceMappingURL=utils.js.map
