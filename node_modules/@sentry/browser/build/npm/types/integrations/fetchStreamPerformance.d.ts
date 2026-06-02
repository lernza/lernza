/**
 * Tracks streamed fetch response bodies by creating an `http.client.stream` sibling span.
 *
 * The regular `http.client` span ends when response headers arrive. This integration adds
 * a span that starts at header arrival and ends when the body fully resolves:
 *
 * ```
 * --------- pageload --------------------------------
 *     -- http.client --
 *                       -- http.client.stream -------
 * ```
 */
export declare const fetchStreamPerformanceIntegration: () => import("@sentry/core").Integration;
//# sourceMappingURL=fetchStreamPerformance.d.ts.map