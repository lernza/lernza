import { isPlainObject } from '@sentry/core';

function isSyntheticEvent(wat) {
  return isPlainObject(wat) && "nativeEvent" in wat && "preventDefault" in wat && "stopPropagation" in wat;
}

export { isSyntheticEvent };
//# sourceMappingURL=isSyntheticEvent.js.map
