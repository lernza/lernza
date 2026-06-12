import type { Span } from '@sentry/core';
import type { InstrumentationHandlerCallback } from './instrument';
interface InteractionContext {
    span: Span | undefined;
    elementName: string;
}
/**
 * 60 seconds is the maximum for a plausible INP value
 * (source: Me)
 */
export declare const MAX_PLAUSIBLE_INP_DURATION = 60;
/**
 * Start tracking INP webvital events.
 */
export declare function startTrackingINP(): () => void;
export declare const INP_ENTRY_MAP: Record<string, 'click' | 'hover' | 'drag' | 'press'>;
/** Starts tracking the Interaction to Next Paint on the current page. #
 * exported only for testing
 */
export declare function _trackINP(): () => void;
/**
 * exported only for testing
 */
export declare const _onInp: InstrumentationHandlerCallback;
/**
 * Look up a cached interaction context (element name + root span) by interactionId.
 * Returns undefined if no context was cached for this interaction.
 */
export declare function getCachedInteractionContext(interactionId: number | undefined): InteractionContext | undefined;
/**
 * Register a listener to cache route information for INP interactions.
 */
export declare function registerInpInteractionListener(): void;
export {};
//# sourceMappingURL=inp.d.ts.map