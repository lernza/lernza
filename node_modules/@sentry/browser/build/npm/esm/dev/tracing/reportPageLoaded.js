import { getClient } from '@sentry/core/browser';

function reportPageLoaded(client = getClient()) {
  client?.emit("endPageloadSpan");
}

export { reportPageLoaded };
//# sourceMappingURL=reportPageLoaded.js.map
