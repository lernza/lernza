import type { Client, Span, SpanAttributes } from '@sentry/core';
import type { WebVitalReportEvent } from './utils';
import type { PerformanceEventTiming } from './instrument';
export interface LayoutShift extends PerformanceEntry {
    value: number;
    sources: Array<{
        node: Node | null;
    }>;
    hadRecentInput: boolean;
}
export interface LargestContentfulPaint extends PerformanceEntry {
    readonly renderTime: DOMHighResTimeStamp;
    readonly loadTime: DOMHighResTimeStamp;
    readonly size: number;
    readonly id: string;
    readonly url: string;
    readonly element: Element | null;
}
interface WebVitalSpanOptions {
    name: string;
    op: string;
    origin: string;
    metricName: 'lcp' | 'cls' | 'inp';
    value: number;
    attributes?: SpanAttributes;
    parentSpan?: Span;
    reportEvent?: WebVitalReportEvent;
    startTime: number;
    endTime?: number;
}
/**
 * Emits a web vital span that flows through the span streaming pipeline.
 */
export declare function _emitWebVitalSpan(options: WebVitalSpanOptions): void;
/**
 * Tracks LCP as a streamed span.
 */
export declare function trackLcpAsSpan(client: Client): void;
/**
 * Exported only for testing.
 */
export declare function _sendLcpSpan(lcpValue: number, entry: LargestContentfulPaint | undefined, pageloadSpan?: Span, reportEvent?: WebVitalReportEvent): void;
/**
 * Tracks CLS as a streamed span.
 */
export declare function trackClsAsSpan(client: Client): void;
/**
 * Exported only for testing.
 */
export declare function _sendClsSpan(clsValue: number, entry: LayoutShift | undefined, pageloadSpan?: Span, reportEvent?: WebVitalReportEvent): void;
/**
 * Tracks INP as a streamed span.
 *
 * This mirrors the standalone INP tracking logic (`startTrackingINP`) but emits
 * spans through the streaming pipeline instead of as standalone spans.
 * Requires `registerInpInteractionListener()` to be called separately for
 * cached element names and root spans per interaction.
 */
export declare function trackInpAsSpan(): void;
/**
 * Exported only for testing.
 */
export declare function _sendInpSpan(inpValue: number, entry: PerformanceEventTiming): void;
export {};
//# sourceMappingURL=webVitalSpans.d.ts.map