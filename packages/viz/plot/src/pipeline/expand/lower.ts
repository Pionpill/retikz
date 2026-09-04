import type {
  IRChild,
  IRJsonObject,
  IRNode,
  IRScope,
  LayoutAxisProposal,
  LayoutCompositeDefinition,
  ResolvedTheme,
} from '@retikz/core';
import type { DataLineageOptions, DataLineageRun, DataView, ExternalDatasets } from '@retikz/data';

import {
  categoricalColorAt,
  defineComposite,
  LayoutAxisProposalKind,
  LayoutChildProbeKind,
  resolveDefaultCoreThemeColors,
  ThemeMode,
} from '@retikz/core';
import { applyTransformsToDataView, applyTransformsToDataViewWithLineage, tagSourceIndex } from '@retikz/data';
import { assertAllValuesValid, validateBoundData } from '@retikz/data';

import type {
  AnyScaleDefinition,
  CoordinateFrame,
  DatumIdRegistrar,
  DimensionRole,
  ProvenanceContext,
} from '../../contract';
import type { ChannelResolveContext } from '../../resolve/channel';
import type {
  CompositionLayout,
  CompositionResolution,
  CompositionResolve,
  CoordinateArrangement,
  FacetGrid,
  FacetLabelDimension,
  FacetPanel,
  FacetScalar,
  GridTargetSelector,
} from '../../resolve/composition';
import type { CoordinateFrameResolution, CoordinateResolveContext } from '../../resolve/coordinate';
import type {
  IRPlot,
  IRPlotAxisGuide,
  IRPlotCoordinateOperation,
  IRPlotGuide,
  IRPlotMarkOperation,
  IRPlotTransform,
} from '../../schemas';
import type { Rect } from '../../shared';
import type { LowerPlotsOptions, MarkDataView } from './types';

import { PositionScaleContinuity, rootMeta, slug } from '../../contract';
import { RetikzPlotError } from '../../error';
import { isPolarCoordinateFrame, resolveCoordinateRegistry } from '../../providers';
import { lowerMark, makeColorSchemeResolver, resolveChannelRegistry } from '../../providers';
import { resolveMarkChannels } from '../../resolve/channel';
import {
  axisGridApplyToOf,
  axisGridSelectorOf,
  axisGuideScopeIdOf,
  buildFacetLabelGroups,
  coordinateScopeIdOf,
  facetDimensionsOf,
  facetHeaderLabelRotateOf,
  facetHeaderLabelStyleOf,
  facetLabelTextOf,
  isAxisGuide,
  isFacetHeaderVisible,
  isLegendGuide,
  mergeCompositionMargin,
  resolveArrangementLayout,
  resolveArrangementPolicy,
  resolveComposition,
  resolveFacetPanels,
  scalarSelectorIncludes,
  withAxisGapOffsets,
} from '../../resolve/composition';
import { resolveCoordinateFrame } from '../../resolve/coordinate';
import { resolveGuideTicks, resolveVisibleGuideTicks } from '../../resolve/guide';
import { resolveMarkOperation } from '../../resolve/mark';
import { orderedCategoryDomain, resolveChannelScale, resolvePositionScaleContinuity } from '../../resolve/scale';
import {
  resolveAxisGuideTokens,
  resolvePlotAxisGuideTheme,
  resolvePlotAxisThemeTokens,
  resolvePlotGuideTheme,
  resolvePlotTheme,
} from '../../resolve/theme';
import {
  AxisGridApplyTo,
  CoordinateViewPlacementKind,
  PLOT_NAMESPACE,
  PlotCoordinate,
  PlotLayerZIndex,
  PlotSchema,
} from '../../schemas';
import { DEFAULT_FONT_SIZE, DEFAULT_PLOT_HEIGHT, DEFAULT_PLOT_WIDTH } from '../../shared';
import { createAnchorRegistry } from '../anchors';
import { lowerCustomAxis, lowerGuide } from '../guide';
import { resolveMarkPlacement, resolveMarkPlacementRangeOverrides } from '../placement';
import { createDatumIdRegistrar } from '../provenance';
import { withEnabledAxisGrid, withoutAxisGrid, withScopeContext } from './composition';
import { applyMarkTransforms, prepareRows } from './data';
import { resolveScopedFrames } from './frame';
import { buildLegendLayers, collectChannelDescriptors, legendReserveOf, reserveLegendBands } from './legend';

/** 判断坐标帧是否具有可承载背景与区域锚点的二维绘图区 */
const supportsPlotArea = (frame: CoordinateFrame | undefined): boolean =>
  frame?.type !== PlotCoordinate.Cartesian1D && frame?.type !== PlotCoordinate.Polar1D;

const coordinateScaleNameOf = (coordinate: IRPlotCoordinateOperation, role: DimensionRole): string | undefined => {
  const field =
    coordinate.type === PlotCoordinate.Polar1D || coordinate.type === PlotCoordinate.Polar2D
      ? role === 'x'
        ? 'angle'
        : role === 'y'
          ? 'radius'
          : role
      : role;
  const value = (coordinate as Record<string, unknown>)[field];
  return typeof value === 'string' ? value : undefined;
};

const rangesEqual = (left: readonly [number, number], right: readonly [number, number]): boolean =>
  Math.abs(left[0] - right[0]) <= 1e-6 && Math.abs(left[1] - right[1]) <= 1e-6;

/** 显式 continuous range 不允许被 placement containment 静默收窄 */
const assertPlacementRangeCompatible = (
  plot: IRPlot,
  coordinate: IRPlotCoordinateOperation,
  role: DimensionRole,
  candidateRange: readonly [number, number],
  boundaryRange: readonly [number, number] | undefined,
  scaleRegistry: ReadonlyMap<string, AnyScaleDefinition>,
): void => {
  if (boundaryRange === undefined || rangesEqual(candidateRange, boundaryRange)) return;
  const scaleName = coordinateScaleNameOf(coordinate, role);
  if (scaleName === undefined) return;
  const scaleOperation = plot.scales.find(operation => operation.name === scaleName);
  if (scaleOperation === undefined) return;
  const authoredRange = (scaleOperation as Record<string, unknown>).range;
  if (
    !Array.isArray(authoredRange) ||
    authoredRange.length !== 2 ||
    !authoredRange.every(value => typeof value === 'number') ||
    resolvePositionScaleContinuity(scaleOperation, { registry: scaleRegistry }) !== PositionScaleContinuity.Continuous
  ) {
    return;
  }
  throw new RetikzPlotError(
    `lowerPlots: explicit range of scale "${scaleName}" for role "${role}" cannot satisfy position adjustment containment`,
  );
};

/** 按首次出现顺序为默认颜色组与未分组 mark 分配连续色板槽位 */
const defaultColorPaletteIndicesOf = (marks: ReadonlyArray<IRPlotMarkOperation>): ReadonlyArray<number> => {
  const indices = new Map<string, number>();
  let nextIndex = 0;
  return marks.map(mark => {
    const group = mark.defaultColorGroup;
    if (group === undefined) return nextIndex++;
    const existing = indices.get(group);
    if (existing !== undefined) return existing;
    const index = nextIndex++;
    indices.set(group, index);
    return index;
  });
};

