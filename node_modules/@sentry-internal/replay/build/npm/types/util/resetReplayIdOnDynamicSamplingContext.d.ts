/**
 * Reset the `replay_id` field on the DSC.
 */
export declare function resetReplayIdOnDynamicSamplingContext(): void;
/**
 * Set the `replay_id` field on the cached DSC.
 * This is needed after a session refresh because the cached DSC on the scope
 * (set by browserTracingIntegration when the idle span ended) persists across
 * session boundaries. Without updating it, the new session's replay_id would
 * never appear in DSC since `getDynamicSamplingContextFromClient` (and its
 * `createDsc` hook) is not called when a cached DSC already exists.
 */
export declare function setReplayIdOnDynamicSamplingContext(replayId: string): void;
//# sourceMappingURL=resetReplayIdOnDynamicSamplingContext.d.ts.map