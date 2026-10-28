import { RetikzTableError } from '../../error';
import { TableTrackSizeKind } from '../../schemas';
import type { CanonicalTableTrackSize } from './types';

const assertFiniteNonnegative = (value: number, name: string): void => {
  if (!Number.isFinite(value) || value < 0) {
    throw new RetikzTableError(`table: ${name} must be a finite nonnegative number`);
  }
};

const assertFinitePositive = (value: number, name: string): void => {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RetikzTableError(`table: ${name} must be a finite positive number`);
  }
};

/** 确定静态轨道值域与嵌套上下界关系 */
export const assertTableTrackSize = (track: CanonicalTableTrackSize, index: number): void => {
  switch (track.kind) {
    case TableTrackSizeKind.Fixed:
      assertFiniteNonnegative(track.value, `track ${index} fixed value`);
      return;
    case TableTrackSizeKind.Auto:
      return;
    case TableTrackSizeKind.Fraction:
      assertFinitePositive(track.weight, `track ${index} fraction weight`);
      return;
    case TableTrackSizeKind.Minmax:
      switch (track.min.kind) {
        case TableTrackSizeKind.Fixed:
          assertFiniteNonnegative(track.min.value, `track ${index} min fixed value`);
          break;
        case TableTrackSizeKind.Auto:
          break;
        default:
          throw new RetikzTableError(`table: track ${index} has an invalid min kind`);
      }

      switch (track.max.kind) {
        case TableTrackSizeKind.Fixed:
          assertFiniteNonnegative(track.max.value, `track ${index} max fixed value`);
          if (track.min.kind === TableTrackSizeKind.Fixed && track.min.value > track.max.value) {
            throw new RetikzTableError(`table: track ${index} fixed max must be greater than or equal to fixed min`);
          }
          break;
        case TableTrackSizeKind.Fraction:
          assertFinitePositive(track.max.weight, `track ${index} max fraction weight`);
          break;
        case TableTrackSizeKind.Auto:
          break;
        default:
          throw new RetikzTableError(`table: track ${index} has an invalid max kind`);
      }

      return;
    default:
      return track satisfies never;
  }
};