/** 按坐标帧的实际绘图区几何生成背景节点 */
const plotBackgroundNode = (
  plotArea: Rect,
  frame: CoordinateFrame | undefined,
  fill: IRNode['fill'] | undefined,
  masterColor: string,
): IRNode | null => {
  if (!supportsPlotArea(frame) || fill === undefined || fill === 'none') return null;
  const geometry =
    frame !== undefined && isPolarCoordinateFrame(frame)
      ? { position: frame.center, shape: 'circle' as const, minimumSize: frame.outerRadius * 2 }
      : {
          position: [plotArea.x + plotArea.width / 2, plotArea.y + plotArea.height / 2] as [number, number],
          shape: 'rectangle' as const,
          minimumSize: { width: plotArea.width, height: plotArea.height },
        };
  return {
    type: 'node',
    ...geometry,
    padding: 0,
    strokeWidth: 0,
    color: masterColor,
    fill,
    zIndex: PlotLayerZIndex.Background,
  };
};

/** 只把 Plot typography 主色投影到 presentation guide 图层，不污染数据 mark 图层 */
const withGuideMasterColor = (layer: IRScope, masterColor: string): IRScope =>
  layer.color === undefined ? { ...layer, color: masterColor } : layer;

const withLayerZIndex = (child: IRChild, zIndex: number): IRChild =>
  child.type === 'coordinate' ? child : { ...child, zIndex };

/** 把复制进 facet panel 的 guide 图层收进 panel-local identity，避免各 panel 复用同一顶层 scope id */
const withFacetGuideContext = (
  layer: IRScope,
  context: IRJsonObject,
  plotId: string | undefined,
  panelId: string,
): IRScope => {
  const scoped = withScopeContext(layer, context) as IRScope;
  if (plotId === undefined || scoped.id === undefined) return scoped;
  const plotPrefix = `${plotId}.`;
  const localId = scoped.id.startsWith(plotPrefix) ? scoped.id.slice(plotPrefix.length) : scoped.id;
  return { ...scoped, id: `${plotId}.view.${slug(panelId)}.${localId}` };
};

const DEFAULT_PLOT_THEME: ResolvedTheme = {
  mode: ThemeMode.Light,
  colors: resolveDefaultCoreThemeColors(ThemeMode.Light),
};

/** 根据父级 proposal 解析 Plot 单轴的最终 lowering 尺寸 */
const resolvePlotAxisSize = (intrinsic: number, proposal: LayoutAxisProposal): number => {
  if (proposal.kind === LayoutAxisProposalKind.Exact) return proposal.value;
  if (proposal.kind === LayoutAxisProposalKind.Range) {
    const bounded = Math.max(proposal.min, intrinsic);
    return proposal.max === undefined ? bounded : Math.min(proposal.max, bounded);
  }
  return intrinsic;
};

/** Plot 数据阶段的一次性解析产物，供场景下沉与运行时附属结果共用 */
export type PlotDataArtifact = {
  /** 根级变换后的数据视图 */
  rootDataView: DataView;
  /** 根作用域内各图元完成局部变换后的数据视图 */
  rootMarkDataViews: Array<MarkDataView>;
  /** 根级变换的数据追溯；仅在追溯入口生成 */
  rootLineage?: DataLineageRun;
  /** 与实际 markDataViews 同序的图元局部数据追溯；仅在追溯入口生成 */
  markLineages?: Array<DataLineageRun>;
  /** 基于 rootDataView 生成的规范化组合解析结果 */
  compositionResolution: CompositionResolution;
  /** 本次场景下沉实际消费的图元数据视图 */
  markDataViews: Array<MarkDataView>;
  /** 本次场景下沉实际解析的坐标框架，以坐标作用域标识索引 */
  frameByCoordinateScopeId: ReadonlyMap<string, CoordinateFrame>;
};

/** Plot 下沉与数据产物的一次性运行结果 */
export type PlotDataArtifactLowerResult = {
  /** 下沉得到的Core IR */
  child: IRChild;
  /** 本次下沉实际消费的数据产物 */
  dataArtifact: PlotDataArtifact;
};

/**
 * 把一个Plot IR根节点与外部数据一次性解析并下沉，同时返回runtime sidecar可复用的数据artifact
 * @description 编排：校验 ref/scale → 收集轴值 → 建归一化 scale → 建投影器（resolveFrame）→ 各 mark 下沉 → 包 localNamespace Scope。
 *   root id → Scope.id（plot-design §8.1）；provenance 开 → 外层 Scope + 各层 / datum 带来源 meta + `<plotId>.` 内部 id
 */
