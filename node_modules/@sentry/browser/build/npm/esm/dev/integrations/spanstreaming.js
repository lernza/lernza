import { defineIntegration, hasSpanStreamingEnabled, debug, isStreamedBeforeSendSpanCallback, SpanBuffer, spanIsSampled, captureSpan } from '@sentry/core/browser';
import { DEBUG_BUILD } from '../debug-build.js';

const spanStreamingIntegration = defineIntegration(() => {
  return {
    name: "SpanStreaming",
    beforeSetup(client) {
      const clientOptions = client.getOptions();
      if (!clientOptions.traceLifecycle) {
        DEBUG_BUILD && debug.log('[SpanStreaming] setting `traceLifecycle` to "stream"');
        clientOptions.traceLifecycle = "stream";
      }
    },
    setup(client) {
      const initialMessage = "SpanStreaming integration requires";
      const fallbackMsg = "Falling back to static trace lifecycle.";
      const clientOptions = client.getOptions();
      if (!hasSpanStreamingEnabled(client)) {
        clientOptions.traceLifecycle = "static";
        DEBUG_BUILD && debug.warn(`${initialMessage} \`traceLifecycle\` to be set to "stream"! ${fallbackMsg}`);
        return;
      }
      const beforeSendSpan = clientOptions.beforeSendSpan;
      if (beforeSendSpan && !isStreamedBeforeSendSpanCallback(beforeSendSpan)) {
        clientOptions.traceLifecycle = "static";
        DEBUG_BUILD && debug.warn(`${initialMessage} a beforeSendSpan callback using \`withStreamedSpan\`! ${fallbackMsg}`);
        return;
      }
      const buffer = new SpanBuffer(client);
      client.on("afterSpanEnd", (span) => {
        if (!spanIsSampled(span)) {
          return;
        }
        buffer.add(captureSpan(span, client));
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

export { spanStreamingIntegration };
//# sourceMappingURL=spanstreaming.js.map
