import { defineIntegration, debug, isPlainObject, getClient, isPrimitive, captureEvent } from '@sentry/core/browser';
import { DEBUG_BUILD } from '../debug-build.js';
import { eventFromUnknownInput } from '../eventbuilder.js';
import { WINDOW } from '../helpers.js';
import { _eventFromRejectionWithPrimitive, _getUnhandledRejectionError } from './globalhandlers.js';

const INTEGRATION_NAME = "WebWorker";
const webWorkerIntegration = defineIntegration(({ worker }) => ({
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
        DEBUG_BUILD && debug.log("Sentry debugId web worker message received", event.data);
        WINDOW._sentryDebugIds = {
          ...event.data._sentryDebugIds,
          // debugIds of the main thread have precedence over the worker's in case of a collision.
          ...WINDOW._sentryDebugIds
        };
      }
      if (event.data._sentryModuleMetadata) {
        DEBUG_BUILD && debug.log("Sentry module metadata web worker message received", event.data);
        WINDOW._sentryModuleMetadata = {
          ...event.data._sentryModuleMetadata,
          // Module metadata of the main thread have precedence over the worker's in case of a collision.
          ...WINDOW._sentryModuleMetadata
        };
      }
      if (event.data._sentryWasmImages) {
        DEBUG_BUILD && debug.log("Sentry WASM images web worker message received", event.data);
        const existingImages = WINDOW._sentryWasmImages || [];
        const newImages = event.data._sentryWasmImages.filter(
          (newImg) => isPlainObject(newImg) && typeof newImg.code_file === "string" && !existingImages.some((existing) => existing.code_file === newImg.code_file)
        );
        WINDOW._sentryWasmImages = [
          ...existingImages,
          ...newImages
        ];
      }
      if (event.data._sentryWorkerError) {
        DEBUG_BUILD && debug.log("Sentry worker rejection message received", event.data._sentryWorkerError);
        handleForwardedWorkerRejection(event.data._sentryWorkerError);
      }
    }
  });
}
function handleForwardedWorkerRejection(workerError) {
  const client = getClient();
  if (!client) {
    return;
  }
  const stackParser = client.getOptions().stackParser;
  const attachStacktrace = client.getOptions().attachStacktrace;
  const error = workerError.reason;
  const event = isPrimitive(error) ? _eventFromRejectionWithPrimitive(error) : eventFromUnknownInput(stackParser, error, void 0, attachStacktrace, true);
  event.level = "error";
  if (workerError.filename) {
    event.contexts = {
      ...event.contexts,
      worker: {
        filename: workerError.filename
      }
    };
  }
  captureEvent(event, {
    originalException: error,
    mechanism: {
      handled: false,
      type: "auto.browser.web_worker.onunhandledrejection"
    }
  });
  DEBUG_BUILD && debug.log("Captured worker unhandled rejection", error);
}
function registerWebWorker({ self }) {
  self.postMessage({
    _sentryMessage: true,
    _sentryDebugIds: self._sentryDebugIds ?? void 0,
    _sentryModuleMetadata: self._sentryModuleMetadata ?? void 0
  });
  self.addEventListener("unhandledrejection", (event) => {
    const reason = _getUnhandledRejectionError(event);
    const serializedError = {
      reason,
      filename: self.location?.href
    };
    self.postMessage({
      _sentryMessage: true,
      _sentryWorkerError: serializedError
    });
    DEBUG_BUILD && debug.log("[Sentry Worker] Forwarding unhandled rejection to parent", serializedError);
  });
  DEBUG_BUILD && debug.log("[Sentry Worker] Registered worker with unhandled rejection handling");
}
function isSentryMessage(eventData) {
  if (!isPlainObject(eventData) || eventData._sentryMessage !== true) {
    return false;
  }
  const hasDebugIds = "_sentryDebugIds" in eventData;
  const hasModuleMetadata = "_sentryModuleMetadata" in eventData;
  const hasWorkerError = "_sentryWorkerError" in eventData;
  const hasWasmImages = "_sentryWasmImages" in eventData;
  if (!hasDebugIds && !hasModuleMetadata && !hasWorkerError && !hasWasmImages) {
    return false;
  }
  if (hasDebugIds && !(isPlainObject(eventData._sentryDebugIds) || eventData._sentryDebugIds === void 0)) {
    return false;
  }
  if (hasModuleMetadata && !(isPlainObject(eventData._sentryModuleMetadata) || eventData._sentryModuleMetadata === void 0)) {
    return false;
  }
  if (hasWorkerError && !isPlainObject(eventData._sentryWorkerError)) {
    return false;
  }
  if (hasWasmImages && (!Array.isArray(eventData._sentryWasmImages) || !eventData._sentryWasmImages.every(
    (img) => isPlainObject(img) && typeof img.code_file === "string"
  ))) {
    return false;
  }
  return true;
}

export { INTEGRATION_NAME, registerWebWorker, webWorkerIntegration };
//# sourceMappingURL=webWorker.js.map
