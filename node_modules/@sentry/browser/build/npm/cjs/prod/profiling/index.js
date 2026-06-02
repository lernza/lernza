Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const browser = require('@sentry/core/browser');
const debugBuild = require('../debug-build.js');

function startProfiler() {
  const client = browser.getClient();
  if (!client) {
    debugBuild.DEBUG_BUILD && browser.debug.warn("No Sentry client available, profiling is not started");
    return;
  }
  const integration = client.getIntegrationByName("BrowserProfiling");
  if (!integration) {
    debugBuild.DEBUG_BUILD && browser.debug.warn("BrowserProfiling integration is not available");
    return;
  }
  client.emit("startUIProfiler");
}
function stopProfiler() {
  const client = browser.getClient();
  if (!client) {
    debugBuild.DEBUG_BUILD && browser.debug.warn("No Sentry client available, profiling is not started");
    return;
  }
  const integration = client.getIntegrationByName("BrowserProfiling");
  if (!integration) {
    debugBuild.DEBUG_BUILD && browser.debug.warn("ProfilingIntegration is not available");
    return;
  }
  client.emit("stopUIProfiler");
}
const uiProfiler = {
  startProfiler,
  stopProfiler
};

exports.uiProfiler = uiProfiler;
//# sourceMappingURL=index.js.map
