Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const core = require('@sentry/core');
const types = require('../types.js');

const DEBOUNCE_DURATION = 1e3;
let debounceTimerID;
let lastCapturedEventType;
let lastCapturedEventTargetId;
function addClickKeypressInstrumentationHandler(handler) {
  const type = "dom";
  core.addHandler(type, handler);
  core.maybeInstrument(type, instrumentDOM);
}
function instrumentDOM() {
  if (!types.WINDOW.document) {
    return;
  }
  const triggerDOMHandler = core.triggerHandlers.bind(null, "dom");
  const globalDOMEventHandler = makeDOMEventHandler(triggerDOMHandler, true);
  types.WINDOW.document.addEventListener("click", globalDOMEventHandler, false);
  types.WINDOW.document.addEventListener("keypress", globalDOMEventHandler, false);
  ["EventTarget", "Node"].forEach((target) => {
    const globalObject = types.WINDOW;
    const proto = globalObject[target]?.prototype;
    if (!proto?.hasOwnProperty?.("addEventListener")) {
      return;
    }
    core.fill(proto, "addEventListener", function(originalAddEventListener) {
      return function(type, listener, options) {
        if (type === "click" || type == "keypress") {
          try {
            const handlers = this.__sentry_instrumentation_handlers__ = this.__sentry_instrumentation_handlers__ || {};
            const handlerForType = handlers[type] = handlers[type] || { refCount: 0 };
            if (!handlerForType.handler) {
              const handler = makeDOMEventHandler(triggerDOMHandler);
              handlerForType.handler = handler;
              originalAddEventListener.call(this, type, handler, options);
            }
            handlerForType.refCount++;
          } catch {
          }
        }
        return originalAddEventListener.call(this, type, listener, options);
      };
    });
    core.fill(
      proto,
      "removeEventListener",
      function(originalRemoveEventListener) {
        return function(type, listener, options) {
          if (type === "click" || type == "keypress") {
            try {
              const handlers = this.__sentry_instrumentation_handlers__ || {};
              const handlerForType = handlers[type];
              if (handlerForType) {
                handlerForType.refCount--;
                if (handlerForType.refCount <= 0) {
                  originalRemoveEventListener.call(this, type, handlerForType.handler, options);
                  handlerForType.handler = void 0;
                  delete handlers[type];
                }
                if (Object.keys(handlers).length === 0) {
                  delete this.__sentry_instrumentation_handlers__;
                }
              }
            } catch {
            }
          }
          return originalRemoveEventListener.call(this, type, listener, options);
        };
      }
    );
  });
}
function isSimilarToLastCapturedEvent(event) {
  if (event.type !== lastCapturedEventType) {
    return false;
  }
  try {
    if (!event.target || event.target._sentryId !== lastCapturedEventTargetId) {
      return false;
    }
  } catch {
  }
  return true;
}
function shouldSkipDOMEvent(eventType, target) {
  if (eventType !== "keypress") {
    return false;
  }
  if (!target?.tagName) {
    return true;
  }
  if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
    return false;
  }
  return true;
}
function makeDOMEventHandler(handler, globalListener = false) {
  return (event) => {
    if (!event || event["_sentryCaptured"]) {
      return;
    }
    const target = getEventTarget(event);
    if (shouldSkipDOMEvent(event.type, target)) {
      return;
    }
    core.addNonEnumerableProperty(event, "_sentryCaptured", true);
    if (target && !target._sentryId) {
      core.addNonEnumerableProperty(target, "_sentryId", core.uuid4());
    }
    const name = event.type === "keypress" ? "input" : event.type;
    if (!isSimilarToLastCapturedEvent(event)) {
      const handlerData = { event, name, global: globalListener };
      handler(handlerData);
      lastCapturedEventType = event.type;
      lastCapturedEventTargetId = target ? target._sentryId : void 0;
    }
    clearTimeout(debounceTimerID);
    debounceTimerID = types.WINDOW.setTimeout(() => {
      lastCapturedEventTargetId = void 0;
      lastCapturedEventType = void 0;
    }, DEBOUNCE_DURATION);
  };
}
function getEventTarget(event) {
  try {
    return event.target;
  } catch {
    return null;
  }
}

exports.addClickKeypressInstrumentationHandler = addClickKeypressInstrumentationHandler;
exports.instrumentDOM = instrumentDOM;
//# sourceMappingURL=dom.js.map
