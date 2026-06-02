Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const browser = require('@sentry/browser');
const core = require('@sentry/core');
const React = require('react');
const constants = require('./constants.js');
const hoistNonReactStatics = require('./hoist-non-react-statics.js');

const UNKNOWN_COMPONENT = "unknown";
class Profiler extends React.Component {
  constructor(props) {
    super(props);
    const { name, disabled = false } = this.props;
    if (disabled) {
      return;
    }
    this._mountSpan = browser.startInactiveSpan({
      name: `<${name}>`,
      onlyIfParent: true,
      op: constants.REACT_MOUNT_OP,
      attributes: {
        [core.SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN]: "auto.ui.react.profiler",
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
        const now = core.timestampInSeconds();
        this._updateSpan = core.withActiveSpan(this._mountSpan, () => {
          return browser.startInactiveSpan({
            name: `<${this.props.name}>`,
            onlyIfParent: true,
            op: constants.REACT_UPDATE_OP,
            startTime: now,
            attributes: {
              [core.SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN]: "auto.ui.react.profiler",
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
    const endTimestamp = core.timestampInSeconds();
    const { name, includeRender = true } = this.props;
    if (this._mountSpan && includeRender) {
      const startTime = core.spanToJSON(this._mountSpan).timestamp;
      core.withActiveSpan(this._mountSpan, () => {
        const renderSpan = browser.startInactiveSpan({
          onlyIfParent: true,
          name: `<${name}>`,
          op: constants.REACT_RENDER_OP,
          startTime,
          attributes: {
            [core.SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN]: "auto.ui.react.profiler",
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
  hoistNonReactStatics.hoistNonReactStatics(Wrapped, WrappedComponent);
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
    return browser.startInactiveSpan({
      name: `<${name}>`,
      onlyIfParent: true,
      op: constants.REACT_MOUNT_OP,
      attributes: {
        [core.SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN]: "auto.ui.react.profiler",
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
        const startTime = core.spanToJSON(mountSpan).timestamp;
        const endTimestamp = core.timestampInSeconds();
        const renderSpan = browser.startInactiveSpan({
          name: `<${name}>`,
          onlyIfParent: true,
          op: constants.REACT_RENDER_OP,
          startTime,
          attributes: {
            [core.SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN]: "auto.ui.react.profiler",
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

exports.Profiler = Profiler;
exports.UNKNOWN_COMPONENT = UNKNOWN_COMPONENT;
exports.useProfiler = useProfiler;
exports.withProfiler = withProfiler;
//# sourceMappingURL=profiler.js.map
