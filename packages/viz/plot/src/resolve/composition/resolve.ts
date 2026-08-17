import type { DimensionRole } from '../../contract';
import type { IRPlot, IRPlotAxisGuide, IRPlotGuide } from '../../schemas';
import type { Margins } from '../../shared';
import type {
  CompositionAxisPolicyValue,
  CompositionLayout,
  CompositionPolicyContext,
  CompositionResolution,
  CompositionResolve,
  CoordinateArrangement,
  CoordinateScopeRegistry,
  CoordinateScopeRegistryEntry,
  FacetGrid,
  FacetPanelValue,
  FacetScalar,
  GridTargetSelector,
  ScaffoldTrack,
  SharedScaffold,
} from './types';

import { defaultOriginAxisTickSideOf } from '../../providers';
import { AxisGridApplyTo, CoordinateArrangementKind, CoordinateViewPlacementKind, PlotGuide } from '../../schemas';

const DEFAULT_COORDINATE_SCOPE_ID = 'default';

/** 解析 track 对应的 coordinate view id */
const trackViewIdOf = (arrangement: SharedScaffold, track: ScaffoldTrack): string => {
  if (track.view !== undefined) return track.view;
  const template = arrangement.viewIdTemplate ?? '{arrangement}.track.{track}';
  return template.replaceAll('{arrangement}', arrangement.id).replaceAll('{track}', track.id);
};

/** 解析 plot 的坐标简写或 composition 为统一坐标视图 registry */
export const resolveCoordinateScopeRegistry = (node: IRPlot): CoordinateScopeRegistry => {
  if (node.composition !== undefined) {
    const scaffolds = (node.composition.arrangements ?? []).filter(
      (arrangement): arrangement is SharedScaffold => arrangement.kind === CoordinateArrangementKind.Tracks,
    );
    const explicitScopes: Array<CoordinateScopeRegistryEntry> = (node.composition.views ?? []).map(view => {
      const placement =
        view.placement === undefined || view.placement.kind !== CoordinateViewPlacementKind.Slot
          ? view.placement
          : undefined;
      return {
        id: view.id,
        coordinate: view.coordinate,
        ...(placement !== undefined ? { placement } : {}),
      };
    });
    const generatedTrackScopes: Array<CoordinateScopeRegistryEntry> = scaffolds.flatMap(scaffold =>
      scaffold.tracks.map(track => ({
        id: trackViewIdOf(scaffold, track),
        coordinate: track.coordinate ?? scaffold.coordinate,
        placement: { kind: 'track', scaffold: scaffold.id, track: track.id },
        scaffold: scaffold.id,
        track: track.id,
      })),
    );
    const seen = new Set<string>();
    for (const scope of [...explicitScopes, ...generatedTrackScopes]) {
      if (seen.has(scope.id)) throw new Error(`lowerPlots: coordinate view "${scope.id}" is duplicated`);
      seen.add(scope.id);
    }
    return {
      defaultScope: node.composition.defaultView,
      scopes: [...explicitScopes, ...generatedTrackScopes],
    };
  }
  if (node.coordinate === undefined) {
    throw new Error('lowerPlots: IRPlot requires either coordinate shorthand or composition');
  }
  return {
    defaultScope: DEFAULT_COORDINATE_SCOPE_ID,
    scopes: [{ id: DEFAULT_COORDINATE_SCOPE_ID, coordinate: node.coordinate }],
  };
};

/** 返回图元或 guide 应路由到的坐标视图 id */
export const coordinateScopeIdOf = (operation: { coordinateView?: string }, defaultScope: string): string =>
  operation.coordinateView ?? defaultScope;

/** 解析 plot composition 的有效 arrangement、scope 与策略上下文 */
export const resolveComposition = (node: IRPlot): CompositionResolution => {
  const arrangements = node.composition?.arrangements ?? [];
  const facets = arrangements.filter(
    (arrangement): arrangement is FacetGrid => arrangement.kind === CoordinateArrangementKind.Facet,
  );
  const scaffolds = arrangements.filter(
    (arrangement): arrangement is SharedScaffold => arrangement.kind === CoordinateArrangementKind.Tracks,
  );
  const policyContext: CompositionPolicyContext = {
    hasFacets: facets.length > 0,
    hasScaffolds: scaffolds.length > 0,
  };
  return {
    coordinateScopes: resolveCoordinateScopeRegistry(node),
    ...(node.composition?.spacing !== undefined ? { layout: node.composition.spacing } : {}),
    ...(node.composition?.resolve !== undefined ? { resolve: node.composition.resolve } : {}),
    arrangements: [...arrangements],
    facets,
    scaffolds,
    policyContext,
  };
};

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
  context: CompositionPolicyContext,
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
  context: CompositionPolicyContext,
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
  context: CompositionPolicyContext,
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

/** 把 composition padding 作为默认 margin，并让 runtime margin 覆盖。 */
export const mergeCompositionMargin = (
  padding: CompositionLayout['padding'] | undefined,
  margin: Partial<Margins> | undefined,
): Partial<Margins> | undefined => {
  if (padding === undefined) return margin;
  return { ...padding, ...margin };
};