export const lowerPlotWithDataArtifact = (
  node: IRPlot,
  datasets: ExternalDatasets,
  options: LowerPlotsOptions = {},
  effectiveTheme: ResolvedTheme = DEFAULT_PLOT_THEME,
  lineageOptions?: DataLineageOptions,
): PlotDataArtifactLowerResult => {
  // 自描述尺寸：节点自带 width/height 优先（组合时各面板本性尺寸），缺省回退全局选项、再回退默认
  const width = node.width ?? options.width ?? DEFAULT_PLOT_WIDTH;
  const height = node.height ?? options.height ?? DEFAULT_PLOT_HEIGHT;
  // 绘图区尺寸是 scale range / 投影的单一来源；非有限或非正数会一路污染出 cx="NaN" 等坏坐标——入口抛清晰错误
  if (!Number.isFinite(width) || width <= 0) {
    throw new RetikzPlotError(`lowerPlots: width must be a positive finite number, got ${width}`);
  }
  if (!Number.isFinite(height) || height <= 0) {
    throw new RetikzPlotError(`lowerPlots: height must be a positive finite number, got ${height}`);
  }

  if (!Object.hasOwn(datasets, node.data.reference)) {
    throw new RetikzPlotError(`lowerPlots: dataset "${node.data.reference}" not found in provided datasets`);
  }

  // provenance 总开关：provenance / datumProvenance / datumIdField 任一开即启用（后两者蕴含 provenance）；
  // 全关 → undefined；下游不写 provenance id/meta。
  const provenanceEnabled =
    options.provenance === true || options.datumProvenance === true || options.datumIdField !== undefined;
  const provenance: ProvenanceContext | undefined = provenanceEnabled
    ? {
        plotId: node.id,
        dataReference: node.data.reference,
        datumProvenance: options.datumProvenance ?? false,
        datumIdField: options.datumIdField,
      }
    : undefined;

  // 取数：provenance 开时先打源序标记（symbol 键，跨 transform 存活，供 sourceIndex 回指），再过 transform 管线
  const ingested = provenance ? tagSourceIndex(datasets[node.data.reference]) : datasets[node.data.reference];

  // fieldMaps 校验 + 用户源字段类型解析（strict）+ ingest 恒归一化。与 locator 共用 prepareRows 保 parity。
  // 类型 Map 是 type-driven scale / coercion 的单一真源；归一化置于 transform 前、无论有无 model 都跑（恒 canonical）。
  const {
    fieldTypes,
    fieldTypeEvidence,
    normalized,
    transformRegistry,
    transformContext,
    scaleRegistry,
    markRegistry,
    positionAdjustmentRegistry,
  } = prepareRows(node, datasets, options, ingested);
  // scheme 解析器：内置 scheme + options.colorSchemes；channel scale 取色 / legend ramp 共用。
  const resolveColorScheme = makeColorSchemeResolver(options.colorSchemes);
  if (options.validateData) {
    const sampleRows = typeof options.validateData === 'object' ? (options.validateData.sampleRows ?? 100) : 100;
    validateBoundData(normalized, fieldTypes, sampleRows);
  }
  // invalid:'error'：transform 之前对 spec 参与字段（= fieldTypes 键）全量校验，遇任一非法 / 缺失 fail-loud；
  //   置于 transform 前 → 错误定位到原始源字段、不被 transform 改写干扰。默认 'skip' 不校验（哨兵留给下游跳）。
  if (options.invalid === 'error') {
    assertAllValuesValid(normalized, fieldTypes);
  }

  const normalizedDataView: DataView = { rows: normalized, fieldTypes, fieldTypeEvidence };
  const rootTransformResult =
    lineageOptions === undefined
      ? undefined
      : applyTransformsToDataViewWithLineage(normalizedDataView, node.transform, {
          registry: transformRegistry,
          context: transformContext,
          lineage: lineageOptions,
        });
  const rootDataView =
    rootTransformResult?.dataView ??
    applyTransformsToDataView(normalizedDataView, node.transform, transformRegistry, transformContext);
  const compositionResolution = resolveComposition(node);
  const {
    coordinateScopes,
    layout: compositionLayout,
    resolve: compositionResolve,
    facets: compositionFacets,
    scaffolds: compositionScaffolds,
    policyContext: compositionPolicyContext,
  } = compositionResolution;
  /** 在一个明确DataView scope内执行一次mark-local transform并保留可选lineage */
  const resolveMarkTransform = (mark: IRPlotMarkOperation, markIndex: number, inputDataView: DataView) => {
    const transform = (mark as { transform?: Array<IRPlotTransform> }).transform;
    if (lineageOptions === undefined || transform === undefined) {
      return {
        markDataView: {
          markIndex,
          mark,
          dataView: applyMarkTransforms(mark, inputDataView, transformRegistry, transformContext),
        } satisfies MarkDataView,
        ...(lineageOptions !== undefined ? { lineage: { events: [] } satisfies DataLineageRun } : {}),
      };
    }
    const result = applyTransformsToDataViewWithLineage(inputDataView, transform, {
      registry: transformRegistry,
      context: transformContext,
      lineage: lineageOptions,
    });
    return {
      markDataView: { markIndex, mark, dataView: result.dataView } satisfies MarkDataView,
      lineage: result.lineage,
    };
  };
  const rootMarkResults = node.marks.map((mark, markIndex) => resolveMarkTransform(mark, markIndex, rootDataView));
  const rootMarkDataViews = rootMarkResults.map(result => result.markDataView);
  const markDataViews: Array<MarkDataView> = rootMarkDataViews;
  const themeResolution = resolvePlotTheme(
    effectiveTheme,
    {
      plotThemeTokens: node.plotThemeTokens,
      plotThemeTokenRules: node.plotThemeTokenRules,
      plotTheme: node.plotTheme,
    },
    options.plotThemeStyles,
  );
  const resolvedTheme = resolvePlotGuideTheme(themeResolution.plotTheme, themeResolution.palette);
  const defaultColorPaletteIndices = defaultColorPaletteIndicesOf(node.marks);
  const themedGuides: Array<IRPlotGuide> = (node.guides ?? []).map(guide => {
    if (!isAxisGuide(guide)) return guide;
    const axisTokens = resolvePlotAxisThemeTokens(themeResolution, guide.dimension);
    return resolveAxisGuideTokens(resolvePlotAxisGuideTheme(resolvedTheme, axisTokens), guide);
  });
  const allGuides: Array<IRPlotGuide> = themedGuides;
  const allGuidesWithCompositionGap = withAxisGapOffsets(allGuides, compositionLayout?.axisGap);
  const coordinateRegistry = resolveCoordinateRegistry(options.coordinates);
  const coordinateResolveContextOf = (
    source: IRPlot,
    frameDataView: DataView,
    guides: Array<IRPlotGuide>,
    overrides: Partial<CoordinateResolveContext> = {},
  ): CoordinateResolveContext => ({
    coordinate: source.coordinate,
    rows: frameDataView.rows,
    fieldTypes: frameDataView.fieldTypes,
    fieldTypeEvidence: frameDataView.fieldTypeEvidence,
    width,
    height,
    fontSize: options.fontSize ?? DEFAULT_FONT_SIZE,
    margin: options.margin,
    provenance,
    coordinateRegistry,
    scaleRegistry,
    legendReserve: legendReserveOf(guides.filter(isLegendGuide)),
    lowerGuide,
    lowerCustomAxis,
    resolveGuideTicks,
    resolveVisibleGuideTicks,
    ...overrides,
  });

  // 通道 registry：内置 definition 先注册，自定义 definition 再合并；mark / node / path 通道统一解析。
  const channelRegistry = resolveChannelRegistry({
    custom: options.channelDefinitions,
    resolveLabel: options.resolveLabel,
  });
  const channelCtx: ChannelResolveContext = {
    node,
    rows: rootDataView.rows,
    fieldTypes: rootDataView.fieldTypes,
    fieldTypeEvidence: rootDataView.fieldTypeEvidence,
    channelRegistry,
    markRegistry,
    defaultColor: categoricalColorAt(resolvedTheme.palette.series, 0),
    resolveChannelScale: (operation, values, context) =>
      resolveChannelScale(operation, values, context, { registry: scaleRegistry }),
    resolveCategoryDomain: orderedCategoryDomain,
    resolveColorScheme,
    palette: resolvedTheme.palette,
  };
  const scopedFramesContext = {
    node,
    dataView: rootDataView,
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
  };
  type ScopedPlacementRanges = ReadonlyMap<string, Partial<Record<DimensionRole, readonly [number, number]>>>;
  const frameRoleRangesOf = (
    frames: ReadonlyMap<string, CoordinateFrame>,
  ): Map<string, Partial<Record<DimensionRole, readonly [number, number]>>> =>
    new Map(
      [...frames].map(([scopeId, frame]) => [
        scopeId,
        Object.fromEntries(
          frame.roles.flatMap(role => {
            const range = frame.roleScales?.[role]?.range();
            return range === undefined ? [] : [[role, range]];
          }),
        ),
      ]),
    );
  const intersectPlacementRanges = (
    currentRange: readonly [number, number],
    candidateRange: readonly [number, number],
    role: DimensionRole,
    scopeId: string,
  ): readonly [number, number] => {
    const low = Math.max(Math.min(...currentRange), Math.min(...candidateRange));
    const high = Math.min(Math.max(...currentRange), Math.max(...candidateRange));
    if (low >= high) {
      throw new RetikzPlotError(
        `lowerPlots: position adjustment containment leaves no drawable range for role "${role}" in coordinate view "${scopeId}"`,
      );
    }
    return currentRange[0] <= currentRange[1] ? [low, high] : [high, low];
  };
  const placementRangesEqual = (left: ScopedPlacementRanges, right: ScopedPlacementRanges): boolean => {
    if (left.size !== right.size) return false;
    for (const [scopeId, leftByRole] of left) {
      const rightByRole = right.get(scopeId);
      if (rightByRole === undefined) return false;
      const roles = Object.keys(leftByRole);
      if (roles.length !== Object.keys(rightByRole).length) return false;
      for (const role of roles) {
        const leftRange = leftByRole[role];
        const rightRange = rightByRole[role];
        if (
          leftRange === undefined ||
          rightRange === undefined ||
          Math.abs(leftRange[0] - rightRange[0]) > 1e-6 ||
          Math.abs(leftRange[1] - rightRange[1]) > 1e-6
        ) {
          return false;
        }
      }
    }
    return true;
  };
  const resolveScopedPlacementRanges = (
    frames: ReadonlyMap<string, CoordinateFrame>,
    boundaryRangesByScope: ScopedPlacementRanges,
  ): Map<string, Partial<Record<DimensionRole, readonly [number, number]>>> => {
    const rangesByScope = new Map<string, Partial<Record<DimensionRole, readonly [number, number]>>>();
    for (const { dataView, mark, markIndex } of markDataViews) {
      const scopeId = coordinateScopeIdOf(mark, coordinateScopes.defaultScope);
      const frame = frames.get(scopeId);
      if (frame === undefined) continue;
      const operationResolution = resolveMarkOperation(mark, { registry: markRegistry });
      const markChannels = resolveMarkChannels(mark, {
        ...channelCtx,
        rows: dataView.rows,
        fieldTypes: dataView.fieldTypes,
        fieldTypeEvidence: dataView.fieldTypeEvidence,
        defaultColor: categoricalColorAt(
          resolvedTheme.palette.series,
          defaultColorPaletteIndices[markIndex] ?? markIndex,
        ),
      });
      const markRanges = resolveMarkPlacementRangeOverrides(
        operationResolution,
        dataView.rows,
        frame,
        markChannels,
        { width, height },
        positionAdjustmentRegistry,
        boundaryRangesByScope.get(scopeId),
      );
      if (markRanges === undefined) continue;
      const scopeRanges = rangesByScope.get(scopeId) ?? {};
      const coordinateScope = coordinateScopes.scopes.find(scope => scope.id === scopeId);
      for (const [role, candidateRange] of Object.entries(markRanges)) {
        if (candidateRange === undefined) continue;
        if (coordinateScope !== undefined) {
          assertPlacementRangeCompatible(
            node,
            coordinateScope.coordinate,
            role,
            candidateRange,
            boundaryRangesByScope.get(scopeId)?.[role],
            scaleRegistry,
          );
        }
        const currentRange = scopeRanges[role];
        scopeRanges[role] =
          currentRange === undefined
            ? candidateRange
            : intersectPlacementRanges(currentRange, candidateRange, role, scopeId);
      }
      rangesByScope.set(scopeId, scopeRanges);
    }
    return rangesByScope;
  };

  let scopedFramesResolution = resolveScopedFrames(scopedFramesContext);
  if (compositionFacets.length === 0) {
    const boundaryRangesByScope = frameRoleRangesOf(scopedFramesResolution.frameByScope);
    let placementRangesByScope: ScopedPlacementRanges = new Map();
    let didPlacementConverge = false;
    for (let pass = 0; pass < 12; pass += 1) {
      const nextRanges = resolveScopedPlacementRanges(scopedFramesResolution.frameByScope, boundaryRangesByScope);
      if (placementRangesEqual(placementRangesByScope, nextRanges)) {
        didPlacementConverge = true;
        break;
      }
      placementRangesByScope = nextRanges;
      scopedFramesResolution = resolveScopedFrames({
        ...scopedFramesContext,
        placementRoleRangeOverridesByScope: placementRangesByScope,
      });
    }
    if (!didPlacementConverge) {
      throw new RetikzPlotError('lowerPlots: position adjustment containment did not converge');
    }
  }
  const { scopeById, scopeContextOf, axisPolicyFor, frameByScope, gridLayers, axisLayers, plotArea } =
    scopedFramesResolution;
  const dataArtifact: PlotDataArtifact = {
    rootDataView,
    rootMarkDataViews,
    ...(rootTransformResult !== undefined ? { rootLineage: rootTransformResult.lineage } : {}),
    ...(lineageOptions !== undefined
      ? { markLineages: rootMarkResults.map(result => result.lineage ?? { events: [] }) }
      : {}),
    compositionResolution,
    markDataViews,
    frameByCoordinateScopeId: frameByScope,
  };
  const facets = compositionFacets;
  const arrangementLayoutOf = (arrangement: CoordinateArrangement | undefined): CompositionLayout | undefined =>
    resolveArrangementLayout(compositionLayout, arrangement);
  const arrangementResolveOf = (arrangement: CoordinateArrangement | undefined): CompositionResolve | undefined =>
    resolveArrangementPolicy(compositionResolve, arrangement);

  // plot 级 datum id 登记器：datumIdField + plotId 在时建一份，线穿全 mark——跨 mark 共享 seen，
  // 两 datum-bearing mark（point + bar）撞同 `<plotId>.datum.<value>` 即 fail loud（#2）。
  const registerDatumId: DatumIdRegistrar | undefined =
    provenance && provenance.datumIdField !== undefined && provenance.plotId !== undefined
      ? createDatumIdRegistrar(provenance.datumIdField, provenance.plotId)
      : undefined;
  const anchorRegistry = createAnchorRegistry({ plotId: node.id, generators: options.anchorIdGenerators });

  if (facets.length > 0) {
    const defaultScope = coordinateScopes.scopes.find(scope => scope.id === coordinateScopes.defaultScope);
    if (defaultScope === undefined) {
      throw new RetikzPlotError(
        `lowerPlots: default coordinate view "${coordinateScopes.defaultScope}" is not registered`,
      );
    }

    const usedFacetScopeIds = new Set(coordinateScopes.scopes.map(scope => scope.id));
    const panels = facets.flatMap(facet => resolveFacetPanels(facet, rootDataView.rows, usedFacetScopeIds));
    const panelMarkResults = panels.map(panel => {
      const panelDataView: DataView = {
        rows: panel.rows,
        fieldTypes: rootDataView.fieldTypes,
        fieldTypeEvidence: rootDataView.fieldTypeEvidence,
      };
      return {
        panelDataView,
        markResults: node.marks.map((mark, markIndex) => resolveMarkTransform(mark, markIndex, panelDataView)),
      };
    });
    const sharedFacetMarkDataViews: Array<MarkDataView> = node.marks.map((mark, markIndex) => {
      const scopedDataViews = panelMarkResults.map(
        panelResult => panelResult.markResults[markIndex].markDataView.dataView,
      );
      const fallbackDataView = rootMarkDataViews[markIndex]?.dataView ?? rootDataView;
      const representativeDataView = scopedDataViews[0] ?? fallbackDataView;
      return {
        markIndex,
        mark,
        dataView: {
          rows: scopedDataViews.flatMap(dataView => dataView.rows),
          fieldTypes: representativeDataView.fieldTypes,
          fieldTypeEvidence: representativeDataView.fieldTypeEvidence,
        },
      };
    });
    dataArtifact.markDataViews = sharedFacetMarkDataViews;
    if (lineageOptions !== undefined) {
      dataArtifact.markLineages = node.marks.map((_mark, markIndex) => ({
        events: panelMarkResults.flatMap(panelResult => panelResult.markResults[markIndex]?.lineage?.events ?? []),
      }));
    }
    const maxColumnIndex = panels.reduce((max, panel) => Math.max(max, panel.columnIndex), 0);
    const maxRowIndex = panels.reduce((max, panel) => Math.max(max, panel.rowIndex), 0);
    const facetLayout = arrangementLayoutOf(facets[0]);
    const panelGap = facetLayout?.panelGap ?? 0;
    const facetLabelsEnabled = facets.some(
      facet => isFacetHeaderVisible(facet, 'row') || isFacetHeaderVisible(facet, 'column'),
    );
    const rowFacetLevelCount = facetLabelsEnabled
      ? Math.max(
          0,
          ...facets.map(facet => (isFacetHeaderVisible(facet, 'row') ? facetDimensionsOf(facet.row).length : 0)),
        )
      : 0;
    const columnFacetLevelCount = facetLabelsEnabled
      ? Math.max(
          0,
          ...facets.map(facet => (isFacetHeaderVisible(facet, 'column') ? facetDimensionsOf(facet.column).length : 0)),
        )
      : 0;
    const facetLabelBandSize =
      facetLabelsEnabled && (rowFacetLevelCount > 0 || columnFacetLevelCount > 0)
        ? Math.max((options.fontSize ?? DEFAULT_FONT_SIZE) + 10, 22)
        : 0;
    const facetLabelGap = facetLabelsEnabled ? (facetLayout?.labelGap ?? facetLabelBandSize) : 0;
    const rowLabelGap = rowFacetLevelCount > 0 ? facetLabelGap : 0;
    const columnLabelGap = columnFacetLevelCount > 0 ? facetLabelGap : 0;
    const rowLabelWidth = rowFacetLevelCount * facetLabelBandSize + rowLabelGap;
    const columnLabelHeight = columnFacetLevelCount * facetLabelBandSize + columnLabelGap;
    const panelGridWidth = width - rowLabelWidth;
    const panelGridHeight = height - columnLabelHeight;
    const columnCount = maxColumnIndex + 1;
    const rowCount = maxRowIndex + 1;
    const panelWidth = (panelGridWidth - Math.max(0, columnCount - 1) * panelGap) / columnCount;
    const panelHeight = (panelGridHeight - Math.max(0, rowCount - 1) * panelGap) / rowCount;
    if (panelWidth <= 0 || panelHeight <= 0) {
      throw new RetikzPlotError(
        `lowerPlots: panelGap ${panelGap} leaves no room for ${columnCount}x${rowCount} facet panels`,
      );
    }
    const panelStrideX = panelWidth + panelGap;
    const panelStrideY = panelHeight + panelGap;
    const makeFacetLabelScope = (
      facet: FacetGrid,
      dimension: FacetLabelDimension,
      level: number,
      startIndex: number,
      span: number,
      value: FacetScalar,
      rect: Rect,
    ): IRScope => {
      const localStyle = facetHeaderLabelStyleOf(facet, dimension);
      const style = {
        ...resolvedTheme.typography,
        ...localStyle,
        ...(resolvedTheme.typography.font !== undefined || localStyle?.font !== undefined
          ? { font: { ...(resolvedTheme.typography.font ?? {}), ...(localStyle?.font ?? {}) } }
          : {}),
      };
      const rotate = facetHeaderLabelRotateOf(facet, dimension);
      const maxTextWidth = style.maxTextWidth ?? Math.max(1, ((rotate ?? 0) === 0 ? rect.width : rect.height) - 8);
      const position: [number, number] = [rect.x + rect.width / 2, rect.y + rect.height / 2];
      return {
        type: 'scope',
        color: resolvedTheme.typography.textColor ?? 'currentColor',
        zIndex: PlotLayerZIndex.FacetLabel,
        meta: {
          source: 'plot',
          layer: 'facetLabel',
          facet: facet.id,
          dimension,
          level,
          value,
          startIndex,
          span,
        },
        nodeDefault: { fill: 'none', stroke: 'none', padding: 0 },
        children: [
          {
            type: 'node',
            position,
            text: facetLabelTextOf(facet, dimension, level, value),
            ...style,
            ...(rotate !== undefined ? { rotate } : {}),
            maxTextWidth,
          },
        ],
      };
    };
    const facetLabelScopes: Array<IRScope> = facetLabelsEnabled
      ? facets.flatMap(facet => {
          const facetPanels = panels.filter(panel => panel.facet.id === facet.id);
          const rowLevels = isFacetHeaderVisible(facet, 'row') ? facetDimensionsOf(facet.row).length : 0;
          const columnLevels = isFacetHeaderVisible(facet, 'column') ? facetDimensionsOf(facet.column).length : 0;
          const labels: Array<IRScope> = [];
          for (let level = columnLevels - 1; level >= 0; level -= 1) {
            const bandIndex = columnLevels - 1 - level;
            for (const group of buildFacetLabelGroups(facetPanels, 'column', level)) {
              const rect: Rect = {
                x: rowLabelWidth + group.startIndex * panelStrideX,
                y: panelGridHeight + columnLabelGap + bandIndex * facetLabelBandSize,
                width: group.span * panelWidth + Math.max(0, group.span - 1) * panelGap,
                height: facetLabelBandSize,
              };
              labels.push(makeFacetLabelScope(facet, 'column', level, group.startIndex, group.span, group.value, rect));
            }
          }
          for (let level = rowLevels - 1; level >= 0; level -= 1) {
            const bandIndex = rowFacetLevelCount - rowLevels + level;
            for (const group of buildFacetLabelGroups(facetPanels, 'row', level)) {
              const rect: Rect = {
                x: bandIndex * facetLabelBandSize,
                y: group.startIndex * panelStrideY,
                width: facetLabelBandSize,
                height: group.span * panelHeight + Math.max(0, group.span - 1) * panelGap,
              };
              labels.push(makeFacetLabelScope(facet, 'row', level, group.startIndex, group.span, group.value, rect));
            }
          }
          return labels;
        })
      : [];
    const facetGuides = withAxisGapOffsets(
      allGuides.filter(
        guide => !isAxisGuide(guide) || axisGuideScopeIdOf(guide, coordinateScopes.defaultScope) === defaultScope.id,
      ),
      facetLayout?.axisGap,
    );
    const keepOuterSharedAxisForPanel = (guide: IRPlotGuide, panel: FacetPanel): boolean => {
      const resolve = arrangementResolveOf(panel.facet);
      if (!isAxisGuide(guide)) return true;
      const policy = axisPolicyFor(resolve, { hasFacets: true, hasScaffolds: false }, guide.dimension);
      if (policy === 'none') return false;
      if (policy !== 'outerShared') {
        return true;
      }
      const sharing = resolve?.scale?.[guide.dimension] ?? 'shared';
      if (sharing === 'independent') return true;
      if (guide.dimension === 'x') return panel.rowIndex === maxRowIndex;
      if (guide.dimension === 'y') return panel.columnIndex === 0;
      return panel.rowIndex === 0 && panel.columnIndex === 0;
    };
    const axisConsumesFacetPanelLayout = (guide: IRPlotGuide, panel: FacetPanel): boolean => {
      if (!isAxisGuide(guide)) return true;
      const resolve = arrangementResolveOf(panel.facet);
      const policy = axisPolicyFor(resolve, { hasFacets: true, hasScaffolds: false }, guide.dimension);
      if (policy !== 'outerShared') return true;
      const sharing = resolve?.scale?.[guide.dimension] ?? 'shared';
      if (sharing === 'independent') return true;
      return guide.dimension !== 'x';
    };
    const selectorMatchesFacetPanel = (selector: GridTargetSelector, panel: FacetPanel): boolean => {
      if (selector.view !== undefined) {
        const views = Array.isArray(selector.view) ? selector.view : [selector.view];
        if (views.includes(panel.id)) return true;
      }
      if (selector.facet === undefined) return false;
      const facetMatches = selector.facet.arrangement === undefined || selector.facet.arrangement === panel.facet.id;
      const rowMatches = scalarSelectorIncludes(selector.facet.row, panel.row);
      const columnMatches = scalarSelectorIncludes(selector.facet.column, panel.column);
      return facetMatches && rowMatches && columnMatches;
    };
    const axisGridTargetsFacetPanel = (guide: IRPlotAxisGuide, panel: FacetPanel): boolean => {
      const applyTo = axisGridApplyToOf(guide, arrangementResolveOf(panel.facet), {
        hasFacets: true,
        hasScaffolds: false,
      });
      if (applyTo === null) return false;
      if (applyTo === AxisGridApplyTo.None) return false;
      if (applyTo === AxisGridApplyTo.Local || applyTo === AxisGridApplyTo.All) return true;
      const selector = axisGridSelectorOf(guide);
      return selector !== undefined && selectorMatchesFacetPanel(selector, panel);
    };
    const facetAxisGuidesForPanel = (panel: FacetPanel): Array<IRPlotGuide> =>
      withoutAxisGrid(facetGuides.filter(guide => keepOuterSharedAxisForPanel(guide, panel)));
    const facetFrameGuidesForPanel = (panel: FacetPanel): Array<IRPlotGuide> =>
      withoutAxisGrid(
        facetGuides.filter(
          guide => keepOuterSharedAxisForPanel(guide, panel) && axisConsumesFacetPanelLayout(guide, panel),
        ),
      );
    const facetGridGuidesForPanel = (panel: FacetPanel): Array<IRPlotGuide> =>
      facetGuides.flatMap(guide =>
        isAxisGuide(guide) && axisGridTargetsFacetPanel(guide, panel) ? [withEnabledAxisGrid(guide, undefined)] : [],
      );
    for (const guide of facetGuides) {
      if (!isAxisGuide(guide)) continue;
      const hasSelectedTarget = panels.some(
        panel =>
          axisGridApplyToOf(guide, arrangementResolveOf(panel.facet), {
            hasFacets: true,
            hasScaffolds: false,
          }) === AxisGridApplyTo.Selected,
      );
      if (!hasSelectedTarget) continue;
      const count = panels.filter(panel => axisGridTargetsFacetPanel(guide, panel)).length;
      if (count === 0) {
        throw new RetikzPlotError(
          `lowerPlots: axis grid selector for dimension "${guide.dimension}" matches no target facet panel`,
        );
      }
    }

    const resolveFacetFrameWithPlacement = (
      panel: FacetPanel,
      panelNode: IRPlot,
      panelDataView: DataView,
      panelMarkDataViews: Array<MarkDataView>,
      panelFrameGuides: Array<IRPlotGuide>,
      panelLayout: CompositionLayout | undefined,
      roleMarkDataViews: Record<string, Array<MarkDataView>>,
    ): CoordinateFrameResolution => {
      const frameContext = (roleRangeOverrides?: Partial<Record<DimensionRole, readonly [number, number]>>) =>
        coordinateResolveContextOf(panelNode, panelDataView, panelFrameGuides, {
          width: panelWidth,
          height: panelHeight,
          margin: mergeCompositionMargin(panelLayout?.padding, options.margin),
          labelGap: panelLayout?.labelGap,
          markDataViews: sharedFacetMarkDataViews,
          roleMarkDataViews,
          ...(roleRangeOverrides === undefined ? {} : { roleRangeOverrides }),
        });
      let resolution = resolveCoordinateFrame(panelNode, frameContext());
      const boundaryRanges = Object.fromEntries(
        resolution.frame.roles.flatMap(role => {
          const range = resolution.frame.roleScales?.[role]?.range();
          return range === undefined ? [] : [[role, range]];
        }),
      ) as Partial<Record<DimensionRole, readonly [number, number]>>;
      let currentRanges: ScopedPlacementRanges = new Map();
      let didConverge = false;
      for (let pass = 0; pass < 12; pass += 1) {
        const nextByRole: Partial<Record<DimensionRole, readonly [number, number]>> = {};
        for (const { dataView, mark, markIndex } of panelMarkDataViews) {
          const operationResolution = resolveMarkOperation(mark, { registry: markRegistry });
          const markChannels = resolveMarkChannels(mark, {
            ...channelCtx,
            rows: dataView.rows,
            fieldTypes: dataView.fieldTypes,
            fieldTypeEvidence: dataView.fieldTypeEvidence,
            defaultColor: categoricalColorAt(
              resolvedTheme.palette.series,
              defaultColorPaletteIndices[markIndex] ?? markIndex,
            ),
          });
          const markRanges = resolveMarkPlacementRangeOverrides(
            operationResolution,
            dataView.rows,
            resolution.frame,
            markChannels,
            { width: panelWidth, height: panelHeight },
            positionAdjustmentRegistry,
            boundaryRanges,
          );
          if (markRanges === undefined) continue;
          for (const [role, candidateRange] of Object.entries(markRanges)) {
            if (candidateRange === undefined) continue;
            if (panelNode.coordinate !== undefined) {
              assertPlacementRangeCompatible(
                panelNode,
                panelNode.coordinate,
                role,
                candidateRange,
                boundaryRanges[role],
                scaleRegistry,
              );
            }
            const currentRange = nextByRole[role];
            nextByRole[role] =
              currentRange === undefined
                ? candidateRange
                : intersectPlacementRanges(currentRange, candidateRange, role, panel.id);
          }
        }
        const nextRanges: ScopedPlacementRanges =
          Object.keys(nextByRole).length === 0 ? new Map() : new Map([[panel.id, nextByRole]]);
        if (placementRangesEqual(currentRanges, nextRanges)) {
          didConverge = true;
          break;
        }
        currentRanges = nextRanges;
        resolution = resolveCoordinateFrame(panelNode, frameContext(nextByRole));
      }
      if (!didConverge) {
        throw new RetikzPlotError(
          `lowerPlots: position adjustment containment did not converge for facet panel "${panel.id}"`,
        );
      }
      return resolution;
    };

    const panelScopes: Array<IRScope> = panels.map((panel, panelIndex) => {
      const panelAxisGuides = facetAxisGuidesForPanel(panel);
      const panelFrameGuides = facetFrameGuidesForPanel(panel);
      const panelResult = panelMarkResults[panelIndex];
      const panelDataView = panelResult.panelDataView;
      const panelMarkDataViews = panelResult.markResults.map(markResult => markResult.markDataView);
      const roleMarkDataViews: Record<string, Array<MarkDataView>> = {};
      for (const [role, sharing] of Object.entries(arrangementResolveOf(panel.facet)?.scale ?? {})) {
        if (sharing === 'independent') roleMarkDataViews[role] = panelMarkDataViews;
      }
      const panelNode: IRPlot = {
        ...node,
        coordinate: panel.facet.coordinate ?? defaultScope.coordinate,
        composition: undefined,
        marks: node.marks,
        guides: panelFrameGuides,
      };
      const panelLayout = arrangementLayoutOf(panel.facet);
      const frameResolution = resolveFacetFrameWithPlacement(
        panel,
        panelNode,
        panelDataView,
        panelMarkDataViews,
        panelFrameGuides,
        panelLayout,
        roleMarkDataViews,
      );
      const axisResolution =
        panelAxisGuides.length === panelFrameGuides.length
          ? frameResolution
          : resolveCoordinateFrame(
              { ...panelNode, guides: panelAxisGuides },
              coordinateResolveContextOf({ ...panelNode, guides: panelAxisGuides }, panelDataView, panelAxisGuides, {
                width: panelWidth,
                height: panelHeight,
                margin: mergeCompositionMargin(panelLayout?.padding, options.margin),
                labelGap: panelLayout?.labelGap,
                plotAreaOverride: frameResolution.plotArea,
                markDataViews: sharedFacetMarkDataViews,
                roleMarkDataViews,
              }),
            );
      const panelGridGuides = facetGridGuidesForPanel(panel);
      const gridResolution =
        panelGridGuides.length > 0
          ? resolveCoordinateFrame(
              { ...panelNode, guides: panelGridGuides },
              coordinateResolveContextOf({ ...panelNode, guides: panelGridGuides }, panelDataView, panelGridGuides, {
                width: panelWidth,
                height: panelHeight,
                margin: mergeCompositionMargin(panelLayout?.padding, options.margin),
                labelGap: panelLayout?.labelGap,
                plotAreaOverride: frameResolution.plotArea,
                markDataViews: sharedFacetMarkDataViews,
                roleMarkDataViews,
              }),
            )
          : undefined;
      const facetContext: IRJsonObject = { id: panel.facet.id };
      if (panel.row !== undefined) facetContext.row = panel.row;
      if (panel.column !== undefined) facetContext.column = panel.column;
      const panelContext: IRJsonObject = { coordinateView: panel.id, facet: facetContext };
      const backgroundNode = plotBackgroundNode(
        frameResolution.plotArea,
        frameResolution.frame,
        resolvedTheme.plotArea?.fill,
        resolvedTheme.typography.textColor ?? 'currentColor',
      );
      const markLayers: Array<IRChild> = node.marks
        .map((mark, markIndex) => {
          const markDataView = panelMarkDataViews[markIndex]?.dataView ?? panelDataView;
          const markRows = markDataView.rows;
          const operationResolution = resolveMarkOperation(mark, { registry: markRegistry });
          const markChannels = resolveMarkChannels(mark, {
            ...channelCtx,
            rows: markRows,
            fieldTypes: markDataView.fieldTypes,
            fieldTypeEvidence: markDataView.fieldTypeEvidence,
            defaultColor: categoricalColorAt(
              resolvedTheme.palette.series,
              defaultColorPaletteIndices[markIndex] ?? markIndex,
            ),
          });
          const positions = resolveMarkPlacement(
            operationResolution,
            markRows,
            frameResolution.frame,
            markChannels,
            { width: panelWidth, height: panelHeight },
            positionAdjustmentRegistry,
          );
          const layer = lowerMark(operationResolution, markRows, frameResolution.frame, markChannels, {
            markIndex,
            plotId: node.id,
            ...(provenance !== undefined ? { provenance: { context: provenance, markIndex, registerDatumId } } : {}),
            anchors: anchorRegistry,
            ...(positions !== undefined ? { positions } : {}),
          });
          return layer === null ? null : withScopeContext(layer, panelContext);
        })
        .filter((layer): layer is IRChild => layer !== null);
      const meta: IRJsonObject = { source: 'plot', layer: 'facetPanel', facet: panel.facet.id };
      if (panel.row !== undefined) meta.row = panel.row;
      if (panel.column !== undefined) meta.column = panel.column;
      const base: IRScope = {
        type: 'scope',
        id: panel.id,
        localNamespace: true,
        meta,
        children: [
          ...(backgroundNode ? [backgroundNode] : []),
          ...(gridResolution?.gridLayers ?? []).map(layer =>
            withGuideMasterColor(
              withFacetGuideContext(layer, panelContext, node.id, panel.id),
              resolvedTheme.typography.textColor ?? 'currentColor',
            ),
          ),
          ...markLayers,
          ...axisResolution.axisLayers.map(layer =>
            withGuideMasterColor(
              withFacetGuideContext(layer, panelContext, node.id, panel.id),
              resolvedTheme.typography.textColor ?? 'currentColor',
            ),
          ),
        ],
      };
      const translateX = rowLabelWidth + panel.columnIndex * panelStrideX;
      const translateY = panel.rowIndex * panelStrideY;
      if (translateX === 0 && translateY === 0) return base;
      return {
        ...base,
        transforms: [
          {
            kind: 'translate',
            x: translateX,
            y: translateY,
          },
        ],
      };
    });

    anchorRegistry.assertResolved();
    const children: Array<IRChild> = [...panelScopes, ...facetLabelScopes];
    if (node.id === undefined) {
      const base: IRScope = { type: 'scope', localNamespace: true, children };
      const child = provenance ? { ...base, meta: rootMeta(provenance.dataReference) } : base;
      return { child, dataArtifact };
    }

    const inner: IRScope = { type: 'scope', localNamespace: true, children };
    const innerContent: IRScope = provenance ? { ...inner, meta: rootMeta(provenance.dataReference) } : inner;
    const facetContentWidth = rowLabelWidth + maxColumnIndex * panelStrideX + panelWidth;
    const facetContentHeight = maxRowIndex * panelStrideY + panelHeight + columnLabelHeight;
    const plotAreaCarrier: IRNode = {
      type: 'node',
      id: `${node.id}.plotArea`,
      position: [facetContentWidth / 2, facetContentHeight / 2],
      shape: 'rectangle',
      minimumSize: { width: facetContentWidth, height: facetContentHeight },
      padding: 0,
      opacity: 0,
    };
    return { child: { type: 'scope', id: node.id, children: [innerContent, plotAreaCarrier] }, dataArtifact };
  }

  // 每个 mark 下沉成一个图层 Scope（样式上提到 nodeDefault/pathDefault）；空图层（无可绘制点）丢弃
  // provenance 开 → 传 markProvenance（plotId / markIndex / datum 开关 + 共享 registerDatumId），各层 / datum 绑 id + 来源 meta
  const scopeOrderById = new Map(coordinateScopes.scopes.map((scope, index) => [scope.id, index] as const));
  const markLayerEntries = markDataViews
    .map(view => {
      const { dataView, mark, markIndex } = view;
      const markRows = dataView.rows;
      const coordinateScopeId = coordinateScopeIdOf(mark, coordinateScopes.defaultScope);
      const frame = frameByScope.get(coordinateScopeId);
      if (frame === undefined) {
        throw new RetikzPlotError(`lowerPlots: coordinateView "${coordinateScopeId}" is not registered`);
      }
      const operationResolution = resolveMarkOperation(mark, { registry: markRegistry });
      const markChannels = resolveMarkChannels(mark, {
        ...channelCtx,
        rows: markRows,
        fieldTypes: dataView.fieldTypes,
        fieldTypeEvidence: dataView.fieldTypeEvidence,
        defaultColor: categoricalColorAt(
          resolvedTheme.palette.series,
          defaultColorPaletteIndices[markIndex] ?? markIndex,
        ),
      });
      const positions = resolveMarkPlacement(
        operationResolution,
        markRows,
        frame,
        markChannels,
        { width, height },
        positionAdjustmentRegistry,
      );
      const layer = lowerMark(operationResolution, markRows, frame, markChannels, {
        markIndex,
        plotId: node.id,
        ...(provenance !== undefined ? { provenance: { context: provenance, markIndex, registerDatumId } } : {}),
        anchors: anchorRegistry,
        ...(positions !== undefined ? { positions } : {}),
      });
      if (layer === null) return null;
      const scope = scopeById.get(coordinateScopeId);
      const scopedLayer = scope === undefined ? layer : withScopeContext(layer, scopeContextOf(scope));
      const semanticLayer = withLayerZIndex(scopedLayer, mark.layer?.zIndex ?? PlotLayerZIndex.Mark);
      const declarationOrder = scopeOrderById.get(coordinateScopeId) ?? markIndex;
      const zIndex =
        scope?.placement?.kind === CoordinateViewPlacementKind.Overlay
          ? (scope.placement.zIndex ?? declarationOrder)
          : declarationOrder;
      return { layer: semanticLayer, markIndex, zIndex };
    })
    .filter((entry): entry is { layer: IRChild; markIndex: number; zIndex: number } => entry !== null);
  const markLayers: Array<IRChild> = markLayerEntries
    .sort((a, b) => a.zIndex - b.zIndex || a.markIndex - b.markIndex)
    .map(entry => entry.layer);
  anchorRegistry.assertResolved();

  // 收 legend guide → 据通道 + scale 类型选形态下沉成独立 scope，落 position 预留带。
  // 占位（band 计算 / plotArea 收窄）见 reserveLegendBands；fail-loud（多 scale 未消歧 / scale 不存在）在 buildLegendLayers 内。
  const legendGuides = allGuides.filter(isLegendGuide);
  const legendLayers: Array<IRScope> = [];
  if (legendGuides.length > 0) {
    const channelDescriptors = collectChannelDescriptors(node, channelCtx, rootMarkDataViews);
    const bands = reserveLegendBands(legendGuides, width, height, plotArea);
    legendLayers.push(
      ...buildLegendLayers(
        node,
        channelDescriptors,
        legendGuides,
        options.fontSize ?? DEFAULT_FONT_SIZE,
        bands,
        channelRegistry,
        scaleRegistry,
        resolvedTheme,
      ),
    );
  }
  // z-order：所有网格层 → marks → 所有轴层 → legend
  const defaultFrame = frameByScope.get(coordinateScopes.defaultScope);
  const guideMasterColor = resolvedTheme.typography.textColor ?? 'currentColor';
  const backgroundNode = plotBackgroundNode(plotArea, defaultFrame, resolvedTheme.plotArea?.fill, guideMasterColor);
  const children: Array<IRChild> = [
    ...(backgroundNode ? [backgroundNode] : []),
    ...gridLayers.map(layer => withGuideMasterColor(layer, guideMasterColor)),
    ...markLayers,
    ...axisLayers.map(layer => withGuideMasterColor(layer, guideMasterColor)),
    ...legendLayers.map(layer => withGuideMasterColor(layer, guideMasterColor)),
  ];

  // 无 id：root = localNamespace 内容 scope（可带 provenance meta）。
  if (node.id === undefined) {
    const base: IRScope = { type: 'scope', localNamespace: true, children };
    const child = provenance ? { ...base, meta: rootMeta(provenance.dataReference) } : base;
    return { child, dataArtifact };
  }

  // 有 id：外层 panel scope（id、非 localNamespace → 面板 bbox 注册父帧、外部可见）
  //   ⊃ [ 内层 localNamespace 内容 scope（封内部 datum/series id、承 provenance meta）, 二维坐标的 plotArea 不可见 carrier ]。
  // 让面板 bbox `<plotId>` 与二维绘图区 `<plotId>.plotArea` 都落在 localNamespace 之外、外部兄弟可锚（组合连线）。
  const inner: IRScope = { type: 'scope', localNamespace: true, children };
  const innerContent: IRScope = provenance ? { ...inner, meta: rootMeta(provenance.dataReference) } : inner;
  if (!supportsPlotArea(defaultFrame)) {
    return { child: { type: 'scope', id: node.id, children: [innerContent] }, dataArtifact };
  }
  // plotArea 精确矩形 carrier：几何 = 扣除轴 / legend 后的绘图区；opacity 0 不可见，仅登记 bbox 锚
  const plotAreaCarrier: IRNode = {
    type: 'node',
    id: `${node.id}.plotArea`,
    position: [plotArea.x + plotArea.width / 2, plotArea.y + plotArea.height / 2],
    shape: 'rectangle',
    minimumSize: { width: plotArea.width, height: plotArea.height },
    padding: 0,
    opacity: 0,
  };
  return { child: { type: 'scope', id: node.id, children: [innerContent, plotAreaCarrier] }, dataArtifact };
};

