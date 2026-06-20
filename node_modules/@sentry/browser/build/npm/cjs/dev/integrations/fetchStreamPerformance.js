Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const core = require('@sentry/core');

const responseToStreamSpan = /* @__PURE__ */ new WeakMap();
const responseToFallbackTimeout = /* @__PURE__ */ new WeakMap();
const STREAM_RESOLVE_FALLBACK_MS = 9e4;
const STREAMING_CONTENT_TYPES = ["text/event-stream", "application/x-ndjson", "application/stream+json"];
const fetchStreamPerformanceIntegration = core.defineIntegration(() => {
  return {
    name: "FetchStreamPerformance",
    setup() {
      core.addFetchEndInstrumentationHandler((handlerData) => {
        if (handlerData.response) {
          const streamSpan = responseToStreamSpan.get(handlerData.response);
          if (streamSpan && handlerData.endTimestamp) {
            streamSpan.end(handlerData.endTimestamp);
            const fallbackTimeout = responseToFallbackTimeout.get(handlerData.response);
            if (fallbackTimeout) {
              clearTimeout(fallbackTimeout);
            }
          }
        }
      });
      core.addFetchInstrumentationHandler((handlerData) => {
        if (handlerData.endTimestamp && handlerData.response) {
          const contentType = handlerData.response.headers?.get("content-type") || "";
          if (handlerData.response.headers?.get("content-length") || !STREAMING_CONTENT_TYPES.some((t) => contentType.startsWith(t))) {
            return;
          }
          const url = handlerData.fetchData?.url || "";
          const method = handlerData.fetchData?.method || "GET";
          const parsedUrl = core.parseStringToURLObject(url);
          const sanitizedUrl = url.startsWith("data:") ? core.stripDataUrlContent(url) : parsedUrl ? core.getSanitizedUrlStringFromUrlObject(parsedUrl) : url;
          const streamSpan = core.startInactiveSpan({
            name: `${method} ${sanitizedUrl}`,
            startTime: handlerData.endTimestamp,
            attributes: {
              url: core.stripDataUrlContent(url),
              "http.method": method,
              type: "fetch",
              [core.SEMANTIC_ATTRIBUTE_SENTRY_OP]: "http.client.stream",
              [core.SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN]: "auto.http.browser.stream"
            }
          });
          responseToStreamSpan.set(handlerData.response, streamSpan);
          const fallbackTimeout = setTimeout(() => {
            if (streamSpan.isRecording()) {
              streamSpan.end();
            }
          }, STREAM_RESOLVE_FALLBACK_MS);
          responseToFallbackTimeout.set(handlerData.response, fallbackTimeout);
        }
      });
    }
  };
});

exports.fetchStreamPerformanceIntegration = fetchStreamPerformanceIntegration;
//# sourceMappingURL=fetchStreamPerformance.js.map
