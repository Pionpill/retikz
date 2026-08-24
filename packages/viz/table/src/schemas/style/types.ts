import type { ValueOf } from '@retikz/foundation';
import type { infer as ZodInfer } from 'zod';

import type { TableThemeToken } from './constants';
import type {
  TableThemeStyleTokenOverridesSchema,
  TableThemeTokenBorderSchema,
  TableThemeTokenKeySchema,
  TableThemeTokenMapSchema,
  TableThemeTokenOverridesSchema,
  TableThemeTokenPresetMapSchema,
} from './schema';

/** Table 主题 token key */
export type TableThemeTokenKey = ZodInfer<typeof TableThemeTokenKeySchema>;

/** Table 主题 token 中的 border 值 */
export type IRTableThemeTokenBorder = ZodInfer<typeof TableThemeTokenBorderSchema>;

/** Table root 或 inherited Theme 的 partial token overlay */
export type IRTableThemeTokenOverrides = ZodInfer<typeof TableThemeTokenOverridesSchema>;

/** 完整 19 项 Table theme token map */
export type TableThemeTokenMap = ZodInfer<typeof TableThemeTokenMapSchema>;

/** 不含 shared categorical projection 的 Table preset map */
export type TableThemeTokenPresetMap = ZodInfer<typeof TableThemeTokenPresetMapSchema>;

/** 自定义 Table Theme style 相对默认 preset 的稀疏 token 覆盖 */
export type TableThemeStyleTokenOverrides = ZodInfer<typeof TableThemeStyleTokenOverridesSchema>;

/** Table theme token 的 canonical key value */
export type TableThemeTokenValue = ValueOf<typeof TableThemeToken>;
