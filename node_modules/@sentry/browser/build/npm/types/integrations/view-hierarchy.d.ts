import type { Event, EventHint } from '@sentry/core/browser';
interface OnElementArgs {
    /**
     * The element being processed.
     */
    element: HTMLElement;
    /**
     * Lowercase tag name of the element.
     */
    tagName: string;
    /**
     * The component name of the element.
     */
    componentName?: string;
    /**
     * The current depth of the element in the view hierarchy. The root element will have a depth of 0.
     *
     * This allows you to limit the traversal depth for large DOM trees.
     */
    depth?: number;
}
interface Options {
    /**
     * Whether to attach the view hierarchy to the event.
     *
     * Default: Always attach.
     */
    shouldAttach?: (event: Event, hint: EventHint) => boolean;
    /**
     * A function that returns the root element to start walking the DOM from.
     *
     * Default: `window.document.body`
     */
    rootElement?: () => HTMLElement | undefined;
    /**
     * Called for each HTMLElement as we walk the DOM.
     *
     * Return an object to include the element with any additional properties.
     * Return `skip` to exclude the element and its children.
     * Return `children` to skip the element but include its children.
     */
    onElement?: (prop: OnElementArgs) => Record<string, string | number | boolean> | 'skip' | 'children';
}
/**
 * An integration to include a view hierarchy attachment which contains the DOM.
 */
export declare const viewHierarchyIntegration: (options?: Options | undefined) => import("@sentry/core").Integration;
export {};
//# sourceMappingURL=view-hierarchy.d.ts.map