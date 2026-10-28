import { RetikzTableError } from '../../error';
import type { IRTableTrackOverride, IRTableTrackSize } from '../../schemas';
import { TableTrackSizeKind } from '../../schemas';
import type { CanonicalTableTrackSize } from './types';

/** 物化单个轨道尺寸的运行时默认值并递归冻结 */
export const expandTableTrackSize = (size: IRTableTrackSize): CanonicalTableTrackSize => {
  const parsed = size;

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
        min: expandTableTrackSize(parsed.min) as CanonicalTableTrackSize & ({ kind: 'fixed' } | { kind: 'auto' }),
        max: expandTableTrackSize(parsed.max) as CanonicalTableTrackSize &
          ({ kind: 'fixed' } | { kind: 'auto' } | { kind: 'fraction' }),
      });
  }
};

/** 在轨道数量确定后应用已准入的稀疏覆盖 */
export const applyTableTrackOverrides = (
  defaults: ReadonlyArray<CanonicalTableTrackSize>,
  overrides: ReadonlyArray<IRTableTrackOverride>,
): ReadonlyArray<CanonicalTableTrackSize> => {
  const overrideByIndex = new Map<number, CanonicalTableTrackSize>();
  for (const override of overrides) {
    if (override.index >= defaults.length) {
      throw new RetikzTableError(
        `table: track override index ${override.index} is out of range for ${defaults.length} tracks`,
      );
    }
    overrideByIndex.set(override.index, expandTableTrackSize(override.size));
  }
  return Object.freeze(defaults.map((size, index) => overrideByIndex.get(index) ?? size));
};
