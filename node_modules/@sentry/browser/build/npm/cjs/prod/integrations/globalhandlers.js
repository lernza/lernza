Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const browser = require('@sentry/core/browser');
const debugBuild = require('../debug-build.js');
const eventbuilder = require('../eventbuilder.js');
const helpers = require('../helpers.js');

const INTEGRATION_NAME = "GlobalHandlers";
const _globalHandlersIntegration = ((options = {}) => {
  const _options = {
    onerror: true,
    onunhandledrejection: true,
    ...options
  };
  return {
    name: INTEGRATION_NAME,
    setupOnce() {
      Error.stackTraceLimit = 50;
    },
    setup(client) {
      if (_options.onerror) {
        _installGlobalOnErrorHandler(client);
        globalHandlerLog("onerror");
      }
      if (_options.onunhandledrejection) {
        _installGlobalOnUnhandledRejectionHandler(client);
        globalHandlerLog("onunhandledrejection");
      }
    }
  };
});
const globalHandlersIntegration = browser.defineIntegration(_globalHandlersIntegration);
function _installGlobalOnErrorHandler(client) {
  browser.addGlobalErrorInstrumentationHandler((data) => {
    const { stackParser, attachStacktrace } = getOptions();
    if (browser.getClient() !== client || helpers.shouldIgnoreOnError()) {
      return;
    }
    const { msg, url, line, column, error } = data;
    const event = _enhanceEventWithInitialFrame(
      eventbuilder.eventFromUnknownInput(stackParser, error || msg, void 0, attachStacktrace, false),
      url,
      line,
      column
    );
    event.level = "error";
    browser.captureEvent(event, {
      originalException: error,
      mechanism: {
        handled: false,
        type: "auto.browser.global_handlers.onerror"
      }
    });
  });
}
function _installGlobalOnUnhandledRejectionHandler(client) {
  browser.addGlobalUnhandledRejectionInstrumentationHandler((e) => {
    const { stackParser, attachStacktrace } = getOptions();
    if (browser.getClient() !== client || helpers.shouldIgnoreOnError()) {
      return;
    }
    const error = _getUnhandledRejectionError(e);
    const event = browser.isPrimitive(error) ? _eventFromRejectionWithPrimitive(error) : eventbuilder.eventFromUnknownInput(stackParser, error, void 0, attachStacktrace, true);
    event.level = "error";
    browser.captureEvent(event, {
      originalException: error,
      mechanism: {
        handled: false,
        type: "auto.browser.global_handlers.onunhandledrejection"
      }
    });
  });
}
function _getUnhandledRejectionError(error) {
  if (browser.isPrimitive(error)) {
    return error;
  }
  try {
    if ("reason" in error) {
      return error.reason;
    }
    if ("detail" in error && "reason" in error.detail) {
      return error.detail.reason;
    }
  } catch {
  }
  return error;
}
function _eventFromRejectionWithPrimitive(reason) {
  return {
    exception: {
      values: [
        {
          type: "UnhandledRejection",
          // String() is needed because the Primitive type includes symbols (which can't be automatically stringified)
          value: `Non-Error promise rejection captured with value: ${String(reason)}`
        }
      ]
    }
  };
}
function _enhanceEventWithInitialFrame(event, url, lineno, colno) {
  const e = event.exception = event.exception || {};
  const ev = e.values = e.values || [];
  const ev0 = ev[0] = ev[0] || {};
  const ev0s = ev0.stacktrace = ev0.stacktrace || {};
  const ev0sf = ev0s.frames = ev0s.frames || [];
  if (ev0sf.length === 0) {
    ev0sf.push({
      colno,
      lineno,
      filename: getFilenameFromUrl(url) ?? browser.getLocationHref(),
      function: browser.UNKNOWN_FUNCTION,
      in_app: true
    });
  }
  return event;
}
function globalHandlerLog(type) {
  debugBuild.DEBUG_BUILD && browser.debug.log(`Global Handler attached: ${type}`);
}
function getOptions() {
  const client = browser.getClient();
  const options = client?.getOptions() || {
    stackParser: () => [],
    attachStacktrace: false
  };
  return options;
}
function getFilenameFromUrl(url) {
  if (!browser.isString(url) || url.length === 0) {
    return void 0;
  }
  if (url.startsWith("data:")) {
    return `<${browser.stripDataUrlContent(url, false)}>`;
  }
  return url;
}

exports._eventFromRejectionWithPrimitive = _eventFromRejectionWithPrimitive;
exports._getUnhandledRejectionError = _getUnhandledRejectionError;
exports.globalHandlersIntegration = globalHandlersIntegration;
//# sourceMappingURL=globalhandlers.js.map
