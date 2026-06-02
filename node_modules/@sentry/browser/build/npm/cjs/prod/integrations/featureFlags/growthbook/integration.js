Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const browser = require('@sentry/core/browser');

const growthbookIntegration = (({ growthbookClass }) => browser.growthbookIntegration({ growthbookClass }));

exports.growthbookIntegration = growthbookIntegration;
//# sourceMappingURL=integration.js.map
