import type { IRTableStyleTokens, TableStyleTokenKey, TableStyleValue, TableThemeModeValue } from '../../schemas';
import type { ResolvedTableStyleTokens } from './types';

import {
  TableStyle,
  TableStyleSchema,
  TableStyleTokenKeySchema,
  TableStyleTokenMapSchema,
  TableStyleTokensSchema,
  TableThemeMode,
  TableThemeModeSchema,
} from '../../schemas';
import { deepFreeze } from '../../shared';
import { BUILTIN_TABLE_STYLE_TOKENS } from './presets';

/** 解析 preset 与 root overlay 为完整 detached frozen token map */
export const resolveTableStyleTokens = (
  style: TableStyleValue = TableStyle.Neutral,
  themeMode: TableThemeModeValue = TableThemeMode.Light,
  overlay: IRTableStyleTokens = {},
): ResolvedTableStyleTokens => {
  const parsedStyle = TableStyleSchema.parse(style);
  const parsedMode = TableThemeModeSchema.parse(themeMode);
  const parsedOverlay = TableStyleTokensSchema.parse(structuredClone(overlay));
  const tokens = TableStyleTokenMapSchema.parse({
    ...structuredClone(BUILTIN_TABLE_STYLE_TOKENS[parsedStyle][parsedMode]),
    ...structuredClone(parsedOverlay),
  });
  const sources = Object.fromEntries(
    TableStyleTokenKeySchema.options.map(key => [key, Object.hasOwn(parsedOverlay, key) ? 'user' : 'preset']),
  ) as Record<TableStyleTokenKey, 'preset' | 'user'>;
  return deepFreeze(structuredClone({ tokens, sources }));
};
