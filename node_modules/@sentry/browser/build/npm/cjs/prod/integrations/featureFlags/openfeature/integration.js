Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const browser = require('@sentry/core/browser');

const openFeatureIntegration = browser.defineIntegration(() => {
  return {
    name: "OpenFeature",
    processEvent(event, _hint, _client) {
      return browser._INTERNAL_copyFlagsFromScopeToEvent(event);
    }
  };
});
class OpenFeatureIntegrationHook {
  /**
   * Successful evaluation result.
   */
  after(_hookContext, evaluationDetails) {
    browser._INTERNAL_insertFlagToScope(evaluationDetails.flagKey, evaluationDetails.value);
    browser._INTERNAL_addFeatureFlagToActiveSpan(evaluationDetails.flagKey, evaluationDetails.value);
  }
  /**
   * On error evaluation result.
   */
  error(hookContext, _error, _hookHints) {
    browser._INTERNAL_insertFlagToScope(hookContext.flagKey, hookContext.defaultValue);
    browser._INTERNAL_addFeatureFlagToActiveSpan(hookContext.flagKey, hookContext.defaultValue);
  }
}

exports.OpenFeatureIntegrationHook = OpenFeatureIntegrationHook;
exports.openFeatureIntegration = openFeatureIntegration;
//# sourceMappingURL=integration.js.map
