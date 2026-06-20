Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const browser = require('@sentry/core/browser');

const launchDarklyIntegration = browser.defineIntegration(() => {
  return {
    name: "LaunchDarkly",
    processEvent(event, _hint, _client) {
      return browser._INTERNAL_copyFlagsFromScopeToEvent(event);
    }
  };
});
function buildLaunchDarklyFlagUsedHandler() {
  return {
    name: "sentry-flag-auditor",
    type: "flag-used",
    synchronous: true,
    /**
     * Handle a flag evaluation by storing its name and value on the current scope.
     */
    method: (flagKey, flagDetail, _context) => {
      browser._INTERNAL_insertFlagToScope(flagKey, flagDetail.value);
      browser._INTERNAL_addFeatureFlagToActiveSpan(flagKey, flagDetail.value);
    }
  };
}

exports.buildLaunchDarklyFlagUsedHandler = buildLaunchDarklyFlagUsedHandler;
exports.launchDarklyIntegration = launchDarklyIntegration;
//# sourceMappingURL=integration.js.map
