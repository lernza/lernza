Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const browser = require('@sentry/core/browser');

const statsigIntegration = browser.defineIntegration(
  ({ featureFlagClient: statsigClient }) => {
    return {
      name: "Statsig",
      setup(_client) {
        statsigClient.on("gate_evaluation", (event) => {
          browser._INTERNAL_insertFlagToScope(event.gate.name, event.gate.value);
          browser._INTERNAL_addFeatureFlagToActiveSpan(event.gate.name, event.gate.value);
        });
      },
      processEvent(event, _hint, _client) {
        return browser._INTERNAL_copyFlagsFromScopeToEvent(event);
      }
    };
  }
);

exports.statsigIntegration = statsigIntegration;
//# sourceMappingURL=integration.js.map
