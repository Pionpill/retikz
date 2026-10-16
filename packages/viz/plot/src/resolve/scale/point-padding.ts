import { resolveBoxSpacing } from '@retikz/core';

import { RetikzPlotError } from '../../error';
import { POINT_DEFAULT_RADIUS, SIZE_MAX_RADIUS } from '../../providers';
import type { IRPlotPointAutoPadding, IRPlotPointMark, IRPlotScaleOperation } from '../../schemas';
import { isBuiltinMark, PointMarkSchema, RelationMarkSchema } from '../../schemas';
import type { MarkDataView } from '../coordinate';

/** 一个坐标角色的图元留白需求 */
export type PointPaddingResolution = {
  /** 按最大半径确定的两端最小留白 */
  minimum: { lower: number; upper: number };
  /** 逐点策略参与者及其方向净空 */
  points: Array<{ view: MarkDataView; clearance: { lower: number; upper: number } }>;
};

/** 读取 Point / Relation 的自动策略，忽略没有节点半径语义的其它图元 */
export const pointAutoPaddingOf = (view: MarkDataView): IRPlotPointAutoPadding => {
  const mark = view.mark;
  if (!isBuiltinMark(mark)) return false;
  if (mark.type === 'point') return mark.autoPadding ?? PointMarkSchema.shape.autoPadding.unwrap().parse(undefined);
  if (mark.type === 'relation' && mark.endpoints !== undefined)
    return mark.autoPadding ?? RelationMarkSchema.shape.autoPadding.unwrap().parse(undefined);
  return false;
};

/** 从常量或尺寸尺度输出上界解析半径，不遍历数据行 */
const maximumRadiusOf = (size: IRPlotPointMark['size'], scales: ReadonlyArray<IRPlotScaleOperation>): number => {
  if (size === undefined) return POINT_DEFAULT_RADIUS;
  if (size.kind === 'constant') return size.value;
  if (size.scale === undefined) return SIZE_MAX_RADIUS;
  const scale = scales.find(candidate => candidate.name === size.scale);
  const range = scale !== undefined && 'range' in scale ? scale.range : undefined;
  if (range === undefined && scale?.type === 'sqrt') return SIZE_MAX_RADIUS;
  if (
    !Array.isArray(range) ||
    range.length === 0 ||
    range.some(value => typeof value !== 'number' || !Number.isFinite(value) || value < 0)
  ) {
    throw new RetikzPlotError(`size scale "${size.scale}" has no finite nonnegative radius upper bound`);
  }
  let maximum = 0;
  for (const radius of range) maximum = Math.max(maximum, radius);
  return maximum;
};

/** 按实际角色和输出方向汇总图元自动留白，领域默认不由 adapter 计算 */
export const resolvePointPadding = (
  views: ReadonlyArray<MarkDataView>,
  scales: ReadonlyArray<IRPlotScaleOperation>,
  role: string,
  cartesian: boolean,
  increasing: boolean,
  continuous: boolean,
): PointPaddingResolution => {
  const result: PointPaddingResolution = { minimum: { lower: 0, upper: 0 }, points: [] };
  for (const view of views) {
    const strategy = pointAutoPaddingOf(view);
    if (strategy === false) continue;
    const kind = typeof strategy === 'string' ? strategy : strategy.kind;
    if (kind === 'max-radius' && !continuous) continue;
    const authored = typeof strategy === 'string' ? undefined : strategy.clearance;
    if (
      !cartesian &&
      typeof authored === 'object' &&
      ['left', 'right', 'top', 'bottom'].some(side => Object.hasOwn(authored, side))
    ) {
      throw new RetikzPlotError(
        `mark "${view.mark.id ?? view.markIndex}" directional clearance requires Cartesian coordinates`,
      );
    }
    const spacing = resolveBoxSpacing(authored, 0);
    const start = role === 'y' ? spacing.top : spacing.left;
    const end = role === 'y' ? spacing.bottom : spacing.right;
    const clearance = { lower: increasing ? start : end, upper: increasing ? end : start };
    if (kind === 'point-aware') {
      result.points.push({ view, clearance });
      continue;
    }
    const mark = view.mark;
    if (!isBuiltinMark(mark)) continue;
    let radius = 0;
    if (mark.type === 'point') radius = maximumRadiusOf(mark.size, scales);
    else if (mark.type === 'relation') {
      for (const glyph of [mark.endpoints?.source, mark.endpoints?.target]) {
        if (glyph !== undefined) radius = Math.max(radius, maximumRadiusOf(glyph.size, scales));
      }
    }
    result.minimum.lower = Math.max(result.minimum.lower, radius + clearance.lower);
    result.minimum.upper = Math.max(result.minimum.upper, radius + clearance.upper);
  }
  return result;
};
