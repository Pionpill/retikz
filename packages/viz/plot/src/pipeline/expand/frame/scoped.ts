import type { IRJsonObject, IRScope } from '@retikz/core';
import type { DataView } from '@retikz/data';

import type { AnyScaleDefinition, CoordinateFrame, DimensionRole } from '../../../contract';
import type { ProvenanceContext } from '../../../contract';
import type {
  CompositionAxisPolicyValue,
  CompositionLayout,
  CompositionResolve,
  CoordinateArrangement,
  FacetGrid,
  GridTargetSelector,
  ScaffoldTrack,
  SharedScaffold,
} from '../../../resolve/composition';
import type { CoordinateScopeRegistry, CoordinateScopeRegistryEntry } from '../../../resolve/composition';
import type { CoordinateFrameResolution, CoordinateResolveContext, MarkDataView } from '../../../resolve/coordinate';
import type { IRPlot, IRPlotAxisGuide, IRPlotCoordinateOperation, IRPlotGuide } from '../../../schemas';
import type { Rect } from '../../../shared';
import type { LowerPlotsOptions } from '../types';

import { RetikzPlotError } from '../../../error';
import { resolveCoordinateRegistry } from '../../../providers';
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
import { resolveCoordinateDefinition, resolveCoordinateFrame } from '../../../resolve/coordinate';
import { resolveGuideTicks, resolveVisibleGuideTicks } from '../../../resolve/guide';
import { AxisGridApplyTo, CoordinateViewPlacementKind, PlotGuide, ScaffoldFrameMode } from '../../../schemas';
import { DEFAULT_FONT_SIZE } from '../../../shared';
import { lowerCustomAxis, lowerGuide } from '../../guide';
import { withEnabledAxisGrid, withoutAxisGrid, withScopeContext } from '../composition';
import { legendReserveOf } from '../legend';

/** scoped/scaffold frame 解析所需的显式上下文 */
export type ScopedFramesResolveContext = {
  node: IRPlot;
  dataView: DataView;
  width: number;
  height: number;
  options: LowerPlotsOptions;
  provenance?: ProvenanceContext;
  scaleRegistry: Map<string, AnyScaleDefinition>;
  markDataViews: Array<MarkDataView>;
  compositionLayout?: CompositionLayout;
  compositionResolve?: CompositionResolve;
  compositionFacets: Array<FacetGrid>;
  compositionScaffolds: Array<SharedScaffold>;
  compositionPolicyContext: { hasFacets: boolean; hasScaffolds: boolean };
  coordinateScopes: CoordinateScopeRegistry;
  allGuides: Array<IRPlotGuide>;
  allGuidesWithCompositionGap: Array<IRPlotGuide>;
};

/** scoped/scaffold frame 解析结果及后续 facet/mark lowering 需要的 scope 查询 */
export type ScopedFramesResolution = {
  coordinateScopes: CoordinateScopeRegistry;
  scopeById: Map<string, CoordinateScopeRegistryEntry>;
  scopeContextOf: (scope: CoordinateScopeRegistryEntry) => IRJsonObject;
  axisPolicyFor: (
    resolve: CompositionResolve | undefined,
    context: { hasFacets: boolean; hasScaffolds: boolean },
    dimension: DimensionRole,
  ) => CompositionAxisPolicyValue;
  frameByScope: Map<string, CoordinateFrame>;
  gridLayers: Array<IRScope>;
  axisLayers: Array<IRScope>;
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
  } = context;
  const coordinateRegistry = resolveCoordinateRegistry(options.coordinates);
  const scopeById = new Map(coordinateScopes.scopes.map(scope => [scope.id, scope] as const));
  const coordinateResolveContextOf = (
    source: IRPlot,
    guides: Array<IRPlotGuide>,
    overrides: Partial<CoordinateResolveContext> = {},
  ): CoordinateResolveContext => ({
    coordinate: source.coordinate,
    rows: dataView.rows,
    fieldTypes: dataView.fieldTypes,
    fieldTypeEvidence: dataView.fieldTypeEvidence,
    width,
    height,
    fontSize: options.fontSize ?? DEFAULT_FONT_SIZE,
    margin: options.margin,
    provenance,
    coordinateRegistry,
    scaleRegistry,
    legendReserve: legendReserveOf(guides.flatMap(guide => (guide.type === PlotGuide.Legend ? [guide] : []))),
    lowerGuide,
    lowerCustomAxis,
    resolveGuideTicks,
    resolveVisibleGuideTicks,
    ...overrides,
  });
  const scopeContextOf = (scope: CoordinateScopeRegistryEntry): IRJsonObject => {
    if (node.composition === undefined) return {};
    const scopeMeta: IRJsonObject = { coordinateView: scope.id };
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
  ): CompositionAxisPolicyValue => compositionAxisPolicyOf(resolve, compositionState, dimension);
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
