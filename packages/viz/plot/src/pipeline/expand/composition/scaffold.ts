import type { IRChild, IRJsonObject, IRNode, IRPathBase, IRScope } from '@retikz/core';

import type { DimensionRole } from '../../../contract';
import type { IRPlotAxisGuide, IRPlotGuide } from '../../../schemas';
import type { Margins } from '../../../shared';
import type {
  CompositionAxisPolicyValue,
  CompositionLayout,
  CompositionResolve,
  CoordinateArrangement,
  FacetPanelValue,
  FacetScalar,
  GridTargetSelector,
} from './types';

import { defaultOriginAxisTickSideOf } from '../../../providers';
import { AxisGridApplyTo, PlotGuide } from '../../../schemas';

/** 判断 guide 是否为 axis */
export const isAxisGuide = (guide: IRPlotGuide): guide is IRPlotAxisGuide => guide.type === PlotGuide.Axis;

/** 判断 guide 是否为 legend */
export const isLegendGuide = (guide: IRPlotGuide): guide is Extract<IRPlotGuide, { type: typeof PlotGuide.Legend }> =>
  guide.type === PlotGuide.Legend;

/** 返回 axis guide 绑定的 coordinate scope */
export const axisGuideScopeIdOf = (guide: IRPlotAxisGuide, defaultScope: string): string =>
  guide.coordinateView ?? defaultScope;

/** 解析 composition axis 的默认与显式输出策略 */
export const compositionAxisPolicyOf = (
  resolve: CompositionResolve | undefined,
  context: { hasFacets: boolean; hasScaffolds: boolean },
  dimension: DimensionRole,
): CompositionAxisPolicyValue => {
  const mode = resolve?.axis?.[dimension];
  if (mode === 'none') return 'none';
  if (mode === 'outer') return 'outerShared';
  if (mode === 'local') return 'perScope';
  return context.hasFacets || context.hasScaffolds ? 'outerShared' : 'perScope';
};

/** 解析 composition grid 的默认与显式投放策略 */
export const compositionGridPlacementOf = (
  resolve: CompositionResolve | undefined,
  context: { hasFacets: boolean; hasScaffolds: boolean },
  dimension: DimensionRole,
): string =>
  resolve?.grid?.[dimension] ??
  (context.hasFacets || context.hasScaffolds ? AxisGridApplyTo.All : AxisGridApplyTo.Local);

/** 合并根 composition 与 arrangement 的 layout 覆盖 */
export const mergeCompositionLayout = (
  base: CompositionLayout | undefined,
  override: CompositionLayout | undefined,
): CompositionLayout | undefined => {
  if (override === undefined) return base;
  if (base === undefined) return { ...override };
  return { ...base, ...override };
};

const mergeCompositionResolveRecord = <T extends string>(
  base: Record<string, T> | undefined,
  override: Record<string, T> | undefined,
): Record<string, T> | undefined => {
  if (override === undefined) return base;
  if (base === undefined) return { ...override };
  return { ...base, ...override };
};

/** 合并根 composition 与 arrangement 的 scale/axis/grid resolve */
export const mergeCompositionResolve = (
  base: CompositionResolve | undefined,
  override: CompositionResolve | undefined,
): CompositionResolve | undefined => {
  if (override === undefined) return base;
  return {
    ...(mergeCompositionResolveRecord(base?.scale, override.scale) !== undefined
      ? { scale: mergeCompositionResolveRecord(base?.scale, override.scale) }
      : {}),
    ...(mergeCompositionResolveRecord(base?.axis, override.axis) !== undefined
      ? { axis: mergeCompositionResolveRecord(base?.axis, override.axis) }
      : {}),
    ...(mergeCompositionResolveRecord(base?.grid, override.grid) !== undefined
      ? { grid: mergeCompositionResolveRecord(base?.grid, override.grid) }
      : {}),
  };
};

/** 合并根 composition 与指定 arrangement 的 layout */
export const resolveArrangementLayout = (
  base: CompositionLayout | undefined,
  arrangement: CoordinateArrangement | undefined,
): CompositionLayout | undefined => mergeCompositionLayout(base, arrangement?.spacing);

/** 合并根 composition 与指定 arrangement 的 resolve */
export const resolveArrangementPolicy = (
  base: CompositionResolve | undefined,
  arrangement: CoordinateArrangement | undefined,
): CompositionResolve | undefined => mergeCompositionResolve(base, arrangement?.resolve);

/** 解析 axis grid 的最终 applyTo 策略 */
export const axisGridApplyToOf = (
  guide: IRPlotAxisGuide,
  resolve: CompositionResolve | undefined,
  context: { hasFacets: boolean; hasScaffolds: boolean },
): string | null => {
  if (guide.grid === undefined || guide.grid === false) return null;
  if (guide.grid === true) return compositionGridPlacementOf(resolve, context, guide.dimension);
  return guide.grid.applyTo ?? compositionGridPlacementOf(resolve, context, guide.dimension);
};

