/**
 * Browser-specific contributions to `normalize()`'s `stringifyValue`. Plug into
 * `setNormalizeStringifier` from the browser SDK so DOM values get a useful string
 * representation without forcing core to carry the DOM-specific code.
 *
 * Handles:
 * - `window` → `[Window]`
 * - `document` → `[Document]`
 * - `HTMLElement` subclasses → `[HTMLElement: <css-selector-path>]` (via `htmlTreeAsString`)
 *
 * Vue ViewModels and React SyntheticEvents are not handled here — the Vue and React
 * SDKs wrap this function in their `init` and add their own checks on top.
 */
export declare function normalizeStringifyValue(value: Exclude<unknown, string | number | boolean | null>): string | undefined;
//# sourceMappingURL=normalizeStringifyValue.d.ts.map