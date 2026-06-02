import { defineIntegration, _INTERNAL_copyFlagsFromScopeToEvent, _INTERNAL_insertFlagToScope, _INTERNAL_addFeatureFlagToActiveSpan } from '@sentry/core/browser';

const statsigIntegration = defineIntegration(
  ({ featureFlagClient: statsigClient }) => {
    return {
      name: "Statsig",
      setup(_client) {
        statsigClient.on("gate_evaluation", (event) => {
          _INTERNAL_insertFlagToScope(event.gate.name, event.gate.value);
          _INTERNAL_addFeatureFlagToActiveSpan(event.gate.name, event.gate.value);
        });
      },
      processEvent(event, _hint, _client) {
        return _INTERNAL_copyFlagsFromScopeToEvent(event);
      }
    };
  }
);

export { statsigIntegration };
//# sourceMappingURL=integration.js.map