/** 把一个Plot IR根节点与外部数据下沉成Core IR */
export const lowerPlot = (
  node: IRPlot,
  datasets: ExternalDatasets,
  options: LowerPlotsOptions = {},
  effectiveTheme: ResolvedTheme = DEFAULT_PLOT_THEME,
): IRChild => lowerPlotWithDataArtifact(node, datasets, options, effectiveTheme).child;

/**
 * 构造 plot 的 Tier 2 下沉逻辑，供 core `CompileOptions.composites` 注入
 * @description 数据闭进函数、不进 IR；返回的 CompositeDefinition 把 plot composite 节点展开成 core Scope/Node/Path
 */
export const lowerPlots = (
  datasets: ExternalDatasets,
  options: LowerPlotsOptions = {},
): Array<LayoutCompositeDefinition<IRPlot, typeof PLOT_NAMESPACE, 'plot'>> => [
  defineComposite({
    namespace: PLOT_NAMESPACE,
    type: 'plot',
    schema: PlotSchema,
    compile: (node: IRPlot, context) => {
      const intrinsicWidth = node.width ?? options.width ?? DEFAULT_PLOT_WIDTH;
      const intrinsicHeight = node.height ?? options.height ?? DEFAULT_PLOT_HEIGHT;
      const width = resolvePlotAxisSize(intrinsicWidth, context.proposal.x);
      const height = resolvePlotAxisSize(intrinsicHeight, context.proposal.y);
      const loweredNode: IRPlot = { ...node, width, height };
      const child = lowerPlot(loweredNode, datasets, options, context.theme);
      const probe = context.layoutChild(child, context.proposal);
      if (probe.kind === LayoutChildProbeKind.Failed) return context.raise(probe.failure);
      return {
        children: [context.replay(probe.result)],
        allocationBounds: { x: 0, y: 0, width, height },
      };
    },
  }),
];
