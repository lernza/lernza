import { getClient, showReportDialog, withScope } from '@sentry/browser';
import { debug } from '@sentry/core';
import * as React from 'react';
import { DEBUG_BUILD } from './debug-build.js';
import { captureReactException } from './error.js';
import { hoistNonReactStatics } from './hoist-non-react-statics.js';

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
    const client = getClient();
    if (client && props.showDialog) {
      this._openFallbackReportDialog = false;
      this._cleanupHook = client.on("afterSendEvent", (event) => {
        if (!event.type && this._lastEventId && event.event_id === this._lastEventId) {
          showReportDialog({ ...props.dialogOptions, eventId: this._lastEventId });
        }
      });
    }
  }
  componentDidCatch(error, errorInfo) {
    const { componentStack } = errorInfo;
    const { beforeCapture, onError, showDialog, dialogOptions } = this.props;
    withScope((scope) => {
      if (beforeCapture) {
        beforeCapture(scope, error, componentStack);
      }
      const handled = this.props.handled != null ? this.props.handled : !!this.props.fallback;
      const eventId = captureReactException(error, errorInfo, {
        mechanism: { handled, type: "auto.function.react.error_boundary" }
      });
      if (onError) {
        onError(error, componentStack, eventId);
      }
      if (showDialog) {
        this._lastEventId = eventId;
        if (this._openFallbackReportDialog) {
          showReportDialog({ ...dialogOptions, eventId });
        }
      }
      this.setState({ error, componentStack, eventId });
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
      DEBUG_BUILD && debug.warn("fallback did not produce a valid ReactElement");
    }
    return null;
  }
}
function withErrorBoundary(WrappedComponent, errorBoundaryOptions) {
  const componentDisplayName = WrappedComponent.displayName || WrappedComponent.name || UNKNOWN_COMPONENT;
  const Wrapped = React.memo((props) => /* @__PURE__ */ React.createElement(ErrorBoundary, { ...errorBoundaryOptions }, /* @__PURE__ */ React.createElement(WrappedComponent, { ...props })));
  Wrapped.displayName = `errorBoundary(${componentDisplayName})`;
  hoistNonReactStatics(Wrapped, WrappedComponent);
  return Wrapped;
}

export { ErrorBoundary, UNKNOWN_COMPONENT, withErrorBoundary };
//# sourceMappingURL=errorboundary.js.map
