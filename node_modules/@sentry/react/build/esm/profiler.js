import { startInactiveSpan } from '@sentry/browser';
import { SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN, timestampInSeconds, withActiveSpan, spanToJSON } from '@sentry/core';
import * as React from 'react';
import { REACT_MOUNT_OP, REACT_UPDATE_OP, REACT_RENDER_OP } from './constants.js';
import { hoistNonReactStatics } from './hoist-non-react-statics.js';

const UNKNOWN_COMPONENT = "unknown";
class Profiler extends React.Component {
  constructor(props) {
    super(props);
    const { name, disabled = false } = this.props;
    if (disabled) {
      return;
    }
    this._mountSpan = startInactiveSpan({
      name: `<${name}>`,
      onlyIfParent: true,
      op: REACT_MOUNT_OP,
      attributes: {
        [SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN]: "auto.ui.react.profiler",
        "ui.component_name": name
      }
    });
  }
  // If a component mounted, we can finish the mount activity.
  componentDidMount() {
    if (this._mountSpan) {
      this._mountSpan.end();
    }
  }
  shouldComponentUpdate({ updateProps, includeUpdates = true }) {
    if (includeUpdates && this._mountSpan && updateProps !== this.props.updateProps) {
      const changedProps = Object.keys(updateProps).filter((k) => updateProps[k] !== this.props.updateProps[k]);
      if (changedProps.length > 0) {
        const now = timestampInSeconds();
        this._updateSpan = withActiveSpan(this._mountSpan, () => {
          return startInactiveSpan({
            name: `<${this.props.name}>`,
            onlyIfParent: true,
            op: REACT_UPDATE_OP,
            startTime: now,
            attributes: {
              [SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN]: "auto.ui.react.profiler",
              "ui.component_name": this.props.name,
              "ui.react.changed_props": changedProps
            }
          });
        });
      }
    }
    return true;
  }
  componentDidUpdate() {
    if (this._updateSpan) {
      this._updateSpan.end();
      this._updateSpan = void 0;
    }
  }
  // If a component is unmounted, we can say it is no longer on the screen.
  // This means we can finish the span representing the component render.
  componentWillUnmount() {
    const endTimestamp = timestampInSeconds();
    const { name, includeRender = true } = this.props;
    if (this._mountSpan && includeRender) {
      const startTime = spanToJSON(this._mountSpan).timestamp;
      withActiveSpan(this._mountSpan, () => {
        const renderSpan = startInactiveSpan({
          onlyIfParent: true,
          name: `<${name}>`,
          op: REACT_RENDER_OP,
          startTime,
          attributes: {
            [SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN]: "auto.ui.react.profiler",
            "ui.component_name": name
          }
        });
        if (renderSpan) {
          renderSpan.end(endTimestamp);
        }
      });
    }
  }
  render() {
    return this.props.children;
  }
}
Object.assign(Profiler, {
  defaultProps: {
    disabled: false,
    includeRender: true,
    includeUpdates: true
  }
});
function withProfiler(WrappedComponent, options) {
  const componentDisplayName = options?.name || WrappedComponent.displayName || WrappedComponent.name || UNKNOWN_COMPONENT;
  const Wrapped = (props) => /* @__PURE__ */ React.createElement(Profiler, { ...options, name: componentDisplayName, updateProps: props }, /* @__PURE__ */ React.createElement(WrappedComponent, { ...props }));
  Wrapped.displayName = `profiler(${componentDisplayName})`;
  hoistNonReactStatics(Wrapped, WrappedComponent);
  return Wrapped;
}
function useProfiler(name, options = {
  disabled: false,
  hasRenderSpan: true
}) {
  const [mountSpan] = React.useState(() => {
    if (options?.disabled) {
      return void 0;
    }
    return startInactiveSpan({
      name: `<${name}>`,
      onlyIfParent: true,
      op: REACT_MOUNT_OP,
      attributes: {
        [SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN]: "auto.ui.react.profiler",
        "ui.component_name": name
      }
    });
  });
  React.useEffect(() => {
    if (mountSpan) {
      mountSpan.end();
    }
    return () => {
      if (mountSpan && options.hasRenderSpan) {
        const startTime = spanToJSON(mountSpan).timestamp;
        const endTimestamp = timestampInSeconds();
        const renderSpan = startInactiveSpan({
          name: `<${name}>`,
          onlyIfParent: true,
          op: REACT_RENDER_OP,
          startTime,
          attributes: {
            [SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN]: "auto.ui.react.profiler",
            "ui.component_name": name
          }
        });
        if (renderSpan) {
          renderSpan.end(endTimestamp);
        }
      }
    };
  }, []);
}

export { Profiler, UNKNOWN_COMPONENT, useProfiler, withProfiler };
//# sourceMappingURL=profiler.js.map
