Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const browser = require('@sentry/core/browser');
const debugBuild = require('../debug-build.js');
const eventbuilder = require('../eventbuilder.js');
const helpers = require('../helpers.js');
const globalhandlers = require('./globalhandlers.js');

const INTEGRATION_NAME = "WebWorker";
const webWorkerIntegration = browser.defineIntegration(({ worker }) => ({
  name: INTEGRATION_NAME,
  setupOnce: () => {
    (Array.isArray(worker) ? worker : [worker]).forEach((w) => listenForSentryMessages(w));
  },
  addWorker: (worker2) => listenForSentryMessages(worker2)
}));
function listenForSentryMessages(worker) {
  worker.addEventListener("message", (event) => {
    if (isSentryMessage(event.data)) {
      event.stopImmediatePropagation();
      if (event.data._sentryDebugIds) {
        debugBuild.DEBUG_BUILD && browser.debug.log("Sentry debugId web worker message received", event.data);
        helpers.WINDOW._sentryDebugIds = {
          ...event.data._sentryDebugIds,
          // debugIds of the main thread have precedence over the worker's in case of a collision.
          ...helpers.WINDOW._sentryDebugIds
        };
      }
      if (event.data._sentryModuleMetadata) {
        debugBuild.DEBUG_BUILD && browser.debug.log("Sentry module metadata web worker message received", event.data);
        helpers.WINDOW._sentryModuleMetadata = {
          ...event.data._sentryModuleMetadata,
          // Module metadata of the main thread have precedence over the worker's in case of a collision.
          ...helpers.WINDOW._sentryModuleMetadata
        };
      }
      if (event.data._sentryWasmImages) {
        debugBuild.DEBUG_BUILD && browser.debug.log("Sentry WASM images web worker message received", event.data);
        const existingImages = helpers.WINDOW._sentryWasmImages || [];
        const newImages = event.data._sentryWasmImages.filter(
          (newImg) => browser.isPlainObject(newImg) && typeof newImg.code_file === "string" && !existingImages.some((existing) => existing.code_file === newImg.code_file)
        );
        helpers.WINDOW._sentryWasmImages = [
          ...existingImages,
          ...newImages
        ];
      }
      if (event.data._sentryWorkerError) {
        debugBuild.DEBUG_BUILD && browser.debug.log("Sentry worker rejection message received", event.data._sentryWorkerError);
        handleForwardedWorkerRejection(event.data._sentryWorkerError);
      }
    }
  });
}
function handleForwardedWorkerRejection(workerError) {
  const client = browser.getClient();
  if (!client) {
    return;
  }
  const stackParser = client.getOptions().stackParser;
  const attachStacktrace = client.getOptions().attachStacktrace;
  const error = workerError.reason;
  const event = browser.isPrimitive(error) ? globalhandlers._eventFromRejectionWithPrimitive(error) : eventbuilder.eventFromUnknownInput(stackParser, error, void 0, attachStacktrace, true);
  event.level = "error";
  if (workerError.filename) {
    event.contexts = {
      ...event.contexts,
      worker: {
        filename: workerError.filename
      }
    };
  }
  browser.captureEvent(event, {
    originalException: error,
    mechanism: {
      handled: false,
      type: "auto.browser.web_worker.onunhandledrejection"
    }
  });
  debugBuild.DEBUG_BUILD && browser.debug.log("Captured worker unhandled rejection", error);
}
function registerWebWorker({ self }) {
  self.postMessage({
    _sentryMessage: true,
    _sentryDebugIds: self._sentryDebugIds ?? void 0,
    _sentryModuleMetadata: self._sentryModuleMetadata ?? void 0
  });
  self.addEventListener("unhandledrejection", (event) => {
    const reason = globalhandlers._getUnhandledRejectionError(event);
    const serializedError = {
      reason,
      filename: self.location?.href
    };
    self.postMessage({
      _sentryMessage: true,
      _sentryWorkerError: serializedError
    });
    debugBuild.DEBUG_BUILD && browser.debug.log("[Sentry Worker] Forwarding unhandled rejection to parent", serializedError);
  });
  debugBuild.DEBUG_BUILD && browser.debug.log("[Sentry Worker] Registered worker with unhandled rejection handling");
}
function isSentryMessage(eventData) {
  if (!browser.isPlainObject(eventData) || eventData._sentryMessage !== true) {
    return false;
  }
  const hasDebugIds = "_sentryDebugIds" in eventData;
  const hasModuleMetadata = "_sentryModuleMetadata" in eventData;
  const hasWorkerError = "_sentryWorkerError" in eventData;
  const hasWasmImages = "_sentryWasmImages" in eventData;
  if (!hasDebugIds && !hasModuleMetadata && !hasWorkerError && !hasWasmImages) {
    return false;
  }
  if (hasDebugIds && !(browser.isPlainObject(eventData._sentryDebugIds) || eventData._sentryDebugIds === void 0)) {
    return false;
  }
  if (hasModuleMetadata && !(browser.isPlainObject(eventData._sentryModuleMetadata) || eventData._sentryModuleMetadata === void 0)) {
    return false;
  }
  if (hasWorkerError && !browser.isPlainObject(eventData._sentryWorkerError)) {
    return false;
  }
  if (hasWasmImages && (!Array.isArray(eventData._sentryWasmImages) || !eventData._sentryWasmImages.every(
    (img) => browser.isPlainObject(img) && typeof img.code_file === "string"
  ))) {
    return false;
  }
  return true;
}

exports.INTEGRATION_NAME = INTEGRATION_NAME;
exports.registerWebWorker = registerWebWorker;
exports.webWorkerIntegration = webWorkerIntegration;
//# sourceMappingURL=webWorker.js.map
