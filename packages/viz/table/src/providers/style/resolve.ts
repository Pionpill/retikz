import { resolveDefaultCoreThemeColors, ThemeMode, ThemeTokenSource } from '@retikz/core';
import { assertPlainDataContainers } from '@retikz/foundation';
import { custom } from 'zod';

import type { TableThemeStyleDefinition } from '../../contract';
import type { IRTableThemeTokenOverrides, TableThemeTokenKey } from '../../schemas';
import type { ResolvedTableThemeTokens, TableThemeContext } from './types';

import { RetikzTableError } from '../../error';
import {
  TableThemeStyleTokenOverridesSchema,
  TableThemeTokenKeySchema,
  TableThemeTokenMapSchema,
  TableThemeTokenOverridesSchema,
  TableThemeTokenPresetMapSchema,
} from '../../schemas';
import { deepFreeze } from '../../shared';
import { getDefaultTableThemePreset } from './presets';
import { resolveTableThemeStyleRegistry } from './registry';

const defaultTheme: TableThemeContext = {
  mode: ThemeMode.Light,
  colors: resolveDefaultCoreThemeColors(ThemeMode.Light),
};

const tableThemeStyleTokenKeys = new Set<string>(Object.keys(TableThemeTokenPresetMapSchema.shape));

/** 判断 runtime provider 输出是否为可枚举的普通对象 */
const isPlainRecord = (value: unknown): value is Record<string, unknown> => {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

const TableThemeStyleProviderOutputSchema = custom<Record<string, unknown>>(isPlainRecord, {
  error: 'Table theme style definition must return a plain object.',
}).pipe(TableThemeStyleTokenOverridesSchema);

const TableThemeStylePlainDataSchema = custom<unknown>(
  value => {
    try {
      assertPlainDataContainers(value, 'Table theme style definition output');
      return true;
    } catch {
      return false;
    }
  },
  { error: 'Table theme style definition must return JSON-safe plain data.' },
);

/** 只把 runtime style definition 中已知且显式为 undefined 的字段规范化为省略 */
const omitKnownUndefinedProperties = (value: unknown, knownKeys: ReadonlySet<string>): unknown => {
  if (!isPlainRecord(value)) return value;
  return Object.fromEntries(Object.entries(value).filter(([key, item]) => item !== undefined || !knownKeys.has(key)));
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
    throw new RetikzTableError(`Table theme style '${style}' is not registered.`);
  const defaultTokens = getDefaultTableThemePreset(effectiveTheme.mode);
  const styleTokens = (() => {
    if (definition === undefined) return {};
    try {
      const rawStyleTokens = definition.resolve(effectiveTheme);
      TableThemeStylePlainDataSchema.parse(rawStyleTokens);
      const normalizedStyleTokens = omitKnownUndefinedProperties(rawStyleTokens, tableThemeStyleTokenKeys);
      return TableThemeStyleProviderOutputSchema.parse(normalizedStyleTokens);
    } catch (cause) {
      throw new RetikzTableError(`Table theme style '${style}' resolution failed.`, { cause });
    }
  })();
  const baseline = { ...defaultTokens, ...styleTokens };
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
