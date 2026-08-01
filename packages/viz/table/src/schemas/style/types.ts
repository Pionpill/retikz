import type { z } from 'zod';

import type { TableStyle, TableThemeMode } from './constants';
import type {
  TableStyleBorderTokenSchema,
  TableStyleTokenKeySchema,
  TableStyleTokenMapSchema,
  TableStyleTokensSchema,
} from './schema';

/** Table 内置样式值 */
export type TableStyleValue = (typeof TableStyle)[keyof typeof TableStyle];

/** Table 显式主题模式值 */
export type TableThemeModeValue = (typeof TableThemeMode)[keyof typeof TableThemeMode];

/** Table 闭合样式 token key */
export type TableStyleTokenKey = z.infer<typeof TableStyleTokenKeySchema>;

/** Table 样式 border token */
export type IRTableStyleBorderToken = z.infer<typeof TableStyleBorderTokenSchema>;

/** Table root 的 partial 样式 token overlay */
export type IRTableStyleTokens = z.infer<typeof TableStyleTokensSchema>;

/** 完整 19 项 Table 样式 token map */
export type TableStyleTokenMap = z.infer<typeof TableStyleTokenMapSchema>;
