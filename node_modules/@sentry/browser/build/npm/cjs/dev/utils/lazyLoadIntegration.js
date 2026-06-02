Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const browser = require('@sentry/core/browser');
const helpers = require('../helpers.js');

const LAZY_LOADABLE_NAMES = [
  "replayIntegration",
  "replayCanvasIntegration",
  "feedbackIntegration",
  "feedbackModalIntegration",
  "feedbackScreenshotIntegration",
  "captureConsoleIntegration",
  "contextLinesIntegration",
  "linkedErrorsIntegration",
  "dedupeIntegration",
  "extraErrorDataIntegration",
  "graphqlClientIntegration",
  "httpClientIntegration",
  "reportingObserverIntegration",
  "rewriteFramesIntegration",
  "browserProfilingIntegration",
  "moduleMetadataIntegration",
  "instrumentAnthropicAiClient",
  "instrumentOpenAiClient",
  "instrumentGoogleGenAIClient",
  "instrumentLangGraph",
  "createLangChainCallbackHandler",
  "instrumentLangChainEmbeddings"
];
const HYPHENATED_BUNDLES = {
  replayCanvasIntegration: "replay-canvas",
  feedbackModalIntegration: "feedback-modal",
  feedbackScreenshotIntegration: "feedback-screenshot"
};
function getBundleName(name) {
  return HYPHENATED_BUNDLES[name] || name.replace("Integration", "").toLowerCase();
}
const WindowWithMaybeIntegration = helpers.WINDOW;
async function lazyLoadIntegration(name, scriptNonce) {
  const bundle = LAZY_LOADABLE_NAMES.includes(name) ? getBundleName(name) : void 0;
  const sentryOnWindow = WindowWithMaybeIntegration.Sentry = WindowWithMaybeIntegration.Sentry || {};
  if (!bundle) {
    throw new Error(`Cannot lazy load integration: ${name}`);
  }
  const existing = sentryOnWindow[name];
  if (typeof existing === "function" && !("_isShim" in existing)) {
    return existing;
  }
  const url = getScriptURL(bundle);
  const script = helpers.WINDOW.document.createElement("script");
  script.src = url;
  script.crossOrigin = "anonymous";
  script.referrerPolicy = "strict-origin";
  if (scriptNonce) {
    script.setAttribute("nonce", scriptNonce);
  }
  const waitForLoad = new Promise((resolve, reject) => {
    script.addEventListener("load", () => resolve());
    script.addEventListener("error", reject);
  });
  const currentScript = helpers.WINDOW.document.currentScript;
  const parent = helpers.WINDOW.document.body || helpers.WINDOW.document.head || currentScript?.parentElement;
  if (parent) {
    parent.appendChild(script);
  } else {
    throw new Error(`Could not find parent element to insert lazy-loaded ${name} script`);
  }
  try {
    await waitForLoad;
  } catch {
    throw new Error(`Error when loading integration: ${name}`);
  }
  const integrationFn = sentryOnWindow[name];
  if (typeof integrationFn !== "function") {
    throw new Error(`Could not load integration: ${name}`);
  }
  return integrationFn;
}
function getScriptURL(bundle) {
  const client = browser.getClient();
  const baseURL = client?.getOptions()?.cdnBaseUrl || "https://browser.sentry-cdn.com";
  return new URL(`/${browser.SDK_VERSION}/${bundle}.min.js`, baseURL).toString();
}

exports.lazyLoadIntegration = lazyLoadIntegration;
//# sourceMappingURL=lazyLoadIntegration.js.map
