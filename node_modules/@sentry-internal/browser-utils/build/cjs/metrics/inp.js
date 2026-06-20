Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const core = require('@sentry/core');
const htmlTreeAsString = require('../htmlTreeAsString.js');
const types = require('../types.js');
const instrument = require('./instrument.js');
const utils = require('./utils.js');

const LAST_INTERACTIONS = [];
const INTERACTIONS_SPAN_MAP = /* @__PURE__ */ new Map();
const ELEMENT_NAME_TIMESTAMP_MAP = /* @__PURE__ */ new Map();
const MAX_PLAUSIBLE_INP_DURATION = 60;
function startTrackingINP() {
  const performance = utils.getBrowserPerformanceAPI();
  if (performance && core.browserPerformanceTimeOrigin()) {
    const inpCallback = _trackINP();
    return () => {
      inpCallback();
    };
  }
  return () => void 0;
}
const INP_ENTRY_MAP = {
  click: "click",
  pointerdown: "click",
  pointerup: "click",
  mousedown: "click",
  mouseup: "click",
  touchstart: "click",
  touchend: "click",
  mouseover: "hover",
  mouseout: "hover",
  mouseenter: "hover",
  mouseleave: "hover",
  pointerover: "hover",
  pointerout: "hover",
  pointerenter: "hover",
  pointerleave: "hover",
  dragstart: "drag",
  dragend: "drag",
  drag: "drag",
  dragenter: "drag",
  dragleave: "drag",
  dragover: "drag",
  drop: "drag",
  keydown: "press",
  keyup: "press",
  keypress: "press",
  input: "press"
};
function _trackINP() {
  return instrument.addInpInstrumentationHandler(_onInp);
}
const _onInp = ({ metric }) => {
  if (metric.value == void 0) {
    return;
  }
  const duration = utils.msToSec(metric.value);
  if (duration > MAX_PLAUSIBLE_INP_DURATION) {
    return;
  }
  const entry = metric.entries.find((entry2) => entry2.duration === metric.value && INP_ENTRY_MAP[entry2.name]);
  if (!entry) {
    return;
  }
  const { interactionId } = entry;
  const interactionType = INP_ENTRY_MAP[entry.name];
  const startTime = utils.msToSec(core.browserPerformanceTimeOrigin() + entry.startTime);
  const activeSpan = core.getActiveSpan();
  const rootSpan = activeSpan ? core.getRootSpan(activeSpan) : void 0;
  const cachedInteractionContext = interactionId != null ? INTERACTIONS_SPAN_MAP.get(interactionId) : void 0;
  const spanToUse = cachedInteractionContext?.span || rootSpan;
  const routeName = spanToUse ? core.spanToJSON(spanToUse).description : core.getCurrentScope().getScopeData().transactionName;
  const name = cachedInteractionContext?.elementName || htmlTreeAsString.htmlTreeAsString(entry.target);
  const attributes = {
    [core.SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN]: "auto.http.browser.inp",
    [core.SEMANTIC_ATTRIBUTE_SENTRY_OP]: `ui.interaction.${interactionType}`,
    [core.SEMANTIC_ATTRIBUTE_EXCLUSIVE_TIME]: entry.duration
  };
  const span = utils.startStandaloneWebVitalSpan({
    name,
    transaction: routeName,
    attributes,
    startTime
  });
  if (span) {
    span.addEvent("inp", {
      [core.SEMANTIC_ATTRIBUTE_SENTRY_MEASUREMENT_UNIT]: "millisecond",
      [core.SEMANTIC_ATTRIBUTE_SENTRY_MEASUREMENT_VALUE]: metric.value
    });
    span.end(startTime + duration);
  }
};
function getCachedInteractionContext(interactionId) {
  return interactionId != null ? INTERACTIONS_SPAN_MAP.get(interactionId) : void 0;
}
function registerInpInteractionListener() {
  const interactionEvents = Object.keys(INP_ENTRY_MAP);
  if (core.isBrowser()) {
    interactionEvents.forEach((eventType) => {
      types.WINDOW.addEventListener(eventType, captureElementFromEvent, { capture: true, passive: true });
    });
  }
  function captureElementFromEvent(event) {
    const target = event.target;
    if (!target) {
      return;
    }
    const elementName = htmlTreeAsString.htmlTreeAsString(target);
    const timestamp = Math.round(event.timeStamp);
    ELEMENT_NAME_TIMESTAMP_MAP.set(timestamp, elementName);
    if (ELEMENT_NAME_TIMESTAMP_MAP.size > 50) {
      const firstKey = ELEMENT_NAME_TIMESTAMP_MAP.keys().next().value;
      if (firstKey !== void 0) {
        ELEMENT_NAME_TIMESTAMP_MAP.delete(firstKey);
      }
    }
  }
  function resolveElementNameFromEntry(entry) {
    const timestamp = Math.round(entry.startTime);
    let elementName = ELEMENT_NAME_TIMESTAMP_MAP.get(timestamp);
    if (!elementName) {
      for (let offset = -5; offset <= 5; offset++) {
        const nearbyName = ELEMENT_NAME_TIMESTAMP_MAP.get(timestamp + offset);
        if (nearbyName) {
          elementName = nearbyName;
          break;
        }
      }
    }
    return elementName || "<unknown>";
  }
  const handleEntries = ({ entries }) => {
    const activeSpan = core.getActiveSpan();
    const activeRootSpan = activeSpan && core.getRootSpan(activeSpan);
    entries.forEach((entry) => {
      if (!instrument.isPerformanceEventTiming(entry)) {
        return;
      }
      const interactionId = entry.interactionId;
      if (interactionId == null) {
        return;
      }
      if (INTERACTIONS_SPAN_MAP.has(interactionId)) {
        return;
      }
      const elementName = entry.target ? htmlTreeAsString.htmlTreeAsString(entry.target) : resolveElementNameFromEntry(entry);
      if (LAST_INTERACTIONS.length > 10) {
        const last = LAST_INTERACTIONS.shift();
        INTERACTIONS_SPAN_MAP.delete(last);
      }
      LAST_INTERACTIONS.push(interactionId);
      INTERACTIONS_SPAN_MAP.set(interactionId, {
        span: activeRootSpan,
        elementName
      });
    });
  };
  instrument.addPerformanceInstrumentationHandler("event", handleEntries);
  instrument.addPerformanceInstrumentationHandler("first-input", handleEntries);
}

exports.INP_ENTRY_MAP = INP_ENTRY_MAP;
exports.MAX_PLAUSIBLE_INP_DURATION = MAX_PLAUSIBLE_INP_DURATION;
exports._onInp = _onInp;
exports._trackINP = _trackINP;
exports.getCachedInteractionContext = getCachedInteractionContext;
exports.registerInpInteractionListener = registerInpInteractionListener;
exports.startTrackingINP = startTrackingINP;
//# sourceMappingURL=inp.js.map
