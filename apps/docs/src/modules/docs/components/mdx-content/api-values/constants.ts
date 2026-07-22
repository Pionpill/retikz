import { WebFontSizePreset } from '@retikz/core';

/** API 值集合注册项 */
export type ApiValueRegistryEntry = {
  /** 按公开常量声明顺序展示的值 */
  values: ReadonlyArray<string>;
};

/** MDX 可引用的公开 API 值集合 */
export const API_VALUE_REGISTRY = {
  WebFontSizePreset: {
    values: Object.values(WebFontSizePreset),
  },
} as const satisfies Record<string, ApiValueRegistryEntry>;
