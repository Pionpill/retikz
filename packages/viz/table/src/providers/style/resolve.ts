import { resolveDefaultCoreThemeColors, ThemeMode } from '@retikz/core';
import { strictObject } from 'zod';

import type { TableThemeStyleDefinition } from '../../contract';
import { RetikzTableError } from '../../error';
import type { IRTableDefaults } from '../../schemas';
import { TableDefaultsSchema } from '../../schemas';
import type { DeepReadonly } from '../../shared';
import { deepFreeze } from '../../shared';
import { getDefaultTableDefaults } from './presets';
import { resolveTableThemeStyleRegistry } from './registry';
import type { TableThemeContext, TableThemeDefaultsResolution, TableThemeDefaultsSource } from './types';

const defaultTheme: TableThemeContext = {
  mode: ThemeMode.Light,
  colors: resolveDefaultCoreThemeColors(ThemeMode.Light),
};

const TableThemeStyleSourceSchema = strictObject({
  defaults: TableDefaultsSchema.optional(),
}).describe('Table Theme style source containing sparse Source defaults.');

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const clone = <T>(value: T): T => structuredClone(value);

/** 删除 defaults overlay 中的 null 清除标记与由此产生的空嵌套分组 */
const pruneClearedRecords = (value: unknown, preserveRoot = false): unknown => {
  if (value === null || value === undefined) return undefined;
  if (Array.isArray(value)) return value.map(item => clone(item));
  if (!isRecord(value)) return clone(value);

  const result: Record<string, unknown> = {};
  Object.entries(value).forEach(([field, child]) => {
    const pruned = pruneClearedRecords(child);
    if (pruned === undefined) return;
    if (isRecord(pruned) && Object.keys(pruned).length === 0) return;

    result[field] = pruned;
  });

  return preserveRoot || Object.keys(result).length > 0 ? result : undefined;
};

const mergeRecord = (
  current: Record<string, unknown>,
  patch: Record<string, unknown>,
  atomicField = 'background',
): Record<string, unknown> => {
  const result = clone(current);
  Object.entries(patch).forEach(([field, value]) => {
    if (value === undefined) return;
    if (value === null) {
      delete result[field];
      return;
    }

    if (
      isRecord(result[field]) &&
      isRecord(value) &&
      (Object.hasOwn(result[field], 'kind') || Object.hasOwn(value, 'kind'))
    ) {
      result[field] = clone(value);
      return;
    }

    if (isRecord(result[field]) && isRecord(value) && field !== atomicField) {
      result[field] = mergeRecord(result[field], value, atomicField);
      return;
    }

    result[field] = clone(value);
  });

  return result;
};

const mergeAppearanceDefaults = (
  current: Record<string, unknown> | undefined,
  patch: Record<string, unknown>,
): Record<string, unknown> => mergeRecord(current ?? {}, patch);

const mergeLayoutDefaults = (
  current: Record<string, unknown> | undefined,
  patch: Record<string, unknown>,
): Record<string, unknown> => mergeRecord(current ?? {}, patch);

/** 按正式 Table Source 粒度合并两个 defaults 片段 */
export const mergeTableDefaults = (
  current: IRTableDefaults | undefined,
  patch: DeepReadonly<IRTableDefaults> | undefined,
): IRTableDefaults => {
  if (patch === undefined) return clone(current ?? {});

  const result: Record<string, unknown> = clone(current ?? {});
  if (patch.defaultAppearance === null) {
    delete result.defaultAppearance;
  } else if (isRecord(patch.defaultAppearance)) {
    result.defaultAppearance = mergeAppearanceDefaults(
      isRecord(result.defaultAppearance) ? result.defaultAppearance : undefined,
      patch.defaultAppearance,
    );
  }

  if (patch.layout === null) {
    delete result.layout;
  } else if (isRecord(patch.layout)) {
    result.layout = mergeLayoutDefaults(isRecord(result.layout) ? result.layout : undefined, patch.layout);
  }

  if (patch.defaultCellLayout === null) {
    delete result.defaultCellLayout;
  } else if (isRecord(patch.defaultCellLayout)) {
    result.defaultCellLayout = mergeRecord(
      isRecord(result.defaultCellLayout) ? result.defaultCellLayout : {},
      patch.defaultCellLayout,
      'padding',
    );
  }

  if (patch.defaultVisual === null) {
    delete result.defaultVisual;
  } else if (isRecord(patch.defaultVisual)) {
    result.defaultVisual = mergeRecord(isRecord(result.defaultVisual) ? result.defaultVisual : {}, patch.defaultVisual);
  }

  return TableDefaultsSchema.parse(pruneClearedRecords(result, true));
};

const sourceRecordsOf = (layers: ReadonlyArray<TableThemeDefaultsSource>): ReadonlyArray<TableThemeDefaultsSource> =>
  layers.map(layer => ({
    kind: layer.kind,
    path: layer.path,
    ...(layer.defaults === undefined ? {} : { defaults: clone(layer.defaults) }),
  }));

/** 按 Core Theme、Table style 与 style definition 解析 Table defaults */
export const resolveTableThemeDefaults = (
  effectiveTheme: TableThemeContext = defaultTheme,
  tableThemeStyles: ReadonlyArray<TableThemeStyleDefinition> | undefined = undefined,
): TableThemeDefaultsResolution => {
  const { style, mode } = effectiveTheme;
  const styles = resolveTableThemeStyleRegistry(tableThemeStyles);
  const definition = style === undefined ? undefined : styles.get(style);
  if (style !== undefined && definition === undefined) {
    throw new RetikzTableError(`Table theme style '${style}' is not registered.`);
  }

  const neutralDefaults = mergeTableDefaults(getDefaultTableDefaults(mode), {
    defaultVisual: { categorical: [...effectiveTheme.colors.categorical] },
  });
  const layers: Array<TableThemeDefaultsSource> = [
    { kind: 'neutral', path: `$default/${mode}`, defaults: neutralDefaults },
  ];
  if (definition !== undefined) {
    try {
      const source = TableThemeStyleSourceSchema.parse(definition.resolve(effectiveTheme));
      layers.push({
        kind: 'style',
        path: `$style/${style}/${mode}`,
        ...(source.defaults === undefined ? {} : { defaults: source.defaults }),
      });
    } catch (cause) {
      throw new RetikzTableError(`Table theme style '${style}' resolution failed.`, { cause });
    }
  }

  const defaults = layers.reduce<IRTableDefaults>(
    (resolvedDefaults, layer) => mergeTableDefaults(resolvedDefaults, layer.defaults),
    {},
  );

  return deepFreeze({
    ...(style === undefined ? {} : { style }),
    mode,
    defaults,
    layers: sourceRecordsOf(layers),
  });
};
