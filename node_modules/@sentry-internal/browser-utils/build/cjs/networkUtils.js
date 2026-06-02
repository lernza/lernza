Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const core = require('@sentry/core');
const debugBuild = require('./debug-build.js');

const ORIGINAL_REQ_BODY = /* @__PURE__ */ Symbol.for("sentry__originalRequestBody");
function serializeFormData(formData) {
  return new URLSearchParams(formData).toString();
}
function getBodyString(body, _debug = core.debug) {
  try {
    if (typeof body === "string") {
      return [body];
    }
    if (body instanceof URLSearchParams) {
      return [body.toString()];
    }
    if (body instanceof FormData) {
      return [serializeFormData(body)];
    }
    if (!body) {
      return [void 0];
    }
  } catch (error) {
    debugBuild.DEBUG_BUILD && _debug.error(error, "Failed to serialize body", body);
    return [void 0, "BODY_PARSE_ERROR"];
  }
  debugBuild.DEBUG_BUILD && _debug.log("Skipping network body because of body type", body);
  return [void 0, "UNPARSEABLE_BODY_TYPE"];
}
function getFetchRequestArgBody(fetchArgs = []) {
  if (fetchArgs.length >= 2 && fetchArgs[1] && typeof fetchArgs[1] === "object" && "body" in fetchArgs[1]) {
    return fetchArgs[1].body;
  }
  if (fetchArgs.length >= 1 && fetchArgs[0] instanceof Request) {
    const request = fetchArgs[0];
    const originalBody = request[ORIGINAL_REQ_BODY];
    if (originalBody !== void 0) {
      return originalBody;
    }
    return void 0;
  }
  return void 0;
}
function parseXhrResponseHeaders(xhr) {
  let headers;
  try {
    headers = xhr.getAllResponseHeaders();
  } catch (error) {
    debugBuild.DEBUG_BUILD && core.debug.error(error, "Failed to get xhr response headers", xhr);
    return {};
  }
  if (!headers) {
    return {};
  }
  return headers.split("\r\n").reduce((acc, line) => {
    const [key, value] = line.split(": ");
    if (value) {
      acc[key.toLowerCase()] = value;
    }
    return acc;
  }, {});
}

exports.ORIGINAL_REQ_BODY = ORIGINAL_REQ_BODY;
exports.getBodyString = getBodyString;
exports.getFetchRequestArgBody = getFetchRequestArgBody;
exports.parseXhrResponseHeaders = parseXhrResponseHeaders;
exports.serializeFormData = serializeFormData;
//# sourceMappingURL=networkUtils.js.map
