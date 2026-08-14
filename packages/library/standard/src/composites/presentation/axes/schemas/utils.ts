import { enumerateLattice } from '../../shared/lattice';
import { AxesTickExtent, AxesTickSourceKind } from '../constants';

interface CanonicalAxesExtent {
  negative: number;
  positive: number;
}

type AxesExtentInput = number | CanonicalAxesExtent;

type AxesTickSourceInput =
  | {
      kind: typeof AxesTickSourceKind.Spacing;
      spacing: number;
      extent: (typeof AxesTickExtent)[keyof typeof AxesTickExtent];
    }
  | {
      kind: typeof AxesTickSourceKind.Values;
      values: Array<number>;
    };

/** 将对称长度 shorthand 规范化为显式正负方向长度 */
export const normalizeAxesExtent = (extent: AxesExtentInput): CanonicalAxesExtent =>
  typeof extent === 'number' ? { negative: extent, positive: extent } : extent;

/** 返回规则刻度来源实际覆盖的有符号轴向范围 */
export const axesTickRangeOf = (
  extent: CanonicalAxesExtent,
  tickExtent: (typeof AxesTickExtent)[keyof typeof AxesTickExtent],
): { min: number; max: number } => ({
  min: tickExtent === AxesTickExtent.Positive ? 0 : -extent.negative,
  max: tickExtent === AxesTickExtent.Negative ? 0 : extent.positive,
});

/** 按轴向正负语义枚举刻度值，排除原点并过滤过于靠近端点的刻度 */
export const enumerateAxesTickValues = (
  source: AxesTickSourceInput,
  extent: CanonicalAxesExtent,
  endpointGap: number,
): Array<number> => {
  const values =
    source.kind === AxesTickSourceKind.Values
      ? source.values
      : enumerateLattice({
          ...axesTickRangeOf(extent, source.extent),
          spacing: source.spacing,
          origin: 0,
          includeBoundary: false,
        })
          .filter(value => value.index !== 0)
          .map(value => value.value);

  return values.filter(value => value + extent.negative >= endpointGap && extent.positive - value >= endpointGap);
};
