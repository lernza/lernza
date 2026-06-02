Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const browser = require('@sentry/core/browser');
const helpers = require('../helpers.js');

const INTEGRATION_NAME = "CultureContext";
const _cultureContextIntegration = (() => {
  return {
    name: INTEGRATION_NAME,
    preprocessEvent(event) {
      const culture = getCultureContext();
      if (culture) {
        event.contexts = {
          ...event.contexts,
          culture: { ...culture, ...event.contexts?.culture }
        };
      }
    },
    processSegmentSpan(span) {
      const culture = getCultureContext();
      if (culture) {
        browser.safeSetSpanJSONAttributes(span, {
          "culture.locale": culture.locale,
          "culture.timezone": culture.timezone,
          "culture.calendar": culture.calendar
        });
      }
    }
  };
});
const cultureContextIntegration = browser.defineIntegration(_cultureContextIntegration);
function getCultureContext() {
  try {
    const intl = helpers.WINDOW.Intl;
    if (!intl) {
      return void 0;
    }
    const options = intl.DateTimeFormat().resolvedOptions();
    return {
      locale: options.locale,
      timezone: options.timeZone,
      calendar: options.calendar
    };
  } catch {
    return void 0;
  }
}

exports.cultureContextIntegration = cultureContextIntegration;
//# sourceMappingURL=culturecontext.js.map
