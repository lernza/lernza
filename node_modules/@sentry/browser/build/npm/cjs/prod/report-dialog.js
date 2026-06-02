Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const browser = require('@sentry/core/browser');
const debugBuild = require('./debug-build.js');
const helpers = require('./helpers.js');

function showReportDialog(options = {}) {
  const optionalDocument = helpers.WINDOW.document;
  const injectionPoint = optionalDocument?.head || optionalDocument?.body;
  if (!injectionPoint) {
    debugBuild.DEBUG_BUILD && browser.debug.error("[showReportDialog] Global document not defined");
    return;
  }
  const scope = browser.getCurrentScope();
  const client = browser.getClient();
  const dsn = client?.getDsn();
  if (!dsn) {
    debugBuild.DEBUG_BUILD && browser.debug.error("[showReportDialog] DSN not configured");
    return;
  }
  const mergedOptions = {
    ...options,
    user: {
      ...scope.getUser(),
      ...options.user
    },
    eventId: options.eventId || browser.lastEventId()
  };
  const script = helpers.WINDOW.document.createElement("script");
  script.async = true;
  script.crossOrigin = "anonymous";
  script.src = browser.getReportDialogEndpoint(dsn, mergedOptions);
  const { onLoad, onClose } = mergedOptions;
  if (onLoad) {
    script.onload = onLoad;
  }
  if (onClose) {
    const reportDialogClosedMessageHandler = (event) => {
      if (event.data === "__sentry_reportdialog_closed__") {
        try {
          onClose();
        } finally {
          helpers.WINDOW.removeEventListener("message", reportDialogClosedMessageHandler);
        }
      }
    };
    helpers.WINDOW.addEventListener("message", reportDialogClosedMessageHandler);
  }
  injectionPoint.appendChild(script);
}

exports.showReportDialog = showReportDialog;
//# sourceMappingURL=report-dialog.js.map
