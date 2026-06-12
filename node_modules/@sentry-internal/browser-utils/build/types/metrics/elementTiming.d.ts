/**
 * Captures [Element Timing API](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceElementTiming)
 * data as Sentry metrics.
 *
 * To mark an element for tracking, add the `elementtiming` HTML attribute:
 * ```html
 * <img src="hero.jpg" elementtiming="hero-image" />
 * <p elementtiming="hero-text">Welcome!</p>
 * ```
 *
 * This emits `ui.element.render_time` and `ui.element.load_time` (for images)
 * as distribution metrics, tagged with the element's identifier and paint type.
 */
export declare const elementTimingIntegration: () => import("@sentry/core").Integration;
/**
 * @deprecated Use `elementTimingIntegration` instead. This function is a no-op and will be removed in a future version.
 */
export declare function startTrackingElementTiming(): () => void;
//# sourceMappingURL=elementTiming.d.ts.map