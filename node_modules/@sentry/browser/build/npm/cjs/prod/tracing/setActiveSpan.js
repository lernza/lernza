Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const browser = require('@sentry/core/browser');

function setActiveSpanInBrowser(span) {
  const maybePreviousActiveSpan = browser.getActiveSpan();
  if (maybePreviousActiveSpan === span) {
    return;
  }
  const scope = browser.getCurrentScope();
  span.end = new Proxy(span.end, {
    apply(target, thisArg, args) {
      browser._INTERNAL_setSpanForScope(scope, maybePreviousActiveSpan);
      return Reflect.apply(target, thisArg, args);
    }
  });
  browser._INTERNAL_setSpanForScope(scope, span);
}

exports.setActiveSpanInBrowser = setActiveSpanInBrowser;
//# sourceMappingURL=setActiveSpan.js.map
