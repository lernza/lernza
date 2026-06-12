import { GLOBAL_OBJ, spanToJSON, debug, getClient, forEachEnvelopeItem, uuid4, timestampInSeconds, DEFAULT_ENVIRONMENT, browserPerformanceTimeOrigin, getDebugImagesForResources } from '@sentry/core/browser';
import { DEBUG_BUILD } from '../debug-build.js';
import { WINDOW } from '../helpers.js';

const MS_TO_NS = 1e6;
const isMainThread = "window" in GLOBAL_OBJ && GLOBAL_OBJ.window === GLOBAL_OBJ && typeof importScripts === "undefined";
const PROFILER_THREAD_ID_STRING = String(0);
const PROFILER_THREAD_NAME = isMainThread ? "main" : "worker";
const navigator = WINDOW.navigator;
let OS_PLATFORM = "";
let OS_PLATFORM_VERSION = "";
let OS_ARCH = "";
let OS_BROWSER = navigator?.userAgent || "";
let OS_MODEL = "";
const OS_LOCALE = navigator?.language || navigator?.languages?.[0] || "";
function isUserAgentData(data) {
  return typeof data === "object" && data !== null && "getHighEntropyValues" in data;
}
const userAgentData = navigator?.userAgentData;
if (isUserAgentData(userAgentData)) {
  userAgentData.getHighEntropyValues(["architecture", "model", "platform", "platformVersion", "fullVersionList"]).then((ua) => {
    OS_PLATFORM = ua.platform || "";
    OS_ARCH = ua.architecture || "";
    OS_MODEL = ua.model || "";
    OS_PLATFORM_VERSION = ua.platformVersion || "";
    if (ua.fullVersionList?.length) {
      const firstUa = ua.fullVersionList[ua.fullVersionList.length - 1];
      OS_BROWSER = `${firstUa.brand} ${firstUa.version}`;
    }
  }).catch((e) => void 0);
}
function isProcessedJSSelfProfile(profile) {
  return !("thread_metadata" in profile);
}
function enrichWithThreadInformation(profile) {
  if (!isProcessedJSSelfProfile(profile)) {
    return profile;
  }
  return convertJSSelfProfileToSampledFormat(profile);
}
function getTraceId(event) {
  const traceId = event.contexts?.trace?.trace_id;
  if (typeof traceId === "string" && traceId.length !== 32) {
    if (DEBUG_BUILD) {
      debug.log(`[Profiling] Invalid traceId: ${traceId} on profiled event`);
    }
  }
  if (typeof traceId !== "string") {
    return "";
  }
  return traceId;
}
function createProfilePayload(profile_id, start_timestamp, processed_profile, event) {
  if (event.type !== "transaction") {
    throw new TypeError("Profiling events may only be attached to transactions, this should never occur.");
  }
  if (processed_profile === void 0 || processed_profile === null) {
    throw new TypeError(
      `Cannot construct profiling event envelope without a valid profile. Got ${processed_profile} instead.`
    );
  }
  const traceId = getTraceId(event);
  const enrichedThreadProfile = enrichWithThreadInformation(processed_profile);
  const transactionStartMs = start_timestamp ? start_timestamp : typeof event.start_timestamp === "number" ? event.start_timestamp * 1e3 : timestampInSeconds() * 1e3;
  const transactionEndMs = typeof event.timestamp === "number" ? event.timestamp * 1e3 : timestampInSeconds() * 1e3;
  const profile = {
    event_id: profile_id,
    timestamp: new Date(transactionStartMs).toISOString(),
    platform: "javascript",
    version: "1",
    release: event.release || "",
    environment: event.environment || DEFAULT_ENVIRONMENT,
    runtime: {
      name: "javascript",
      version: WINDOW.navigator.userAgent
    },
    os: {
      name: OS_PLATFORM,
      version: OS_PLATFORM_VERSION,
      build_number: OS_BROWSER
    },
    device: {
      locale: OS_LOCALE,
      model: OS_MODEL,
      manufacturer: OS_BROWSER,
      architecture: OS_ARCH,
      is_emulator: false
    },
    debug_meta: {
      images: applyDebugMetadata(processed_profile.resources)
    },
    profile: enrichedThreadProfile,
    transactions: [
      {
        name: event.transaction || "",
        id: event.event_id || uuid4(),
        trace_id: traceId,
        active_thread_id: PROFILER_THREAD_ID_STRING,
        relative_start_ns: "0",
        relative_end_ns: ((transactionEndMs - transactionStartMs) * 1e6).toFixed(0)
      }
    ]
  };
  return profile;
}
function createProfileChunkPayload(jsSelfProfile, client, profilerId) {
  if (jsSelfProfile == null) {
    throw new TypeError(
      `Cannot construct profiling event envelope without a valid profile. Got ${jsSelfProfile} instead.`
    );
  }
  const continuousProfile = convertToContinuousProfile(jsSelfProfile);
  const options = client.getOptions();
  const sdk = client.getSdkMetadata?.()?.sdk;
  return {
    chunk_id: uuid4(),
    client_sdk: {
      name: sdk?.name ?? "sentry.javascript.browser",
      version: sdk?.version ?? "0.0.0"
    },
    profiler_id: profilerId || uuid4(),
    platform: "javascript",
    version: "2",
    release: options.release ?? "",
    environment: options.environment ?? "production",
    debug_meta: {
      // function name obfuscation
      images: applyDebugMetadata(jsSelfProfile.resources)
    },
    profile: continuousProfile
  };
}
function validateProfileChunk(chunk) {
  try {
    if (!chunk || typeof chunk !== "object") {
      return { reason: "chunk is not an object" };
    }
    const isHex32 = (val) => typeof val === "string" && /^[a-f0-9]{32}$/.test(val);
    if (!isHex32(chunk.profiler_id)) {
      return { reason: "missing or invalid profiler_id" };
    }
    if (!isHex32(chunk.chunk_id)) {
      return { reason: "missing or invalid chunk_id" };
    }
    if (!chunk.client_sdk) {
      return { reason: "missing client_sdk metadata" };
    }
    const profile = chunk.profile;
    if (!profile) {
      return { reason: "missing profile data" };
    }
    if (!Array.isArray(profile.frames) || !profile.frames.length) {
      return { reason: "profile has no frames" };
    }
    if (!Array.isArray(profile.stacks) || !profile.stacks.length) {
      return { reason: "profile has no stacks" };
    }
    if (!Array.isArray(profile.samples) || !profile.samples.length) {
      return { reason: "profile has no samples" };
    }
    return { valid: true };
  } catch (e) {
    return { reason: `unknown validation error: ${e}` };
  }
}
function convertToContinuousProfile(input) {
  const frames = [];
  for (let i = 0; i < input.frames.length; i++) {
    const frame = input.frames[i];
    if (!frame) {
      continue;
    }
    frames[i] = {
      function: frame.name,
      abs_path: typeof frame.resourceId === "number" ? input.resources[frame.resourceId] : void 0,
      lineno: frame.line,
      colno: frame.column
    };
  }
  const stacks = [];
  for (let i = 0; i < input.stacks.length; i++) {
    const stackHead = input.stacks[i];
    if (!stackHead) {
      continue;
    }
    const list = [];
    let current = stackHead;
    while (current) {
      list.push(current.frameId);
      current = current.parentId === void 0 ? void 0 : input.stacks[current.parentId];
    }
    stacks[i] = list;
  }
  const perfOrigin = browserPerformanceTimeOrigin();
  const origin = typeof performance.timeOrigin === "number" ? performance.timeOrigin : perfOrigin || 0;
  const adjustForOriginChange = origin - (perfOrigin || origin);
  const samples = [];
  for (let i = 0; i < input.samples.length; i++) {
    const sample = input.samples[i];
    if (!sample) {
      continue;
    }
    const timestampSeconds = (origin + (sample.timestamp - adjustForOriginChange)) / 1e3;
    samples[i] = {
      stack_id: sample.stackId ?? 0,
      thread_id: PROFILER_THREAD_ID_STRING,
      timestamp: timestampSeconds
    };
  }
  return {
    frames,
    stacks,
    samples,
    thread_metadata: { [PROFILER_THREAD_ID_STRING]: { name: PROFILER_THREAD_NAME } }
  };
}
function isAutomatedPageLoadSpan(span) {
  return spanToJSON(span).op === "pageload";
}
function convertJSSelfProfileToSampledFormat(input) {
  let EMPTY_STACK_ID = void 0;
  let STACK_ID = 0;
  const profile = {
    samples: [],
    stacks: [],
    frames: [],
    thread_metadata: {
      [PROFILER_THREAD_ID_STRING]: { name: PROFILER_THREAD_NAME }
    }
  };
  const firstSample = input.samples[0];
  if (!firstSample) {
    return profile;
  }
  const start = firstSample.timestamp;
  const perfOrigin = browserPerformanceTimeOrigin();
  const origin = typeof performance.timeOrigin === "number" ? performance.timeOrigin : perfOrigin || 0;
  const adjustForOriginChange = origin - (perfOrigin || origin);
  input.samples.forEach((jsSample, i) => {
    if (jsSample.stackId === void 0) {
      if (EMPTY_STACK_ID === void 0) {
        EMPTY_STACK_ID = STACK_ID;
        profile.stacks[EMPTY_STACK_ID] = [];
        STACK_ID++;
      }
      profile["samples"][i] = {
        // convert ms timestamp to ns
        elapsed_since_start_ns: ((jsSample.timestamp + adjustForOriginChange - start) * MS_TO_NS).toFixed(0),
        stack_id: EMPTY_STACK_ID,
        thread_id: PROFILER_THREAD_ID_STRING
      };
      return;
    }
    let stackTop = input.stacks[jsSample.stackId];
    const stack = [];
    while (stackTop) {
      stack.push(stackTop.frameId);
      const frame = input.frames[stackTop.frameId];
      if (frame && profile.frames[stackTop.frameId] === void 0) {
        profile.frames[stackTop.frameId] = {
          function: frame.name,
          abs_path: typeof frame.resourceId === "number" ? input.resources[frame.resourceId] : void 0,
          lineno: frame.line,
          colno: frame.column
        };
      }
      stackTop = stackTop.parentId === void 0 ? void 0 : input.stacks[stackTop.parentId];
    }
    const sample = {
      // convert ms timestamp to ns
      elapsed_since_start_ns: ((jsSample.timestamp + adjustForOriginChange - start) * MS_TO_NS).toFixed(0),
      stack_id: STACK_ID,
      thread_id: PROFILER_THREAD_ID_STRING
    };
    profile["stacks"][STACK_ID] = stack;
    profile["samples"][i] = sample;
    STACK_ID++;
  });
  return profile;
}
function addProfilesToEnvelope(envelope, profiles) {
  if (!profiles.length) {
    return envelope;
  }
  for (const profile of profiles) {
    envelope[1].push([{ type: "profile" }, profile]);
  }
  return envelope;
}
function findProfiledTransactionsFromEnvelope(envelope) {
  const events = [];
  forEachEnvelopeItem(envelope, (item, type) => {
    if (type !== "transaction") {
      return;
    }
    for (let j = 1; j < item.length; j++) {
      const event = item[j];
      if (event?.contexts?.profile?.profile_id) {
        events.push(item[j]);
      }
    }
  });
  return events;
}
function applyDebugMetadata(resource_paths) {
  const client = getClient();
  const options = client?.getOptions();
  const stackParser = options?.stackParser;
  if (!stackParser) {
    return [];
  }
  return getDebugImagesForResources(stackParser, resource_paths);
}
function isValidSampleRate(rate) {
  if (typeof rate !== "number" && typeof rate !== "boolean" || typeof rate === "number" && isNaN(rate)) {
    DEBUG_BUILD && debug.warn(
      `[Profiling] Invalid sample rate. Sample rate must be a boolean or a number between 0 and 1. Got ${JSON.stringify(
        rate
      )} of type ${JSON.stringify(typeof rate)}.`
    );
    return false;
  }
  if (rate === true || rate === false) {
    return true;
  }
  if (rate < 0 || rate > 1) {
    DEBUG_BUILD && debug.warn(`[Profiling] Invalid sample rate. Sample rate must be between 0 and 1. Got ${rate}.`);
    return false;
  }
  return true;
}
function isValidProfile(profile) {
  if (profile.samples.length < 2) {
    if (DEBUG_BUILD) {
      debug.log("[Profiling] Discarding profile because it contains less than 2 samples");
    }
    return false;
  }
  if (!profile.frames.length) {
    if (DEBUG_BUILD) {
      debug.log("[Profiling] Discarding profile because it contains no frames");
    }
    return false;
  }
  return true;
}
let PROFILING_CONSTRUCTOR_FAILED = false;
const MAX_PROFILE_DURATION_MS = 3e4;
function isJSProfilerSupported(maybeProfiler) {
  return typeof maybeProfiler === "function";
}
function startJSSelfProfile() {
  const JSProfilerConstructor = WINDOW.Profiler;
  if (!isJSProfilerSupported(JSProfilerConstructor)) {
    if (DEBUG_BUILD) {
      debug.log("[Profiling] Profiling is not supported by this browser, Profiler interface missing on window object.");
    }
    return;
  }
  const samplingIntervalMS = 10;
  const maxSamples = Math.floor(MAX_PROFILE_DURATION_MS / samplingIntervalMS);
  try {
    return new JSProfilerConstructor({ sampleInterval: samplingIntervalMS, maxBufferSize: maxSamples });
  } catch (_e) {
    if (DEBUG_BUILD) {
      debug.log(
        "[Profiling] Failed to initialize the Profiling constructor, this is likely due to a missing 'Document-Policy': 'js-profiling' header."
      );
      debug.log("[Profiling] Disabling profiling for current user session.");
    }
    PROFILING_CONSTRUCTOR_FAILED = true;
  }
  return;
}
function shouldProfileSpanLegacy(span) {
  if (PROFILING_CONSTRUCTOR_FAILED) {
    if (DEBUG_BUILD) {
      debug.log("[Profiling] Profiling has been disabled for the duration of the current user session.");
    }
    return false;
  }
  if (!span.isRecording()) {
    DEBUG_BUILD && debug.log("[Profiling] Discarding profile because root span was not sampled.");
    return false;
  }
  const client = getClient();
  const options = client?.getOptions();
  if (!options) {
    DEBUG_BUILD && debug.log("[Profiling] Profiling disabled, no options found.");
    return false;
  }
  const profilesSampleRate = options.profilesSampleRate;
  if (!isValidSampleRate(profilesSampleRate)) {
    DEBUG_BUILD && debug.warn("[Profiling] Discarding profile because of invalid sample rate.");
    return false;
  }
  if (!profilesSampleRate) {
    DEBUG_BUILD && debug.log(
      "[Profiling] Discarding profile because a negative sampling decision was inherited or profileSampleRate is set to 0"
    );
    return false;
  }
  const sampled = profilesSampleRate === true ? true : Math.random() < profilesSampleRate;
  if (!sampled) {
    DEBUG_BUILD && debug.log(
      `[Profiling] Discarding profile because it's not included in the random sample (sampling rate = ${Number(
        profilesSampleRate
      )})`
    );
    return false;
  }
  return true;
}
function shouldProfileSession(options) {
  if (PROFILING_CONSTRUCTOR_FAILED) {
    if (DEBUG_BUILD) {
      debug.log(
        "[Profiling] Profiling has been disabled for the duration of the current user session as the JS Profiler could not be started."
      );
    }
    return false;
  }
  if (options.profileLifecycle !== "trace" && options.profileLifecycle !== "manual") {
    DEBUG_BUILD && debug.warn("[Profiling] Session not sampled. Invalid `profileLifecycle` option.");
    return false;
  }
  const profileSessionSampleRate = options.profileSessionSampleRate;
  if (!isValidSampleRate(profileSessionSampleRate)) {
    DEBUG_BUILD && debug.warn("[Profiling] Discarding profile because of invalid profileSessionSampleRate.");
    return false;
  }
  if (!profileSessionSampleRate) {
    DEBUG_BUILD && debug.log("[Profiling] Discarding profile because profileSessionSampleRate is not defined or set to 0");
    return false;
  }
  return Math.random() <= profileSessionSampleRate;
}
function hasLegacyProfiling(options) {
  return typeof options.profilesSampleRate !== "undefined";
}
function createProfilingEvent(profile_id, start_timestamp, profile, event) {
  if (!isValidProfile(profile)) {
    return null;
  }
  return createProfilePayload(profile_id, start_timestamp, profile, event);
}
const PROFILE_MAP = /* @__PURE__ */ new Map();
function getActiveProfilesCount() {
  return PROFILE_MAP.size;
}
function takeProfileFromGlobalCache(profile_id) {
  const profile = PROFILE_MAP.get(profile_id);
  if (profile) {
    PROFILE_MAP.delete(profile_id);
  }
  return profile;
}
function addProfileToGlobalCache(profile_id, profile) {
  PROFILE_MAP.set(profile_id, profile);
  if (PROFILE_MAP.size > 30) {
    const last = PROFILE_MAP.keys().next().value;
    if (last !== void 0) {
      PROFILE_MAP.delete(last);
    }
  }
}
const PROFILED_ROOT_SPANS = /* @__PURE__ */ new WeakSet();
function setThreadAttributes(span) {
  span.setAttribute("thread.id", PROFILER_THREAD_ID_STRING);
  span.setAttribute("thread.name", PROFILER_THREAD_NAME);
}

export { MAX_PROFILE_DURATION_MS, PROFILED_ROOT_SPANS, PROFILER_THREAD_ID_STRING, PROFILER_THREAD_NAME, addProfileToGlobalCache, addProfilesToEnvelope, applyDebugMetadata, convertJSSelfProfileToSampledFormat, createProfileChunkPayload, createProfilePayload, createProfilingEvent, enrichWithThreadInformation, findProfiledTransactionsFromEnvelope, getActiveProfilesCount, hasLegacyProfiling, isAutomatedPageLoadSpan, isValidSampleRate, setThreadAttributes, shouldProfileSession, shouldProfileSpanLegacy, startJSSelfProfile, takeProfileFromGlobalCache, validateProfileChunk };
//# sourceMappingURL=utils.js.map
