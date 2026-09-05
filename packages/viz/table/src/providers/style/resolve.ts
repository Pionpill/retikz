import { resolveDefaultCoreThemeColors, ThemeMode, ThemeTokenSource } from '@retikz/core';

import type { TableThemeStyleDefinition } from '../../contract';
import type { IRTableThemeTokenOverrides, TableThemeTokenKey } from '../../schemas';
import type { ResolvedTableThemeTokens, TableThemeContext } from './types';

import { RetikzTableError } from '../../error';
import { TableThemeStyleTokenOverridesSchema, TableThemeTokenKeySchema, TableThemeTokenMapSchema } from '../../schemas';
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
  const style = effectiveTheme.style;
  const styles = resolveTableThemeStyleRegistry(tableThemeStyles);
  const definition = style === undefined ? undefined : styles.get(style);
  if (style !== undefined && definition === undefined)
    throw new RetikzTableError(`Table theme style '${style}' is not registered.`);
  const defaultTokens = getDefaultTableThemePreset(effectiveTheme.mode);
  const styleTokens = (() => {
    if (definition === undefined) return {};
    try {
      const rawStyleTokens = definition.resolve(effectiveTheme);
      return TableThemeStyleTokenOverridesSchema.parse(rawStyleTokens);
    } catch (cause) {
      throw new RetikzTableError(`Table theme style '${style}' resolution failed.`, { cause });
    }
  })();
  const baseline = { ...defaultTokens, ...styleTokens };
  const sharedCategorical = [...effectiveTheme.colors.categorical];
  const tokens = TableThemeTokenMapSchema.parse({
    ...baseline,
    'data.categorical': sharedCategorical,
    ...local,
  });
  const sources = Object.fromEntries(
    TableThemeTokenKeySchema.options.map(key => {
      if (Object.hasOwn(local, key)) {
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
      if (style !== undefined && Object.hasOwn(styleTokens, key)) {
        return [key, { kind: ThemeTokenSource.Local, path: `$style/${style}/${effectiveTheme.mode}/${key}` }];
      }
      return [
        key,
        {
          kind: ThemeTokenSource.Local,
          path: `$default/${effectiveTheme.mode}/${key}`,
        },
      ];
    }),
  ) as Record<TableThemeTokenKey, ResolvedTableThemeTokens['sources'][TableThemeTokenKey]>;
  return deepFreeze({ tokens, sources });
};

/** 断言 Table token source 的 canonical key 集合保持稳定 */
export const tableThemeTokenKeys = (): ReadonlyArray<TableThemeTokenKey> => [...TableThemeTokenKeySchema.options];
