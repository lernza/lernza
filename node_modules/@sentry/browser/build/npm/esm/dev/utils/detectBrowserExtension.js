import { consoleSandbox, getLocationHref } from '@sentry/core/browser';
import { DEBUG_BUILD } from '../debug-build.js';
import { WINDOW } from '../helpers.js';

function checkAndWarnIfIsEmbeddedBrowserExtension() {
  if (_isEmbeddedBrowserExtension()) {
    if (DEBUG_BUILD) {
      consoleSandbox(() => {
        console.error(
          "[Sentry] You cannot use Sentry.init() in a browser extension, see: https://docs.sentry.io/platforms/javascript/best-practices/browser-extensions/"
        );
      });
    }
    return true;
  }
  return false;
}
function _isEmbeddedBrowserExtension() {
  if (typeof WINDOW.window === "undefined") {
    return false;
  }
  const _window = WINDOW;
  if (_window.nw) {
    return false;
  }
  const extensionObject = _window["chrome"] || _window["browser"];
  if (!extensionObject?.runtime?.id) {
    return false;
  }
  const href = getLocationHref();
  const isDedicatedExtensionPage = WINDOW === WINDOW.top && /^(?:chrome-extension|moz-extension|ms-browser-extension|safari-web-extension):\/\//.test(href);
  return !isDedicatedExtensionPage;
}

export { checkAndWarnIfIsEmbeddedBrowserExtension };
//# sourceMappingURL=detectBrowserExtension.js.map
