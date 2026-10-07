import type { IRScope } from '@retikz/core';
import type { DataView, FieldOrderDefinition } from '@retikz/data';
import type { JsonObject } from '@retikz/foundation';

import type { AnyScaleDefinition, CoordinateFrame, DimensionRole } from '../../../contract';
import type { ProvenanceContext } from '../../../contract';
import { RetikzPlotError } from '../../../error';
import { resolveCoordinateRegistry } from '../../../providers';
import type {
  CompositionAxisPolicy,
  CompositionLayout,
  CompositionResolve,
  CoordinateArrangement,
  FacetGrid,
  GridTargetSelector,
  ScaffoldTrack,
  SharedScaffold,
} from '../../../resolve/composition';
import type { CoordinateScopeRegistry, CoordinateScopeRegistryEntry } from '../../../resolve/composition';
import {
  axisGridApplyToOf,
  axisGridSelectorOf,
  axisGuideScopeIdOf,
  compositionAxisPolicyOf,
  coordinateScopeIdOf,
  isAxisGuide,
  mergeCompositionMargin,
  resolveArrangementLayout,
  resolveArrangementPolicy,
  withAxisGapOffsets,
} from '../../../resolve/composition';
import type { CoordinateFrameResolution, CoordinateResolveContext, MarkDataView } from '../../../resolve/coordinate';
import { resolveCoordinateDefinition, resolveCoordinateFrame } from '../../../resolve/coordinate';
import { resolveGuideTicks, resolveVisibleGuideTicks } from '../../../resolve/guide';
import type { MarkPaddingContext } from '../../../resolve/scale';
import type { IRPlot, IRPlotAxisGuide, IRPlotCoordinateOperation, IRPlotGuide } from '../../../schemas';
import { AxisGridApplyTo, CoordinateViewPlacementKind, PlotGuide, ScaffoldFrameMode } from '../../../schemas';
import type { Rect } from '../../../shared';
import { DEFAULT_FONT_SIZE } from '../../../shared';
import { lowerCustomAxis, lowerGuide } from '../../guide';
import { withEnabledAxisGrid, withoutAxisGrid, withScopeContext } from '../composition';
import { legendReserveOf } from '../legend';
import type { LowerPlotsOptions } from '../types';

/** scoped/scaffold frame 解析所需的显式上下文 */
export type ScopedFramesResolveContext = {
  /** 一次 lowering 内的共享留白状态 */
  markPadding?: MarkPaddingContext;
  /** 当前待下沉的 Plot 源描述 */
  node: IRPlot;
  /** 根级变换后的数据行与字段模型 */
  dataView: DataView;
  /** 当前 Plot 的绘制宽度 */
  width: number;
  /** 当前 Plot 的绘制高度 */
  height: number;
  /** 当前下沉使用的运行时能力与覆盖选项 */
  options: LowerPlotsOptions;
  /** 本次下沉的数据来源追踪上下文 */
  provenance?: ProvenanceContext;
  /** 按类型索引的有效尺度定义 */
  scaleRegistry: Map<string, AnyScaleDefinition>;
  /** 当前请求共享的分类顺序注册表 */
  fieldOrderRegistry?: ReadonlyMap<string, FieldOrderDefinition>;
  /** 各 mark 局部变换后的有效数据视图 */
  markDataViews: Array<MarkDataView>;
  /** 组合区域间距与外边距配置 */
  compositionLayout?: CompositionLayout;
  /** 各维度的共享尺度与坐标轴策略 */
  compositionResolve?: CompositionResolve;
  /** 需要展开的分面排列声明 */
  compositionFacets: Array<FacetGrid>;
  /** 需要装配的共享轨道排列声明 */
  compositionScaffolds: Array<SharedScaffold>;
  /** 影响组合默认策略的排列存在性 */
  compositionPolicyContext: {
    /** 组合中是否存在分面排列 */
    hasFacets: boolean;
    /** 组合中是否存在共享轨道排列 */
    hasScaffolds: boolean;
  };
  /** 已确定的坐标视图及默认选择 */
  coordinateScopes: CoordinateScopeRegistry;
  /** 当前 Plot 的完整辅助图元声明 */
  allGuides: Array<IRPlotGuide>;
  /** 已应用组合间距偏移的辅助图元声明 */
  allGuidesWithCompositionGap: Array<IRPlotGuide>;
  /** placement containment 对各 coordinate scope 提出的 role range 收窄 */
  placementRoleRangeOverridesByScope?: ReadonlyMap<string, Partial<Record<DimensionRole, readonly [number, number]>>>;
};

