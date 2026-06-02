Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const browser = require('@sentry/core/browser');

function createUserFeedbackEnvelope(feedback, {
  metadata,
  tunnel,
  dsn
}) {
  const headers = {
    event_id: feedback.event_id,
    sent_at: (/* @__PURE__ */ new Date()).toISOString(),
    ...metadata?.sdk && {
      sdk: {
        name: metadata.sdk.name,
        version: metadata.sdk.version
      }
    },
    ...!!tunnel && !!dsn && { dsn: browser.dsnToString(dsn) }
  };
  const item = createUserFeedbackEnvelopeItem(feedback);
  return browser.createEnvelope(headers, [item]);
}
function createUserFeedbackEnvelopeItem(feedback) {
  const feedbackHeaders = {
    type: "user_report"
  };
  return [feedbackHeaders, feedback];
}

exports.createUserFeedbackEnvelope = createUserFeedbackEnvelope;
//# sourceMappingURL=userfeedback.js.map
