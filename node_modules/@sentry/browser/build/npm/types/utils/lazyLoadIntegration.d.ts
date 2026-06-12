import type { IntegrationFn } from '@sentry/core/browser';
declare const LAZY_LOADABLE_NAMES: readonly ["replayIntegration", "replayCanvasIntegration", "feedbackIntegration", "feedbackModalIntegration", "feedbackScreenshotIntegration", "captureConsoleIntegration", "contextLinesIntegration", "linkedErrorsIntegration", "dedupeIntegration", "extraErrorDataIntegration", "graphqlClientIntegration", "httpClientIntegration", "reportingObserverIntegration", "rewriteFramesIntegration", "browserProfilingIntegration", "moduleMetadataIntegration", "instrumentAnthropicAiClient", "instrumentOpenAiClient", "instrumentGoogleGenAIClient", "instrumentLangGraph", "createLangChainCallbackHandler", "instrumentLangChainEmbeddings"];
type ElementOf<T extends readonly unknown[]> = T[number];
type LazyLoadableIntegrationName = ElementOf<typeof LAZY_LOADABLE_NAMES>;
/**
 * Lazy load an integration from the CDN.
 * Rejects if the integration cannot be loaded.
 */
export declare function lazyLoadIntegration(name: LazyLoadableIntegrationName, scriptNonce?: string): Promise<IntegrationFn>;
export {};
//# sourceMappingURL=lazyLoadIntegration.d.ts.map