import { resolveCoreThemeColors, ThemeMode, ThemeStyle } from '@retikz/core';

import type { IRTableThemeTokenOverrides, TableThemeTokenKey } from '../../schemas';
import type { ResolvedTableThemeTokens, TableThemeContext } from './types';

import { TableThemeTokenKeySchema, TableThemeTokenMapSchema, TableThemeTokenOverridesSchema } from '../../schemas';
import { deepFreeze } from '../../shared';
import { BUILTIN_TABLE_THEME_TOKENS } from './presets';

const defaultTheme: TableThemeContext = {
  style: ThemeStyle.Neutral,
  mode: ThemeMode.Light,
  tokens: {},
  colors: resolveCoreThemeColors(ThemeStyle.Neutral, ThemeMode.Light),
};

/** 解析 preset、shared categorical、inherited 与 local Table token cascade */
export const resolveTableThemeTokens = (
  effectiveTheme: TableThemeContext = defaultTheme,
  local: IRTableThemeTokenOverrides = {},
): ResolvedTableThemeTokens => {
  const inherited = TableThemeTokenOverridesSchema.parse(
    Object.hasOwn(effectiveTheme.tokens, 'table') ? effectiveTheme.tokens.table : {},
  );
  const parsedLocal = TableThemeTokenOverridesSchema.parse(structuredClone(local));
  const preset = BUILTIN_TABLE_THEME_TOKENS[effectiveTheme.style][effectiveTheme.mode];
  const sharedCategorical = [...effectiveTheme.colors.categorical];
  const tokens = TableThemeTokenMapSchema.parse({
    ...structuredClone(preset),
    'data.categorical': sharedCategorical,
    ...structuredClone(inherited),
    ...structuredClone(parsedLocal),
  });
  const sources = Object.fromEntries(
    TableThemeTokenKeySchema.options.map(key => {
      if (Object.hasOwn(parsedLocal, key)) {
        return [
          key,
          {
            kind: 'local-theme-token',
            path: `$spec/tableThemeTokens/${key}`,
          },
        ];
      }
      if (Object.hasOwn(inherited, key)) {
        return [
          key,
          {
            kind: 'inherited-theme-token',
            path: `$theme/tokens/table/${key}`,
          },
        ];
      }
      if (key === 'data.categorical') {
        return [key, { kind: 'shared-categorical', path: '$theme/colors/categorical' }];
      }
      return [key, { kind: 'preset', path: `$preset/${effectiveTheme.style}/${effectiveTheme.mode}/${key}` }];
    }),
  ) as Record<TableThemeTokenKey, ResolvedTableThemeTokens['sources'][TableThemeTokenKey]>;
  return deepFreeze({ tokens, sources });
};

/** 断言 Table token source 的 canonical key 集合保持稳定 */
export const tableThemeTokenKeys = (): ReadonlyArray<TableThemeTokenKey> => [...TableThemeTokenKeySchema.options];
