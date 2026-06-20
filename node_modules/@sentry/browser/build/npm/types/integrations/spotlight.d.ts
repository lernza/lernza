export type SpotlightConnectionOptions = {
    /**
     * Set this if the Spotlight Sidecar is not running on localhost:8969
     * By default, the Url is set to http://localhost:8969/stream
     */
    sidecarUrl?: string;
};
export declare const INTEGRATION_NAME = "SpotlightBrowser";
export declare const SPOTLIGHT_IGNORE_SPANS: {
    op: string;
    name: string;
}[];
/**
 * Use this integration to send errors and transactions to Spotlight.
 *
 * Learn more about spotlight at https://spotlightjs.com
 */
export declare const spotlightBrowserIntegration: (options?: Partial<SpotlightConnectionOptions> | undefined) => import("@sentry/core").Integration;
//# sourceMappingURL=spotlight.d.ts.map