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

export { isElement };
//# sourceMappingURL=is.js.map
