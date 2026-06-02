import { defineIntegration, _INTERNAL_copyFlagsFromScopeToEvent, fill, _INTERNAL_insertFlagToScope, _INTERNAL_addFeatureFlagToActiveSpan, debug } from '@sentry/core/browser';
import { DEBUG_BUILD } from '../../../debug-build.js';

const unleashIntegration = defineIntegration(
  ({ featureFlagClientClass: unleashClientClass }) => {
    return {
      name: "Unleash",
      setupOnce() {
        const unleashClientPrototype = unleashClientClass.prototype;
        fill(unleashClientPrototype, "isEnabled", _wrappedIsEnabled);
      },
      processEvent(event, _hint, _client) {
        return _INTERNAL_copyFlagsFromScopeToEvent(event);
      }
    };
  }
);
function _wrappedIsEnabled(original) {
  return function(...args) {
    const toggleName = args[0];
    const result = original.apply(this, args);
    if (typeof toggleName === "string" && typeof result === "boolean") {
      _INTERNAL_insertFlagToScope(toggleName, result);
      _INTERNAL_addFeatureFlagToActiveSpan(toggleName, result);
    } else if (DEBUG_BUILD) {
      debug.error(
        `[Feature Flags] UnleashClient.isEnabled does not match expected signature. arg0: ${toggleName} (${typeof toggleName}), result: ${result} (${typeof result})`
      );
    }
    return result;
  };
}

export { unleashIntegration };
//# sourceMappingURL=integration.js.map