/** scoped/scaffold frame 解析结果及后续 facet/mark lowering 需要的 scope 查询 */
export type ScopedFramesResolution = {
  /** 完成解析的坐标视图注册表 */
  coordinateScopes: CoordinateScopeRegistry;
  /** 按视图身份索引的坐标作用域 */
  scopeById: Map<string, CoordinateScopeRegistryEntry>;
  /** 生成写入输出图元的坐标作用域上下文 */
  scopeContextOf: (scope: CoordinateScopeRegistryEntry) => JsonObject;
  /** 结合显式配置与组合种类确定指定维度的轴展示策略 */
  axisPolicyFor: (
    resolve: CompositionResolve | undefined,
    context: { hasFacets: boolean; hasScaffolds: boolean },
    dimension: DimensionRole,
  ) => CompositionAxisPolicy;
  /** 按坐标视图身份索引的有效坐标帧 */
  frameByScope: Map<string, CoordinateFrame>;
  /** 下沉后承载网格线的场景作用域 */
  gridLayers: Array<IRScope>;
  /** 下沉后承载坐标轴的场景作用域 */
  axisLayers: Array<IRScope>;
  /** 布局计算得到的绘图区矩形 */
  plotArea: Rect;
};

/** 解析 composition 中 root、overlay、track 与 scaffold 的共享 frame */
export const resolveScopedFrames = (context: ScopedFramesResolveContext): ScopedFramesResolution => {
  const {
    node,
    dataView,
    width,
    height,
    options,
    provenance,
    scaleRegistry,
    markDataViews,
    compositionLayout,
    compositionResolve,
    compositionFacets,
    compositionScaffolds,
    compositionPolicyContext,
    coordinateScopes,
    allGuides,
    allGuidesWithCompositionGap,
    placementRoleRangeOverridesByScope,
  } = context;

  const coordinateRegistry = resolveCoordinateRegistry(options.coordinates);
  const scopeById = new Map(coordinateScopes.scopes.map(scope => [scope.id, scope] as const));
  const coordinateResolveContextOf = (
    source: IRPlot,
    guides: Array<IRPlotGuide>,
    overrides: Partial<CoordinateResolveContext> = {},
  ): CoordinateResolveContext => ({
    coordinate: source.coordinate,
    markPadding: context.markPadding,
    rows: dataView.rows,
    model: dataView.model,
    width,
    height,
    fontSize: options.fontSize ?? DEFAULT_FONT_SIZE,
    margin: options.margin,
    provenance,
    coordinateRegistry,
    fieldOrderRegistry: context.fieldOrderRegistry,
    scaleRegistry,
    legendReserve: legendReserveOf(guides.flatMap(guide => (guide.type === PlotGuide.Legend ? [guide] : []))),
    lowerGuide,
    lowerCustomAxis,
    resolveGuideTicks,
    resolveVisibleGuideTicks,
    ...overrides,
  });

  const scopeContextOf = (scope: CoordinateScopeRegistryEntry): JsonObject => {
    if (node.composition === undefined) return {};

    const scopeMeta: JsonObject = { coordinateView: scope.id };
    if (scope.placement?.kind === 'track') {
      scopeMeta.arrangement = scope.placement.scaffold;
      scopeMeta.track = scope.placement.track;
    }

    return scopeMeta;
  };

  const scaffoldById = new Map(compositionScaffolds.map(scaffold => [scaffold.id, scaffold] as const));
  const arrangementLayoutOf = (arrangement: CoordinateArrangement | undefined): CompositionLayout | undefined =>
    resolveArrangementLayout(compositionLayout, arrangement);
  const arrangementResolveOf = (arrangement: CoordinateArrangement | undefined): CompositionResolve | undefined =>
    resolveArrangementPolicy(compositionResolve, arrangement);
  const scopeArrangementOf = (scope: CoordinateScopeRegistryEntry): CoordinateArrangement | undefined =>
    scope.placement?.kind === 'track' ? scaffoldById.get(scope.placement.scaffold) : undefined;
  const scopeLayoutOf = (scope: CoordinateScopeRegistryEntry): CompositionLayout | undefined =>
    arrangementLayoutOf(scopeArrangementOf(scope));
  const scopeResolveOf = (scope: CoordinateScopeRegistryEntry): CompositionResolve | undefined =>
    arrangementResolveOf(scopeArrangementOf(scope));
  const axisPolicyFor = (
    resolve: CompositionResolve | undefined,
    compositionState: { hasFacets: boolean; hasScaffolds: boolean },
    dimension: DimensionRole,
  ): CompositionAxisPolicy => compositionAxisPolicyOf(resolve, compositionState, dimension);

  const rolesOf = (coordinate: IRPlotCoordinateOperation): ReadonlySet<DimensionRole> => {
    return new Set(resolveCoordinateDefinition(coordinate, { coordinateRegistry }).roles);
  };

  const assertScaffoldRole = (role: DimensionRole, roles: ReadonlySet<DimensionRole>, scaffoldId: string): void => {
    if (!roles.has(role)) {
      throw new RetikzPlotError(
        `lowerPlots: scaffold "${scaffoldId}" shared role "${role}" is not supported by its coordinate`,
      );
    }
  };

  const assertTrackRole = (role: DimensionRole, roles: ReadonlySet<DimensionRole>, scopeId: string): void => {
    if (!roles.has(role)) {
      throw new RetikzPlotError(
        `lowerPlots: coordinate view "${scopeId}" track band role "${role}" is not supported by its coordinate`,
      );
    }
  };

  const roleRangeOf = (
    frameResolution: CoordinateFrameResolution,
    role: DimensionRole,
    scopeDescription: string,
  ): readonly [number, number] => {
    const range = frameResolution.frame.roleScales?.[role]?.range();
    if (range === undefined) {
      throw new RetikzPlotError(`lowerPlots: ${scopeDescription} does not expose a scale range for role "${role}"`);
    }

    return range;
  };

  const trackIndexOf = (scaffold: SharedScaffold, track: ScaffoldTrack): { index: number; count: number } => {
    const ordered = scaffold.tracks
      .filter(candidate => candidate.band.role === track.band.role)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.band.start - b.band.start || a.band.end - b.band.end);
    return { index: ordered.findIndex(candidate => candidate.id === track.id), count: ordered.length };
  };

  const bandRangeOf = (
    range: readonly [number, number],
    track: ScaffoldTrack,
    scaffold: SharedScaffold,
  ): readonly [number, number] => {
    const delta = range[1] - range[0];
    const start = range[0] + delta * track.band.start;
    const end = range[0] + delta * track.band.end;
    const gap = arrangementLayoutOf(scaffold)?.trackGap ?? 0;
    if (gap === 0) return [start, end];

    const { index, count } = trackIndexOf(scaffold, track);
    const direction = delta >= 0 ? 1 : -1;
    const adjustedStart = start + (index > 0 ? direction * (gap / 2) : 0);
    const adjustedEnd = end - (index >= 0 && index < count - 1 ? direction * (gap / 2) : 0);
    if ((delta >= 0 && adjustedStart >= adjustedEnd) || (delta < 0 && adjustedStart <= adjustedEnd)) {
      throw new RetikzPlotError(`lowerPlots: trackGap ${gap} leaves no range for track "${track.id}"`);
    }

    return [adjustedStart, adjustedEnd];
  };

  const intersectRoleRanges = (
    currentRange: readonly [number, number],
    placementRange: readonly [number, number],
    role: DimensionRole,
    scopeId: string,
  ): readonly [number, number] => {
    const low = Math.max(Math.min(...currentRange), Math.min(...placementRange));
    const high = Math.min(Math.max(...currentRange), Math.max(...placementRange));
    if (low >= high) {
      throw new RetikzPlotError(
        `lowerPlots: position adjustment containment leaves no drawable range for role "${role}" in coordinate view "${scopeId}"`,
      );
    }

    return currentRange[0] <= currentRange[1] ? [low, high] : [high, low];
  };

  const trackScopesByScaffold = new Map<string, Array<CoordinateScopeRegistryEntry>>();

  for (const scope of coordinateScopes.scopes) {
    if (scope.placement?.kind !== 'track') continue;

    const entries = trackScopesByScaffold.get(scope.placement.scaffold) ?? [];
    entries.push(scope);
    trackScopesByScaffold.set(scope.placement.scaffold, entries);
  }

  const coordinateScaleNameOf = (scope: CoordinateScopeRegistryEntry, role: DimensionRole): string | undefined => {
    const value = (scope.coordinate as Record<string, unknown>)[role];
    return typeof value === 'string' ? value : undefined;
  };

  const scopeSharesAxisRole = (
    source: CoordinateScopeRegistryEntry,
    target: CoordinateScopeRegistryEntry,
    dimension: DimensionRole,
  ): boolean => {
    if (source.id === target.id) return true;
    if (source.placement?.kind === 'track' && target.placement?.kind === 'track') {
      if (source.placement.scaffold === target.placement.scaffold) {
        const scaffold = scaffoldById.get(source.placement.scaffold);
        if (scaffold?.sharedRoles.includes(dimension)) return true;
      }
    }

    const sourceScale = coordinateScaleNameOf(source, dimension);
    const targetScale = coordinateScaleNameOf(target, dimension);

    return sourceScale !== undefined && sourceScale === targetScale;
  };

  const selectorMatchesScope = (selector: GridTargetSelector, scope: CoordinateScopeRegistryEntry): boolean => {
    if (selector.view !== undefined) {
      const views = Array.isArray(selector.view) ? selector.view : [selector.view];
      if (views.includes(scope.id)) return true;
    }

    if (selector.track !== undefined && scope.placement?.kind === 'track') {
      const scaffoldMatches =
        selector.track.arrangement === undefined || selector.track.arrangement === scope.placement.scaffold;
      const trackIds =
        selector.track.id === undefined
          ? undefined
          : Array.isArray(selector.track.id)
            ? selector.track.id
            : [selector.track.id];
      const trackMatches = trackIds === undefined || trackIds.includes(scope.placement.track);

      return scaffoldMatches && trackMatches;
    }

    return false;
  };

  const axisGridTargetsScope = (guide: IRPlotAxisGuide, scope: CoordinateScopeRegistryEntry): boolean => {
    const sourceScope = scopeById.get(axisGuideScopeIdOf(guide, coordinateScopes.defaultScope));
    if (sourceScope === undefined) return false;

    const applyTo = axisGridApplyToOf(guide, scopeResolveOf(sourceScope), compositionPolicyContext);
    if (applyTo === null) return false;
    if (applyTo === AxisGridApplyTo.None) return false;
    if (applyTo === AxisGridApplyTo.Local) return sourceScope.id === scope.id;
    if (applyTo === AxisGridApplyTo.All) return scopeSharesAxisRole(sourceScope, scope, guide.dimension);

    const selector = axisGridSelectorOf(guide);

    return selector !== undefined && selectorMatchesScope(selector, scope);
  };

  const gridGuidesForScope = (scope: CoordinateScopeRegistryEntry): Array<IRPlotAxisGuide> =>
    allGuides.flatMap(guide =>
      isAxisGuide(guide) && axisGridTargetsScope(guide, scope) ? [withEnabledAxisGrid(guide, scope.id)] : [],
    );

  const assertSelectedGridTargetsScopes = (): void => {
    for (const guide of allGuides) {
      if (!isAxisGuide(guide)) continue;

      const sourceScope = scopeById.get(axisGuideScopeIdOf(guide, coordinateScopes.defaultScope));
      if (sourceScope === undefined) continue;
      if (axisGridApplyToOf(guide, scopeResolveOf(sourceScope), compositionPolicyContext) !== AxisGridApplyTo.Selected)
        continue;

      const count = coordinateScopes.scopes.filter(scope => axisGridTargetsScope(guide, scope)).length;
      if (count === 0) {
        throw new RetikzPlotError(
          `lowerPlots: axis grid selector for dimension "${guide.dimension}" matches no target scope`,
        );
      }
    }
  };

  const resolvedFrames = new Map<string, CoordinateFrameResolution & { scopeId: string }>();
  const scaffoldFrames = new Map<string, CoordinateFrameResolution>();
  const resolvingFrames = new Set<string>();

  const resolveScaffoldFrame = (scaffold: SharedScaffold): CoordinateFrameResolution => {
    const cached = scaffoldFrames.get(scaffold.id);
    if (cached !== undefined) return cached;

    const scaffoldRoles = rolesOf(scaffold.coordinate);

    for (const role of scaffold.sharedRoles) assertScaffoldRole(role, scaffoldRoles, scaffold.id);

    for (const track of scaffold.tracks) assertTrackRole(track.band.role, scaffoldRoles, scaffold.id);
    const scaffoldScopeIds = new Set((trackScopesByScaffold.get(scaffold.id) ?? []).map(scope => scope.id));
    const scaffoldMarkDataViews = markDataViews.filter(view =>
      scaffoldScopeIds.has(coordinateScopeIdOf(view.mark, coordinateScopes.defaultScope)),
    );
    const scaffoldNode: IRPlot = {
      ...node,
      coordinate: scaffold.coordinate,
      composition: undefined,
      marks: scaffoldMarkDataViews.map(view => view.mark),
      guides: [],
    };
    const scaffoldLayout = arrangementLayoutOf(scaffold);
    const resolved = resolveCoordinateFrame(
      scaffoldNode,
      coordinateResolveContextOf(scaffoldNode, [], {
        margin: mergeCompositionMargin(scaffoldLayout?.padding, options.margin),
        labelGap: scaffoldLayout?.labelGap,
        markDataViews: scaffoldMarkDataViews,
      }),
    );
    scaffoldFrames.set(scaffold.id, resolved);

    return resolved;
  };

  const resolveScopedFrame = (scope: CoordinateScopeRegistryEntry): CoordinateFrameResolution & { scopeId: string } => {
    const cached = resolvedFrames.get(scope.id);
    if (cached !== undefined) return cached;
    if (resolvingFrames.has(scope.id)) {
      throw new RetikzPlotError(`lowerPlots: overlay coordinate view cycle detected at "${scope.id}"`);
    }

    resolvingFrames.add(scope.id);
    const targetPlotArea =
      scope.placement?.kind === CoordinateViewPlacementKind.Overlay
        ? resolveScopedFrame(scopeById.get(scope.placement.target) ?? scope).plotArea
        : undefined;
    const trackPlacement = scope.placement?.kind === 'track' ? scope.placement : undefined;
    const scaffold = trackPlacement !== undefined ? scaffoldById.get(trackPlacement.scaffold) : undefined;
    const track =
      scaffold !== undefined && trackPlacement !== undefined
        ? scaffold.tracks.find(candidate => candidate.id === trackPlacement.track)
        : undefined;
    const scaffoldFrame = scaffold !== undefined ? resolveScaffoldFrame(scaffold) : undefined;
    const roleMarkDataViews: Record<string, Array<MarkDataView>> = {};
    const roleRangeOverrides: Partial<Record<DimensionRole, readonly [number, number]>> = {};
    if (scaffold !== undefined && track !== undefined && scaffoldFrame !== undefined) {
      const scopeRoles = rolesOf(scope.coordinate);
      const scaffoldScopeIds = new Set((trackScopesByScaffold.get(scaffold.id) ?? []).map(entry => entry.id));
      const scaffoldMarkDataViews = markDataViews.filter(view =>
        scaffoldScopeIds.has(coordinateScopeIdOf(view.mark, coordinateScopes.defaultScope)),
      );

      for (const role of scaffold.sharedRoles) {
        assertScaffoldRole(role, scopeRoles, scaffold.id);
        roleMarkDataViews[role] = scaffoldMarkDataViews;
        roleRangeOverrides[role] = roleRangeOf(scaffoldFrame, role, `scaffold "${scaffold.id}"`);
      }

      assertTrackRole(track.band.role, scopeRoles, scope.id);
      const baseBandRange = roleRangeOf(scaffoldFrame, track.band.role, `scaffold "${scaffold.id}"`);
      roleRangeOverrides[track.band.role] = bandRangeOf(baseBandRange, track, scaffold);
    }

    for (const [role, placementRange] of Object.entries(placementRoleRangeOverridesByScope?.get(scope.id) ?? {})) {
      if (placementRange === undefined) continue;

      const currentRange = roleRangeOverrides[role];
      roleRangeOverrides[role] =
        currentRange === undefined ? placementRange : intersectRoleRanges(currentRange, placementRange, role, scope.id);
    }

    const scopedMarkDataViews = markDataViews.filter(
      view => coordinateScopeIdOf(view.mark, coordinateScopes.defaultScope) === scope.id,
    );
    if (scaffold === undefined) {
      for (const role of rolesOf(scope.coordinate)) {
        const scaleName = coordinateScaleNameOf(scope, role);
        if (scaleName === undefined) continue;

        const sharedViews = markDataViews.filter(view => {
          const viewScope = scopeById.get(coordinateScopeIdOf(view.mark, coordinateScopes.defaultScope));
          return viewScope !== undefined && coordinateScaleNameOf(viewScope, role) === scaleName;
        });
        if (sharedViews.length > scopedMarkDataViews.length) roleMarkDataViews[role] = sharedViews;
      }
    }

    const scopedArrangement = scopeArrangementOf(scope);
    const scopedLayout = scopeLayoutOf(scope);
    const rawScopedGuides = (scopedArrangement === undefined ? allGuidesWithCompositionGap : allGuides).filter(
      guide => {
        if (!isAxisGuide(guide)) return true;
        if (axisGuideScopeIdOf(guide, coordinateScopes.defaultScope) !== scope.id) return false;
        return axisPolicyFor(scopeResolveOf(scope), compositionPolicyContext, guide.dimension) !== 'none';
      },
    );
    const scopedGuides = withoutAxisGrid(
      scopedArrangement === undefined ? rawScopedGuides : withAxisGapOffsets(rawScopedGuides, scopedLayout?.axisGap),
    );
    const scopedGridGuides = gridGuidesForScope(scope);
    const scopedNode: IRPlot = {
      ...node,
      coordinate: scope.coordinate,
      composition: undefined,
      marks: scopedMarkDataViews.map(view => view.mark),
      guides: scopedGuides,
    };

    const rawResolution = resolveCoordinateFrame(
      scopedNode,
      coordinateResolveContextOf(scopedNode, scopedGuides, {
        margin: mergeCompositionMargin(scopedLayout?.padding, options.margin),
        labelGap: scopedLayout?.labelGap,
        ...(targetPlotArea !== undefined ? { plotAreaOverride: targetPlotArea } : {}),
        ...(scaffoldFrame !== undefined && (scaffold?.frame ?? ScaffoldFrameMode.Shared) === ScaffoldFrameMode.Shared
          ? { plotAreaOverride: scaffoldFrame.plotArea }
          : {}),
        ...(Object.keys(roleRangeOverrides).length > 0 ? { roleRangeOverrides } : {}),
        domainPaddingScope: scope.id,
        paddingMarkDataViews: scopedMarkDataViews,
        markDataViews: scopedMarkDataViews,
        ...(Object.keys(roleMarkDataViews).length > 0 ? { roleMarkDataViews } : {}),
      }),
    );

    const gridResolution =
      scopedGridGuides.length > 0
        ? resolveCoordinateFrame(
            { ...scopedNode, guides: scopedGridGuides },
            coordinateResolveContextOf({ ...scopedNode, guides: scopedGridGuides }, scopedGridGuides, {
              margin: mergeCompositionMargin(scopedLayout?.padding, options.margin),
              labelGap: scopedLayout?.labelGap,
              plotAreaOverride: rawResolution.plotArea,
              ...(Object.keys(roleRangeOverrides).length > 0 ? { roleRangeOverrides } : {}),
              domainPaddingScope: scope.id,
              paddingMarkDataViews: scopedMarkDataViews,
              markDataViews: scopedMarkDataViews,
              ...(Object.keys(roleMarkDataViews).length > 0 ? { roleMarkDataViews } : {}),
            }),
          )
        : undefined;

    const scopeContext = scopeContextOf(scope);
    const resolved = {
      scopeId: scope.id,
      ...rawResolution,
      gridLayers: (gridResolution?.gridLayers ?? []).map(layer => withScopeContext(layer, scopeContext) as IRScope),
      axisLayers: rawResolution.axisLayers.map(layer => withScopeContext(layer, scopeContext) as IRScope),
    };

    resolvingFrames.delete(scope.id);
    resolvedFrames.set(scope.id, resolved);

    return resolved;
  };

  const facets = compositionFacets;
  if (facets.length === 0) assertSelectedGridTargetsScopes();
  const scopedFrames = coordinateScopes.scopes.map(resolveScopedFrame);
  const frameByScope = new Map(scopedFrames.map(scopeFrame => [scopeFrame.scopeId, scopeFrame.frame] as const));
  const gridLayers = scopedFrames.flatMap(scopeFrame => scopeFrame.gridLayers);
  const axisLayers = scopedFrames.flatMap(scopeFrame => scopeFrame.axisLayers);
  const plotArea = scopedFrames[0]?.plotArea ?? { x: 0, y: 0, width, height };

  return { coordinateScopes, scopeById, scopeContextOf, axisPolicyFor, frameByScope, gridLayers, axisLayers, plotArea };
};
