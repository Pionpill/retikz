import type { z } from 'zod';

import type { GraphThemeToken } from './constants';
import type {
  GraphEntityAppearanceTokenOverridesSchema,
  GraphEntityThemeTokenRuleSchema,
  GraphEntityThemeTokenRulesSchema,
  GraphEntityThemeTokenSelectorSchema,
  GraphThemeTokenOverridesSchema,
  GraphThemeTokenResolutionSchema,
} from './schema';

/** Graph Theme token 的稳定 key */
export type GraphThemeTokenValue = (typeof GraphThemeToken)[keyof typeof GraphThemeToken];

/** Graph Theme token 的稀疏覆盖 IR */
export type IRGraphThemeTokenOverrides = z.infer<typeof GraphThemeTokenOverridesSchema>;

/** Entity variant 解析产生的稀疏外观 token 覆盖 IR */
export type IRGraphEntityAppearanceTokenOverrides = z.infer<typeof GraphEntityAppearanceTokenOverridesSchema>;

/** Graph Theme token 的完整解析结果 IR */
export type IRGraphThemeTokenResolution = z.infer<typeof GraphThemeTokenResolutionSchema>;

/** 按 Entity role 和 variant 筛选主题 token 的 selector IR */
export type IRGraphEntityThemeTokenSelector = z.infer<typeof GraphEntityThemeTokenSelectorSchema>;

/** 一条 Entity 主题 token 规则 IR */
export type IRGraphEntityThemeTokenRule = z.infer<typeof GraphEntityThemeTokenRuleSchema>;

/** Entity 主题 token 规则列表 IR */
export type IRGraphEntityThemeTokenRules = z.infer<typeof GraphEntityThemeTokenRulesSchema>;
