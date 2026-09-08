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

/** Group / Block defaults 的正式 Surface 根片段 */
export type IRGraphSurfaceDefaults = ZodInfer<typeof GraphSurfaceDefaultsSchema>;

/** Graph defaults 的正式 Source fragments */
export type IRGraphDefaults = ZodInfer<typeof GraphDefaultsSchema>;

/** Entity Theme/Graph semantic selector */
export type IRGraphEntityThemeSelector = ZodInfer<typeof GraphEntityThemeSelectorSchema>;

/** Entity ordered Source rule */
export type IRGraphEntityRule = ZodInfer<typeof GraphEntityRuleSchema>;

/** Relation Theme/Graph semantic selector */
export type IRGraphRelationThemeSelector = ZodInfer<typeof GraphRelationThemeSelectorSchema>;

/** Relation ordered Source rule */
export type IRGraphRelationRule = ZodInfer<typeof GraphRelationRuleSchema>;

/** Graph ordered Source rule */
export type IRGraphRule = ZodInfer<typeof GraphRuleSchema>;
