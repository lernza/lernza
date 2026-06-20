import { debug, getCurrentScope, getClient, lastEventId, getReportDialogEndpoint } from '@sentry/core/browser';
import { DEBUG_BUILD } from './debug-build.js';
import { WINDOW } from './helpers.js';

function showReportDialog(options = {}) {
  const optionalDocument = WINDOW.document;
  const injectionPoint = optionalDocument?.head || optionalDocument?.body;
  if (!injectionPoint) {
    DEBUG_BUILD && debug.error("[showReportDialog] Global document not defined");
    return;
  }
  const scope = getCurrentScope();
  const client = getClient();
  const dsn = client?.getDsn();
  if (!dsn) {
    DEBUG_BUILD && debug.error("[showReportDialog] DSN not configured");
    return;
  }
  const mergedOptions = {
    ...options,
    user: {
      ...scope.getUser(),
      ...options.user
    },
    eventId: options.eventId || lastEventId()
  };
  const script = WINDOW.document.createElement("script");
  script.async = true;
  script.crossOrigin = "anonymous";
  script.src = getReportDialogEndpoint(dsn, mergedOptions);
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
          WINDOW.removeEventListener("message", reportDialogClosedMessageHandler);
        }
      }
    };
    WINDOW.addEventListener("message", reportDialogClosedMessageHandler);
  }
  injectionPoint.appendChild(script);
}

export { showReportDialog };
//# sourceMappingURL=report-dialog.js.map
