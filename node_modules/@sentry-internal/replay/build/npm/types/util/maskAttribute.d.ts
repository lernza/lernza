import type { getPrivacyOptions } from './getPrivacyOptions';
interface MaskAttributeParams {
    maskAttributes: string[];
    maskAllText: boolean;
    privacyOptions: ReturnType<typeof getPrivacyOptions>;
    key: string;
    value: string;
    el: HTMLElement;
}
/**
 * Masks an attribute if necessary, otherwise return attribute value as-is.
 * Keys listed in `maskAttributes` are masked even when `maskAllText` is false;
 * masking `value` on submit/button inputs without listing `value` still requires `maskAllText`.
 */
export declare function maskAttribute({ el, key, maskAttributes, maskAllText, privacyOptions, value, }: MaskAttributeParams): string;
export {};
//# sourceMappingURL=maskAttribute.d.ts.map