/**
 * Checks whether given value's type is a React `SyntheticEvent`.
 *
 * The check is structural: SyntheticEvent doesn't expose a stable constructor we can
 * use across React versions / module duplicates, so we look for the small surface
 * (`nativeEvent`, `preventDefault`, `stopPropagation`) that every SyntheticEvent has
 * and that's unusual for plain objects to all have at once.
 */
export declare function isSyntheticEvent(wat: unknown): boolean;
//# sourceMappingURL=isSyntheticEvent.d.ts.map