import { defineIntegration, _INTERNAL_copyFlagsFromScopeToEvent, _INTERNAL_insertFlagToScope, _INTERNAL_addFeatureFlagToActiveSpan } from '@sentry/core/browser';

const launchDarklyIntegration = defineIntegration(() => {
  return {
    name: "LaunchDarkly",
    processEvent(event, _hint, _client) {
      return _INTERNAL_copyFlagsFromScopeToEvent(event);
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
      _INTERNAL_insertFlagToScope(flagKey, flagDetail.value);
      _INTERNAL_addFeatureFlagToActiveSpan(flagKey, flagDetail.value);
    }
  };
}

export { buildLaunchDarklyFlagUsedHandler, launchDarklyIntegration };
//# sourceMappingURL=integration.js.map
