import { setContext, init as init$1, normalizeStringifyValue as normalizeStringifyValue$1 } from '@sentry/browser';
import { applySdkMetadata, setNormalizeStringifier } from '@sentry/core/browser';
import { version } from 'react';
import { isSyntheticEvent } from './isSyntheticEvent.js';

function init(options) {
  const opts = {
    ...options
  };
  applySdkMetadata(opts, "react");
  setContext("react", { version });
  const client = init$1(opts);
  setNormalizeStringifier(normalizeStringifyValue);
  return client;
}
function normalizeStringifyValue(value) {
  if (isSyntheticEvent(value)) {
    return "[SyntheticEvent]";
  }
  return normalizeStringifyValue$1(value);
}

export { init };
//# sourceMappingURL=sdk.js.map
