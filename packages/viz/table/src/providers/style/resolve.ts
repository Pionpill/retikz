import { resolveDefaultCoreThemeColors, ThemeMode, ThemeTokenSource } from '@retikz/core';

import type { TableThemeStyleDefinition } from '../../contract';
import type { IRTableThemeTokenOverrides, TableThemeTokenKey } from '../../schemas';
import type { ResolvedTableThemeTokens, TableThemeContext } from './types';

import { TableThemeTokenKeySchema, TableThemeTokenMapSchema, TableThemeTokenOverridesSchema } from '../../schemas';
import { deepFreeze } from '../../shared';
import { getDefaultTableThemePreset } from './presets';
import { resolveTableThemeStyleRegistry } from './registry';

const defaultTheme: TableThemeContext = {
  mode: ThemeMode.Light,
  colors: resolveDefaultCoreThemeColors(ThemeMode.Light),
};

/** 解析 preset、shared categorical、inherited 与 local Table token cascade */
export const resolveTableThemeTokens = (
  effectiveTheme: TableThemeContext = defaultTheme,
  local: IRTableThemeTokenOverrides = {},
  tableThemeStyles: ReadonlyArray<TableThemeStyleDefinition> | undefined = undefined,
): ResolvedTableThemeTokens => {
  const parsedLocal = TableThemeTokenOverridesSchema.parse(structuredClone(local));
  const style = effectiveTheme.style;
  const styles = resolveTableThemeStyleRegistry(tableThemeStyles);
  const definition = style === undefined ? undefined : styles.get(style);
  if (style !== undefined && definition === undefined)
    throw new Error(`Table theme style '${style}' is not registered.`);
  const baseline =
    definition === undefined ? getDefaultTableThemePreset(effectiveTheme.mode) : definition.resolve(effectiveTheme);
  const sharedCategorical = [...effectiveTheme.colors.categorical];
  const tokens = TableThemeTokenMapSchema.parse({
    ...structuredClone(baseline),
    'data.categorical': sharedCategorical,
    ...structuredClone(parsedLocal),
  });
  const sources = Object.fromEntries(
    TableThemeTokenKeySchema.options.map(key => {
      if (Object.hasOwn(parsedLocal, key)) {
        return [
          key,
          {
            kind: ThemeTokenSource.Local,
            path: `$spec/tableThemeTokens/${key}`,
          },
        ];
      }
      if (key === 'data.categorical') {
        return [key, { kind: ThemeTokenSource.Inherit, path: '$theme/colors/categorical' }];
      }
      return [
        key,
        {
          kind: ThemeTokenSource.Local,
          path:
            style === undefined
              ? `$default/${effectiveTheme.mode}/${key}`
              : `$style/${style}/${effectiveTheme.mode}/${key}`,
        },
      ];
    }),
  ) as Record<TableThemeTokenKey, ResolvedTableThemeTokens['sources'][TableThemeTokenKey]>;
  return deepFreeze({ tokens, sources });
};

/** 断言 Table token source 的 canonical key 集合保持稳定 */
export const tableThemeTokenKeys = (): ReadonlyArray<TableThemeTokenKey> => [...TableThemeTokenKeySchema.options];