/** 读取 axis grid 的显式目标选择器 */
export const axisGridSelectorOf = (guide: IRPlotAxisGuide): GridTargetSelector | undefined =>
  typeof guide.grid === 'object' ? guide.grid.select : undefined;

const facetScalarKey = (value: FacetScalar): string => JSON.stringify(value);

/** 判断 facet panel value 是否命中 selector value */
export const scalarSelectorIncludes = (values: FacetPanelValue, value: FacetPanelValue): boolean => {
  if (values === undefined) return true;
  if (value === undefined) return false;
  const selectorValues = Array.isArray(values) ? values : [values];
  const panelValues = Array.isArray(value) ? value : [value];
  const accepted = new Set(selectorValues.map(facetScalarKey));
  return panelValues.some(item => accepted.has(facetScalarKey(item)));
};

const axisGapKeyOf = (guide: IRPlotAxisGuide): string | null => {
  const placement = guide.placement;
  if (placement === undefined || placement.kind === 'auto') return null;
  if (placement.kind === 'side') return `side:${placement.side}`;
  if (placement.kind === 'origin') {
    return `${guide.dimension}:origin:${String(placement.origin ?? 0)}:${placement.tickSide ?? defaultOriginAxisTickSideOf(guide.dimension)}`;
  }
  return `edge:${placement.edge}`;
};

/** 为同侧或同 edge 的多根 axis 累加 composition axis gap。 */
export const withAxisGapOffsets = (
  guides: ReadonlyArray<IRPlotGuide>,
  axisGap: number | undefined,
): Array<IRPlotGuide> => {
  if (axisGap === undefined || axisGap === 0) return [...guides];
  const counts = new Map<string, number>();
  return guides.map(guide => {
    if (!isAxisGuide(guide)) return guide;
    const key = axisGapKeyOf(guide);
    if (key === null) return guide;
    const index = counts.get(key) ?? 0;
    counts.set(key, index + 1);
    if (
      index === 0 &&
      (guide.placement?.kind === 'side' || guide.placement?.kind === 'edge' || guide.placement?.kind === 'origin')
    )
      return guide;
    if (guide.placement?.kind === 'side' || guide.placement?.kind === 'edge' || guide.placement?.kind === 'origin') {
      return {
        ...guide,
        placement: {
          ...guide.placement,
          offset: (guide.placement.offset ?? 0) + index * axisGap,
        },
      };
    }
    return guide;
  });
};

/** 关闭 axis guide 的 grid 输出，同时保留其它 guide 字段。 */
export const withoutAxisGrid = (guides: ReadonlyArray<IRPlotGuide>): Array<IRPlotGuide> =>
  guides.map(guide => (isAxisGuide(guide) && guide.grid !== undefined ? { ...guide, grid: false } : guide));

/** 为指定 scope 启用 axis grid。 */
export const withEnabledAxisGrid = (guide: IRPlotAxisGuide, coordinateView: string | undefined): IRPlotAxisGuide => ({
  ...guide,
  ...(coordinateView !== undefined ? { coordinateView } : {}),
  grid: guide.grid === undefined || guide.grid === false ? true : guide.grid,
});

/** 把 composition padding 作为默认 margin，并让 runtime margin 覆盖。 */
export const mergeCompositionMargin = (
  padding: CompositionLayout['padding'] | undefined,
  margin: Partial<Margins> | undefined,
): Partial<Margins> | undefined => {
  if (padding === undefined) return margin;
  return { ...padding, ...margin };
};

const mergeContextMeta = (meta: IRJsonObject | undefined, context: IRJsonObject): IRJsonObject => ({
  ...(meta ?? {}),
  ...context,
});

const isIRScope = (child: IRChild): child is IRScope => child.type === 'scope' && 'children' in child;
const isIRNode = (child: IRChild): child is IRNode => child.type === 'node' && 'position' in child;
const isIRPath = (child: IRChild): child is IRPathBase => child.type === 'path' && 'children' in child;

/** 把 coordinate scope context 递归写入 lowering 产物 metadata。 */
export const withScopeContext = (child: IRChild, context: IRJsonObject): IRChild => {
  if (Object.keys(context).length === 0) return child;
  if (isIRScope(child)) {
    return {
      ...child,
      meta: mergeContextMeta(child.meta, context),
      children: child.children.map(item => withScopeContext(item, context)),
    };
  }
  if (isIRNode(child)) return { ...child, meta: mergeContextMeta(child.meta, context) } satisfies IRNode;
  if (isIRPath(child)) return { ...child, meta: mergeContextMeta(child.meta, context) } satisfies IRPathBase;
  return child;
};
