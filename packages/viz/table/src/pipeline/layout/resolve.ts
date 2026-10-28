import { RetikzTableError } from '../../error';
import type { IRTableLayout, IRTableTrackOverride, IRTableTrackSize } from '../../schemas';
import { TableTrackSizeKind } from '../../schemas';
import {
  DEFAULT_TABLE_COLUMN_WIDTH,
  DEFAULT_TABLE_ROW_HEIGHT,
  DEFAULT_TABLE_TRACK_GAP,
  deepFreeze,
} from '../../shared';
import { expandTableTrackSize, applyTableTrackOverrides } from './track-resolution';
import { assertTableTrackSize } from './track-validation';
import type { CanonicalTableLayout, CanonicalTableTrackSize } from './types';

/** 补齐轨道默认值并在首次确定化时建立数值保证 */
const resolveTableTrackSize = (size: IRTableTrackSize): CanonicalTableTrackSize => {
  const track = expandTableTrackSize(size);
  assertTableTrackSize(track, 0);
  return track;
};

/** 在实际轨道数量确定前检查覆盖声明的独立约束 */
const assertTableTrackOverrides = (overrides: ReadonlyArray<IRTableTrackOverride>): void => {
  const indexes = new Set<number>();
  for (const override of overrides) {
    if (!Number.isInteger(override.index) || override.index < 0) {
      throw new RetikzTableError(`table: track override index ${String(override.index)} must be a nonnegative integer`);
    }
    if (indexes.has(override.index))
      throw new RetikzTableError(`table: duplicate track override index ${override.index}`);
    indexes.add(override.index);
    resolveTableTrackSize(override.size);
  }
};

/** 按 canonical index 应用稀疏覆盖并解析同序轨道尺寸 */
export const resolveTableTrackSizes = (
  defaults: ReadonlyArray<IRTableTrackSize>,
  overrides: ReadonlyArray<IRTableTrackOverride> = [],
): ReadonlyArray<CanonicalTableTrackSize> => {
  assertTableTrackOverrides(overrides);
  return applyTableTrackOverrides(defaults.map(resolveTableTrackSize), overrides);
};

/** 解析 Table layout 并物化稳定默认值 */
export const resolveTableLayout = (spec?: IRTableLayout): CanonicalTableLayout => {
  const parsed = spec ?? {};
  assertTableTrackOverrides(parsed.columns ?? []);
  assertTableTrackOverrides(parsed.rows ?? []);
  for (const gap of [parsed.columnGap, parsed.rowGap]) {
    if (gap !== undefined && (!Number.isFinite(gap) || gap < 0)) {
      throw new RetikzTableError('table: gap must be a finite nonnegative number');
    }
  }
  const rowSize = resolveTableTrackSize(
    parsed.rowSize ?? { kind: TableTrackSizeKind.Fixed, value: DEFAULT_TABLE_ROW_HEIGHT },
  );

  return Object.freeze({
    columnSize: resolveTableTrackSize(
      parsed.columnSize ?? { kind: TableTrackSizeKind.Fixed, value: DEFAULT_TABLE_COLUMN_WIDTH },
    ),
    rowSize,
    headerRowSize: parsed.headerRowSize === undefined ? rowSize : resolveTableTrackSize(parsed.headerRowSize),
    columns: deepFreeze(structuredClone(parsed.columns ?? [])),
    rows: deepFreeze(structuredClone(parsed.rows ?? [])),
    columnGap: parsed.columnGap ?? DEFAULT_TABLE_TRACK_GAP,
    rowGap: parsed.rowGap ?? DEFAULT_TABLE_TRACK_GAP,
    ...(parsed.borders === undefined ? {} : { borders: parsed.borders }),
  });
};
