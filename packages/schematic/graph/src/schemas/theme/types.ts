import type { infer as ZodInfer } from 'zod';

import type {
  GraphEntityAppearanceTokenOverridesSchema,
  GraphEntityThemeRuleSchema,
  GraphEntityThemeSelectorSchema,
  GraphRelationThemeRuleSchema,
  GraphRelationThemeSelectorSchema,
  GraphThemeLayerSchema,
  GraphThemeRuleSchema,
} from './schema';

/** Entity 非结构化 appearance 字段的非空覆盖集合 */
export type IRGraphEntityAppearanceTokenOverrides = ZodInfer<typeof GraphEntityAppearanceTokenOverridesSchema>;

/** 匹配 Entity Canonical 语义的 Theme selector */
export type IRGraphEntityThemeSelector = ZodInfer<typeof GraphEntityThemeSelectorSchema>;

/** Entity appearance rule */
export type IRGraphEntityThemeRule = ZodInfer<typeof GraphEntityThemeRuleSchema>;

/** 匹配 Relation Canonical 语义与方向的 Theme selector */
export type IRGraphRelationThemeSelector = ZodInfer<typeof GraphRelationThemeSelectorSchema>;

/** Relation appearance rule */
export type IRGraphRelationThemeRule = ZodInfer<typeof GraphRelationThemeRuleSchema>;

/** Graph Theme rule 判别联合 */
export type IRGraphThemeRule = ZodInfer<typeof GraphThemeRuleSchema>;

/** 至少包含一条 appearance rule 的 Graph-local Theme layer */
export type IRGraphThemeLayer = ZodInfer<typeof GraphThemeLayerSchema>;
