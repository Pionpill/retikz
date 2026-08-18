import type { IRTableLayout, IRTableTrackOverride, IRTableTrackSize } from '../../schemas';
import type { ResolvedTableLayout, ResolvedTableTrackSize } from './types';

import { RetikzTableError } from '../../error';
import { TableLayoutSchema, TableTrackOverridesSchema, TableTrackSizeKind, TableTrackSizeSchema } from '../../schemas';
import { DEFAULT_TABLE_COLUMN_WIDTH, DEFAULT_TABLE_ROW_HEIGHT, DEFAULT_TABLE_TRACK_GAP } from '../../shared';

/** 物化单个轨道尺寸的运行时默认值并递归冻结 */
export const resolveTableTrackSize = (size: IRTableTrackSize): ResolvedTableTrackSize => {
  const parsed = TableTrackSizeSchema.parse(size);
  switch (parsed.kind) {
    case TableTrackSizeKind.Fixed:
      return Object.freeze({ kind: parsed.kind, value: parsed.value });
    case TableTrackSizeKind.Auto:
      return Object.freeze({ kind: parsed.kind });
    case TableTrackSizeKind.Fraction:
      return Object.freeze({ kind: parsed.kind, weight: parsed.weight ?? 1 });
    case TableTrackSizeKind.Minmax:
      return Object.freeze({
        kind: parsed.kind,
        min: resolveTableTrackSize(parsed.min) as ResolvedTableTrackSize & ({ kind: 'fixed' } | { kind: 'auto' }),
        max: resolveTableTrackSize(parsed.max) as ResolvedTableTrackSize &
          ({ kind: 'fixed' } | { kind: 'auto' } | { kind: 'fraction' }),
      });
  }
};

/** 按 canonical index 应用稀疏覆盖并解析同序轨道尺寸 */
export const resolveTableTrackSizes = (
  defaults: ReadonlyArray<IRTableTrackSize>,
  overrides: ReadonlyArray<IRTableTrackOverride> = [],
): ReadonlyArray<ResolvedTableTrackSize> => {
  const indexes = new Set<number>();
  for (const override of overrides) {
    if (!Number.isInteger(override.index) || override.index < 0) {
      throw new RetikzTableError(`table: track override index ${String(override.index)} must be a nonnegative integer`);
    }
    if (indexes.has(override.index)) {
      throw new RetikzTableError(`table: duplicate track override index ${override.index}`);
    }
    if (override.index >= defaults.length) {
      throw new RetikzTableError(
        `table: track override index ${override.index} is out of range for ${defaults.length} tracks`,
      );
    }
    indexes.add(override.index);
  }

  const parsedOverrides = TableTrackOverridesSchema.parse(overrides);
  const overrideByIndex = new Map(parsedOverrides.map(override => [override.index, override.size]));
  return Object.freeze(defaults.map((size, index) => resolveTableTrackSize(overrideByIndex.get(index) ?? size)));
};

/** 解析 Table layout 并物化稳定默认值 */
export const resolveTableLayout = (spec?: IRTableLayout): ResolvedTableLayout => {
  const parsed = TableLayoutSchema.parse(spec ?? {});
  const rowSize = resolveTableTrackSize(
    parsed.rowSize ?? { kind: TableTrackSizeKind.Fixed, value: DEFAULT_TABLE_ROW_HEIGHT },
  );
  return Object.freeze({
    columnSize: resolveTableTrackSize(
      parsed.columnSize ?? { kind: TableTrackSizeKind.Fixed, value: DEFAULT_TABLE_COLUMN_WIDTH },
    ),
    rowSize,
    headerRowSize: parsed.headerRowSize === undefined ? rowSize : resolveTableTrackSize(parsed.headerRowSize),
    columns: Object.freeze([...(parsed.columns ?? [])]),
    rows: Object.freeze([...(parsed.rows ?? [])]),
    columnGap: parsed.columnGap ?? DEFAULT_TABLE_TRACK_GAP,
    rowGap: parsed.rowGap ?? DEFAULT_TABLE_TRACK_GAP,
    ...(parsed.borders === undefined ? {} : { borders: parsed.borders }),
  });
};
