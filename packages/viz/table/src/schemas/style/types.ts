import type { ValueOf } from '@retikz/foundation';
import type { z } from 'zod';

import type { TableThemeToken } from './constants';
import type {
  TableThemeTokenBorderSchema,
  TableThemeTokenKeySchema,
  TableThemeTokenMapSchema,
  TableThemeTokenOverridesSchema,
  TableThemeTokenPresetMapSchema,
} from './schema';

/** Table 主题 token key */
export type TableThemeTokenKey = z.infer<typeof TableThemeTokenKeySchema>;

/** Table 主题 token 中的 border 值 */
export type IRTableThemeTokenBorder = z.infer<typeof TableThemeTokenBorderSchema>;

/** Table root 或 inherited Theme 的 partial token overlay */
export type IRTableThemeTokenOverrides = z.infer<typeof TableThemeTokenOverridesSchema>;

/** 完整 19 项 Table theme token map */
export type TableThemeTokenMap = z.infer<typeof TableThemeTokenMapSchema>;

/** 不含 shared categorical projection 的 Table preset map */
export type TableThemeTokenPresetMap = z.infer<typeof TableThemeTokenPresetMapSchema>;

/** Table theme token 的 canonical key value */
export type TableThemeTokenValue = ValueOf<typeof TableThemeToken>;
