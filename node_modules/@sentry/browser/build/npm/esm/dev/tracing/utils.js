import { WINDOW } from '../helpers.js';

function baggageHeaderHasSentryValues(baggageHeader) {
  return baggageHeader.split(",").some((value) => value.trim().startsWith("sentry-"));
}
function getFullURL(url) {
  try {
    const parsed = new URL(url, WINDOW.location.origin);
    return parsed.href;
  } catch {
    return void 0;
  }
}
function isPerformanceResourceTiming(entry) {
  return entry.entryType === "resource" && "initiatorType" in entry && typeof entry.nextHopProtocol === "string" && (entry.initiatorType === "fetch" || entry.initiatorType === "xmlhttprequest");
}
function createHeadersSafely(headers) {
  try {
    return new Headers(headers);
  } catch {
    return void 0;
  }
}

export { baggageHeaderHasSentryValues, createHeadersSafely, getFullURL, isPerformanceResourceTiming };
//# sourceMappingURL=utils.js.map
