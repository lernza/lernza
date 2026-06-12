import { getClient, debug } from '@sentry/core/browser';
import { DEBUG_BUILD } from '../debug-build.js';

function startProfiler() {
  const client = getClient();
  if (!client) {
    DEBUG_BUILD && debug.warn("No Sentry client available, profiling is not started");
    return;
  }
  const integration = client.getIntegrationByName("BrowserProfiling");
  if (!integration) {
    DEBUG_BUILD && debug.warn("BrowserProfiling integration is not available");
    return;
  }
  client.emit("startUIProfiler");
}
function stopProfiler() {
  const client = getClient();
  if (!client) {
    DEBUG_BUILD && debug.warn("No Sentry client available, profiling is not started");
    return;
  }
  const integration = client.getIntegrationByName("BrowserProfiling");
  if (!integration) {
    DEBUG_BUILD && debug.warn("ProfilingIntegration is not available");
    return;
  }
  client.emit("stopUIProfiler");
}
const uiProfiler = {
  startProfiler,
  stopProfiler
};

export { uiProfiler };
//# sourceMappingURL=index.js.map
