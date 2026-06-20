Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const browser = require('@sentry/core/browser');
const helpers = require('../helpers.js');

const viewHierarchyIntegration = browser.defineIntegration((options = {}) => {
  const skipHtmlTags = ["script"];
  function walk(element, windows, depth = 0) {
    if (!element) {
      return;
    }
    const children = "shadowRoot" in element && element.shadowRoot ? element.shadowRoot.children : element.children;
    for (const child of children) {
      if (!(child instanceof HTMLElement)) {
        continue;
      }
      const componentName = browser.getComponentName(child, 1) || void 0;
      const tagName = child.tagName.toLowerCase();
      if (skipHtmlTags.includes(tagName)) {
        continue;
      }
      const result = options.onElement?.({ element: child, componentName, tagName, depth }) || {};
      if (result === "skip") {
        continue;
      }
      if (result === "children") {
        walk(child, windows, depth + 1);
        continue;
      }
      const { x, y, width, height } = child.getBoundingClientRect();
      const window = {
        identifier: child.id || void 0,
        type: componentName || tagName,
        visible: true,
        alpha: 1,
        height,
        width,
        x,
        y,
        ...result
      };
      const children2 = [];
      window.children = children2;
      walk(child, window.children, depth + 1);
      windows.push(window);
    }
  }
  return {
    name: "ViewHierarchy",
    processEvent: (event, hint) => {
      if (event.type !== void 0 || options.shouldAttach?.(event, hint) === false) {
        return event;
      }
      const root = {
        rendering_system: "DOM",
        positioning: "absolute",
        windows: []
      };
      walk(options.rootElement?.() || helpers.WINDOW.document.body, root.windows);
      const attachment = {
        filename: "view-hierarchy.json",
        attachmentType: "event.view_hierarchy",
        contentType: "application/json",
        data: JSON.stringify(root)
      };
      hint.attachments = hint.attachments || [];
      hint.attachments.push(attachment);
      return event;
    }
  };
});

exports.viewHierarchyIntegration = viewHierarchyIntegration;
//# sourceMappingURL=view-hierarchy.js.map
