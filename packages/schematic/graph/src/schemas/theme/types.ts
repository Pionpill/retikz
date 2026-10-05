import type { infer as ZodInfer } from 'zod';

import type {
  GraphDefaultsSchema,
  GraphEntityDefaultsLayoutSchema,
  GraphEntityDefaultsSchema,
  GraphEntityDefaultsStyleSchema,
  GraphEntityRuleSchema,
  GraphEntityRuleStyleSchema,
  GraphEntityThemeSelectorSchema,
  GraphRelationDefaultsSchema,
  GraphRelationDefaultsStyleSchema,
  GraphRelationRuleSchema,
  GraphRelationRuleStructureSchema,
  GraphRelationThemeSelectorSchema,
  GraphRuleSchema,
  GraphSurfaceDefaultsSchema,
} from './schema';

/** Entity defaults 的正式 Source style 片段 */
export type IRGraphEntityDefaultsStyle = ZodInfer<typeof GraphEntityDefaultsStyleSchema>;

/** Entity rules 的正式 Source style 片段 */
export type IRGraphEntityRuleStyle = ZodInfer<typeof GraphEntityRuleStyleSchema>;

/** Entity defaults 的正式 Source layout 片段 */
export type IRGraphEntityDefaultsLayout = ZodInfer<typeof GraphEntityDefaultsLayoutSchema>;

/** Entity defaults 的正式 Source 片段 */
export type IRGraphEntityDefaults = ZodInfer<typeof GraphEntityDefaultsSchema>;

/** Relation defaults 的正式 Source 片段 */
export type IRGraphRelationDefaults = ZodInfer<typeof GraphRelationDefaultsSchema>;

/** Relation defaults/rules 的正式 Source path style 片段 */
export type IRGraphRelationDefaultsStyle = ZodInfer<typeof GraphRelationDefaultsStyleSchema>;

/** Relation rules 可覆盖的受限结构片段 */
export type IRGraphRelationRuleStructure = ZodInfer<typeof GraphRelationRuleStructureSchema>;

/** Group / Block defaults 的正式 Surface 根片段 */
export type IRGraphSurfaceDefaults = ZodInfer<typeof GraphSurfaceDefaultsSchema>;

/** Graph defaults 的正式 Source fragments */
export type IRGraphDefaults = ZodInfer<typeof GraphDefaultsSchema>;

/** 供主题或图规则匹配实体的语义选择器 */
export type IRGraphEntityThemeSelector = ZodInfer<typeof GraphEntityThemeSelectorSchema>;

/** 按顺序应用的实体输入规则 */
export type IRGraphEntityRule = ZodInfer<typeof GraphEntityRuleSchema>;

/** 供主题或图规则匹配关系的语义选择器 */
export type IRGraphRelationThemeSelector = ZodInfer<typeof GraphRelationThemeSelectorSchema>;

/** 按顺序应用的关系输入规则 */
export type IRGraphRelationRule = ZodInfer<typeof GraphRelationRuleSchema>;

/** 按顺序应用的图输入规则 */
export type IRGraphRule = ZodInfer<typeof GraphRuleSchema>;
