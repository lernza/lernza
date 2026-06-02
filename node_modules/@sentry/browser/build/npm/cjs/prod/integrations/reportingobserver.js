Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const browser = require('@sentry/core/browser');

const WINDOW = browser.GLOBAL_OBJ;
const INTEGRATION_NAME = "ReportingObserver";
const SETUP_CLIENTS = /* @__PURE__ */ new WeakMap();
const _reportingObserverIntegration = ((options = {}) => {
  const types = options.types || ["crash", "deprecation", "intervention"];
  function handler(reports) {
    if (!SETUP_CLIENTS.has(browser.getClient())) {
      return;
    }
    for (const report of reports) {
      browser.withScope((scope) => {
        scope.setExtra("url", report.url);
        const label = `ReportingObserver [${report.type}]`;
        let details = "No details available";
        if (report.body) {
          const plainBody = {};
          for (const prop in report.body) {
            plainBody[prop] = report.body[prop];
          }
          scope.setExtra("body", plainBody);
          if (report.type === "crash") {
            const body = report.body;
            details = [body.crashId || "", body.reason || ""].join(" ").trim() || details;
          } else {
            const body = report.body;
            details = body.message || details;
          }
        }
        browser.captureMessage(`${label}: ${details}`);
      });
    }
  }
  return {
    name: INTEGRATION_NAME,
    setupOnce() {
      if (!browser.supportsReportingObserver()) {
        return;
      }
      const observer = new WINDOW.ReportingObserver(
        handler,
        {
          buffered: true,
          types
        }
      );
      observer.observe();
    },
    setup(client) {
      SETUP_CLIENTS.set(client, true);
    }
  };
});
const reportingObserverIntegration = browser.defineIntegration(_reportingObserverIntegration);

exports.reportingObserverIntegration = reportingObserverIntegration;
//# sourceMappingURL=reportingobserver.js.map
