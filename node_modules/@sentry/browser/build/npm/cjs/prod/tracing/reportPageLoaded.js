Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const browser = require('@sentry/core/browser');

function reportPageLoaded(client = browser.getClient()) {
  client?.emit("endPageloadSpan");
}

exports.reportPageLoaded = reportPageLoaded;
//# sourceMappingURL=reportPageLoaded.js.map
