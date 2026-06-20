Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const observe = require('../observe.js');

let interactionCountEstimate = 0;
let minKnownInteractionId = Infinity;
let maxKnownInteractionId = 0;
const updateEstimate = (entries) => {
  entries.forEach((e) => {
    if (e.interactionId) {
      minKnownInteractionId = Math.min(minKnownInteractionId, e.interactionId);
      maxKnownInteractionId = Math.max(maxKnownInteractionId, e.interactionId);
      interactionCountEstimate = maxKnownInteractionId ? (maxKnownInteractionId - minKnownInteractionId) / 7 + 1 : 0;
    }
  });
};
let po;
const getInteractionCount = () => {
  return po ? interactionCountEstimate : performance.interactionCount || 0;
};
const initInteractionCountPolyfill = () => {
  if ("interactionCount" in performance || po) return;
  po = observe.observe("event", updateEstimate, {
    type: "event",
    buffered: true,
    durationThreshold: 0
  });
};

exports.getInteractionCount = getInteractionCount;
exports.initInteractionCountPolyfill = initInteractionCountPolyfill;
//# sourceMappingURL=interactionCountPolyfill.js.map
