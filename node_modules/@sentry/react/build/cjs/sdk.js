Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const browser$1 = require('@sentry/browser');
const browser = require('@sentry/core/browser');
const React = require('react');
const isSyntheticEvent = require('./isSyntheticEvent.js');

function init(options) {
  const opts = {
    ...options
  };
  browser.applySdkMetadata(opts, "react");
  browser$1.setContext("react", { version: React.version });
  const client = browser$1.init(opts);
  browser.setNormalizeStringifier(normalizeStringifyValue);
  return client;
}
function normalizeStringifyValue(value) {
  if (isSyntheticEvent.isSyntheticEvent(value)) {
    return "[SyntheticEvent]";
  }
  return browser$1.normalizeStringifyValue(value);
}

exports.init = init;
//# sourceMappingURL=sdk.js.map
