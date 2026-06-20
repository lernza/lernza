Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const core = require('@sentry/core');

function isSyntheticEvent(wat) {
  return core.isPlainObject(wat) && "nativeEvent" in wat && "preventDefault" in wat && "stopPropagation" in wat;
}

exports.isSyntheticEvent = isSyntheticEvent;
//# sourceMappingURL=isSyntheticEvent.js.map
