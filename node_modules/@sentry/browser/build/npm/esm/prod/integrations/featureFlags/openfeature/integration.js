import { defineIntegration, _INTERNAL_copyFlagsFromScopeToEvent, _INTERNAL_insertFlagToScope, _INTERNAL_addFeatureFlagToActiveSpan } from '@sentry/core/browser';

const openFeatureIntegration = defineIntegration(() => {
  return {
    name: "OpenFeature",
    processEvent(event, _hint, _client) {
      return _INTERNAL_copyFlagsFromScopeToEvent(event);
    }
  };
});
class OpenFeatureIntegrationHook {
  /**
   * Successful evaluation result.
   */
  after(_hookContext, evaluationDetails) {
    _INTERNAL_insertFlagToScope(evaluationDetails.flagKey, evaluationDetails.value);
    _INTERNAL_addFeatureFlagToActiveSpan(evaluationDetails.flagKey, evaluationDetails.value);
  }
  /**
   * On error evaluation result.
   */
  error(hookContext, _error, _hookHints) {
    _INTERNAL_insertFlagToScope(hookContext.flagKey, hookContext.defaultValue);
    _INTERNAL_addFeatureFlagToActiveSpan(hookContext.flagKey, hookContext.defaultValue);
  }
}

export { OpenFeatureIntegrationHook, openFeatureIntegration };
//# sourceMappingURL=integration.js.map
