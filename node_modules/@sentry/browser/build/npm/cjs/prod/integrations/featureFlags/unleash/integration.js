Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const browser = require('@sentry/core/browser');
const debugBuild = require('../../../debug-build.js');

const unleashIntegration = browser.defineIntegration(
  ({ featureFlagClientClass: unleashClientClass }) => {
    return {
      name: "Unleash",
      setupOnce() {
        const unleashClientPrototype = unleashClientClass.prototype;
        browser.fill(unleashClientPrototype, "isEnabled", _wrappedIsEnabled);
      },
      processEvent(event, _hint, _client) {
        return browser._INTERNAL_copyFlagsFromScopeToEvent(event);
      }
    };
  }
);
function _wrappedIsEnabled(original) {
  return function(...args) {
    const toggleName = args[0];
    const result = original.apply(this, args);
    if (typeof toggleName === "string" && typeof result === "boolean") {
      browser._INTERNAL_insertFlagToScope(toggleName, result);
      browser._INTERNAL_addFeatureFlagToActiveSpan(toggleName, result);
    } else if (debugBuild.DEBUG_BUILD) {
      browser.debug.error(
        `[Feature Flags] UnleashClient.isEnabled does not match expected signature. arg0: ${toggleName} (${typeof toggleName}), result: ${result} (${typeof result})`
      );
    }
    return result;
  };
}

exports.unleashIntegration = unleashIntegration;
//# sourceMappingURL=integration.js.map
