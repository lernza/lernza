Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const browser = require('@sentry/browser');
const core = require('@sentry/core');
const React = require('react');
const debugBuild = require('./debug-build.js');
const error = require('./error.js');
const hoistNonReactStatics = require('./hoist-non-react-statics.js');

const UNKNOWN_COMPONENT = "unknown";
const INITIAL_STATE = {
  componentStack: null,
  error: null,
  eventId: null
};
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = INITIAL_STATE;
    this._openFallbackReportDialog = true;
    const client = browser.getClient();
    if (client && props.showDialog) {
      this._openFallbackReportDialog = false;
      this._cleanupHook = client.on("afterSendEvent", (event) => {
        if (!event.type && this._lastEventId && event.event_id === this._lastEventId) {
          browser.showReportDialog({ ...props.dialogOptions, eventId: this._lastEventId });
        }
      });
    }
  }
  componentDidCatch(error$1, errorInfo) {
    const { componentStack } = errorInfo;
    const { beforeCapture, onError, showDialog, dialogOptions } = this.props;
    browser.withScope((scope) => {
      if (beforeCapture) {
        beforeCapture(scope, error$1, componentStack);
      }
      const handled = this.props.handled != null ? this.props.handled : !!this.props.fallback;
      const eventId = error.captureReactException(error$1, errorInfo, {
        mechanism: { handled, type: "auto.function.react.error_boundary" }
      });
      if (onError) {
        onError(error$1, componentStack, eventId);
      }
      if (showDialog) {
        this._lastEventId = eventId;
        if (this._openFallbackReportDialog) {
          browser.showReportDialog({ ...dialogOptions, eventId });
        }
      }
      this.setState({ error: error$1, componentStack, eventId });
    });
  }
  componentDidMount() {
    const { onMount } = this.props;
    if (onMount) {
      onMount();
    }
  }
  componentWillUnmount() {
    const { error, componentStack, eventId } = this.state;
    const { onUnmount } = this.props;
    if (onUnmount) {
      if (this.state === INITIAL_STATE) {
        onUnmount(null, null, null);
      } else {
        onUnmount(error, componentStack, eventId);
      }
    }
    if (this._cleanupHook) {
      this._cleanupHook();
      this._cleanupHook = void 0;
    }
  }
  resetErrorBoundary() {
    const { onReset } = this.props;
    const { error, componentStack, eventId } = this.state;
    if (onReset) {
      onReset(error, componentStack, eventId);
    }
    this.setState(INITIAL_STATE);
  }
  render() {
    const { fallback, children } = this.props;
    const state = this.state;
    if (state.componentStack === null) {
      return typeof children === "function" ? children() : children;
    }
    const element = typeof fallback === "function" ? React.createElement(fallback, {
      error: state.error,
      componentStack: state.componentStack,
      resetError: () => this.resetErrorBoundary(),
      eventId: state.eventId
    }) : fallback;
    if (React.isValidElement(element)) {
      return element;
    }
    if (fallback) {
      debugBuild.DEBUG_BUILD && core.debug.warn("fallback did not produce a valid ReactElement");
    }
    return null;
  }
}
function withErrorBoundary(WrappedComponent, errorBoundaryOptions) {
  const componentDisplayName = WrappedComponent.displayName || WrappedComponent.name || UNKNOWN_COMPONENT;
  const Wrapped = React.memo((props) => /* @__PURE__ */ React.createElement(ErrorBoundary, { ...errorBoundaryOptions }, /* @__PURE__ */ React.createElement(WrappedComponent, { ...props })));
  Wrapped.displayName = `errorBoundary(${componentDisplayName})`;
  hoistNonReactStatics.hoistNonReactStatics(Wrapped, WrappedComponent);
  return Wrapped;
}

exports.ErrorBoundary = ErrorBoundary;
exports.UNKNOWN_COMPONENT = UNKNOWN_COMPONENT;
exports.withErrorBoundary = withErrorBoundary;
//# sourceMappingURL=errorboundary.js.map
