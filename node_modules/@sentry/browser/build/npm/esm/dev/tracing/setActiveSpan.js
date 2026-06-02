import { getActiveSpan, getCurrentScope, _INTERNAL_setSpanForScope } from '@sentry/core/browser';

function setActiveSpanInBrowser(span) {
  const maybePreviousActiveSpan = getActiveSpan();
  if (maybePreviousActiveSpan === span) {
    return;
  }
  const scope = getCurrentScope();
  span.end = new Proxy(span.end, {
    apply(target, thisArg, args) {
      _INTERNAL_setSpanForScope(scope, maybePreviousActiveSpan);
      return Reflect.apply(target, thisArg, args);
    }
  });
  _INTERNAL_setSpanForScope(scope, span);
}

export { setActiveSpanInBrowser };
//# sourceMappingURL=setActiveSpan.js.map
