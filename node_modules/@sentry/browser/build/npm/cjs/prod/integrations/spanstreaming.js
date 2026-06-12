Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const browser = require('@sentry/core/browser');
const debugBuild = require('../debug-build.js');

const spanStreamingIntegration = browser.defineIntegration(() => {
  return {
    name: "SpanStreaming",
    beforeSetup(client) {
      const clientOptions = client.getOptions();
      if (!clientOptions.traceLifecycle) {
        debugBuild.DEBUG_BUILD && browser.debug.log('[SpanStreaming] setting `traceLifecycle` to "stream"');
        clientOptions.traceLifecycle = "stream";
      }
    },
    setup(client) {
      const initialMessage = "SpanStreaming integration requires";
      const fallbackMsg = "Falling back to static trace lifecycle.";
      const clientOptions = client.getOptions();
      if (!browser.hasSpanStreamingEnabled(client)) {
        clientOptions.traceLifecycle = "static";
        debugBuild.DEBUG_BUILD && browser.debug.warn(`${initialMessage} \`traceLifecycle\` to be set to "stream"! ${fallbackMsg}`);
        return;
      }
      const beforeSendSpan = clientOptions.beforeSendSpan;
      if (beforeSendSpan && !browser.isStreamedBeforeSendSpanCallback(beforeSendSpan)) {
        clientOptions.traceLifecycle = "static";
        debugBuild.DEBUG_BUILD && browser.debug.warn(`${initialMessage} a beforeSendSpan callback using \`withStreamedSpan\`! ${fallbackMsg}`);
        return;
      }
      const buffer = new browser.SpanBuffer(client);
      client.on("afterSpanEnd", (span) => {
        if (!browser.spanIsSampled(span)) {
          return;
        }
        buffer.add(browser.captureSpan(span, client));
      });
      client.on("afterSegmentSpanEnd", (segmentSpan) => {
        const traceId = segmentSpan.spanContext().traceId;
        setTimeout(() => {
          buffer.flush(traceId);
        }, 500);
      });
    }
  };
});

exports.spanStreamingIntegration = spanStreamingIntegration;
//# sourceMappingURL=spanstreaming.js.map
