Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

function isElement(wat) {
  if (typeof Element === "undefined") {
    return false;
  }
  try {
    return wat instanceof Element;
  } catch {
    return false;
  }
}

exports.isElement = isElement;
//# sourceMappingURL=is.js.map
