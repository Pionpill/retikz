import type { ExpandCompositeDefinition, IRChild, IRJsonObject, IRNode, IRScope } from '@retikz/core';
import type { ExternalDatasets } from '@retikz/data';

import { defineComposite } from '@retikz/core';
import { applyTransforms, tagSourceIndex } from '@retikz/data';
import { assertAllValuesValid, validateBoundData } from '@retikz/data';

import type { DatumIdRegistrar, ProvenanceContext } from '../../contract';
import type { IRPlotAxisGuide, IRPlotGuide, IRPlotSpec } from '../../schemas';
import type { Rect } from '../../shared';
import type {
  CompositionLayout,
  CompositionResolve,
  CoordinateArrangement,
  FacetGrid,
  FacetLabelDimension,
  FacetPanel,
  FacetScalar,
  GridTargetSelector,
  SharedScaffold,
} from './composition';
import type { LowerPlotsOptions, MarkDataView } from './types';

import { rootMeta, slug } from '../../contract';
import { resolveAxisGuideTokens, resolvePlotTheme } from '../../providers';
import {
  channelKindsForMark,
  lowerMark,
  makeColorSchemeResolver,
  resolveChannelRegistry,
  resolveMarkChannels,
} from '../../providers';
import {
  AxisGridApplyTo,
  CoordinateArrangementKind,
  CoordinateViewPlacementKind,
  PlotLayerZIndex,
  PlotSpecSchema,
} from '../../schemas';
import { DEFAULT_FONT_SIZE, DEFAULT_PLOT_HEIGHT, DEFAULT_PLOT_WIDTH } from '../../shared';
import { createAnchorRegistry } from '../anchors';
import { lowerPlotLabels, resolveLabelReserve } from '../decoration-layout';
import { createDatumIdRegistrar } from '../provenance';
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
  resolveFacetPanels,
  scalarSelectorIncludes,
  withAxisGapOffsets,
  withEnabledAxisGrid,
  withoutAxisGrid,
  withScopeContext,
} from './composition';
import { prepareRows, resolveMarkRows } from './data';
import { resolveFrame, resolveScopedFrames } from './frame';
import { buildLegendLayers, collectChannelDescriptors, reserveLegendBands } from './legend';

const defaultColorOf = (colors: ReadonlyArray<string>, markIndex: number): string => {
  return colors[markIndex % colors.length];
};

const plotBackgroundNode = (width: number, height: number, fill: string | undefined): IRNode | null =>
  fill === undefined
    ? null
    : {
        type: 'node',
        position: [width / 2, height / 2],
        shape: 'rectangle',
        minimumSize: { width, height },
        padding: 0,
        strokeWidth: 0,
        fill,
        zIndex: PlotLayerZIndex.Background,
      };

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

/**
 * 把一个 Plot IR 根节点 + 外部数据下沉成一个 core Scope
 * @description 编排：校验 ref/scale → 收集轴值 → 建归一化 scale → 建投影器（resolveFrame）→ 各 mark 下沉 → 包 localNamespace Scope。
 *   root id → Scope.id（plot-design §8.1）；provenance 开 → 外层 Scope + 各层 / datum 带来源 meta + `<plotId>.` 内部 id
 */
const expandPlot = (node: IRPlotSpec, datasets: ExternalDatasets, options: LowerPlotsOptions): IRChild => {
  // 自描述尺寸：节点自带 width/height 优先（组合时各面板本性尺寸），缺省回退全局选项、再回退默认
  const width = node.width ?? options.width ?? DEFAULT_PLOT_WIDTH;
  const height = node.height ?? options.height ?? DEFAULT_PLOT_HEIGHT;
  // 绘图区尺寸是 scale range / 投影的单一来源；非有限或非正数会一路污染出 cx="NaN" 等坏坐标——入口抛清晰错误
  if (!Number.isFinite(width) || width <= 0) {
    throw new Error(`lowerPlots: width must be a positive finite number, got ${width}`);
  }
  if (!Number.isFinite(height) || height <= 0) {
    throw new Error(`lowerPlots: height must be a positive finite number, got ${height}`);
  }

  if (!Object.hasOwn(datasets, node.data.reference)) {
    throw new Error(`lowerPlots: dataset "${node.data.reference}" not found in provided datasets`);
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
  const { fieldTypes, normalized, transformRegistry, transformContext, scaleRegistry, markRegistry } = prepareRows(
    node,
    datasets,
    options,
    ingested,
  );
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

  const rows = applyTransforms(normalized, node.transform, transformRegistry, transformContext);
  const markDataViews: Array<MarkDataView> = node.marks.map(mark => ({
    mark,
    rows: resolveMarkRows(mark, rows, transformRegistry, transformContext),
  }));

  const compositionLayout = node.composition?.spacing;
  const compositionArrangements = node.composition?.arrangements ?? [];
  const compositionFacets = compositionArrangements.filter(
    (arrangement): arrangement is FacetGrid => arrangement.kind === CoordinateArrangementKind.Facet,
  );
  const compositionScaffolds = compositionArrangements.filter(
    (arrangement): arrangement is SharedScaffold => arrangement.kind === CoordinateArrangementKind.Tracks,
  );
  const compositionResolve = node.composition?.resolve;
  const compositionPolicyContext = {
    hasFacets: compositionFacets.length > 0,
    hasScaffolds: compositionScaffolds.length > 0,
  };
  const resolvedTheme = resolvePlotTheme(node.theme, node.colors);
  const labelReserve = resolveLabelReserve({
    layout: node.layout,
    labels: node.labels ?? [],
    fontSize: options.fontSize ?? DEFAULT_FONT_SIZE,
    textStyle: resolvedTheme.labelText,
  });
  const scopedLabelReserve = node.composition === undefined ? labelReserve : undefined;
  const allGuides: Array<IRPlotGuide> = (node.guides ?? []).map(guide =>
    isAxisGuide(guide) ? resolveAxisGuideTokens(resolvedTheme, guide) : guide,
  );
  const allGuidesWithCompositionGap = withAxisGapOffsets(allGuides, compositionLayout?.axisGap);
  const { coordinateScopes, scopeById, scopeContextOf, axisPolicyFor, frameByScope, gridLayers, axisLayers, plotArea } =
    resolveScopedFrames({
      node,
      rows,
      fieldTypes,
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
      allGuides,
      allGuidesWithCompositionGap,
      ...(scopedLabelReserve !== undefined ? { scopedLabelReserve } : {}),
    });
  const facets = compositionFacets;
  const arrangementLayoutOf = (arrangement: CoordinateArrangement | undefined): CompositionLayout | undefined =>
    resolveArrangementLayout(compositionLayout, arrangement);
  const arrangementResolveOf = (arrangement: CoordinateArrangement | undefined): CompositionResolve | undefined =>
    resolveArrangementPolicy(compositionResolve, arrangement);

  const channelCtx = { node, rows, fieldTypes, scaleRegistry, resolveColorScheme, palette: resolvedTheme.palette };
  // 通道 registry：内置 definition 先注册，自定义 definition 再合并；mark / node / path 通道统一解析。
  const channelRegistry = resolveChannelRegistry({
    custom: options.channelDefinitions,
    resolveLabel: options.resolveLabel,
  });

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
      throw new Error(`lowerPlots: default coordinate view "${coordinateScopes.defaultScope}" is not registered`);
    }

    const usedFacetScopeIds = new Set(coordinateScopes.scopes.map(scope => scope.id));
    const panels = facets.flatMap(facet => resolveFacetPanels(facet, rows, usedFacetScopeIds));
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
      throw new Error(`lowerPlots: panelGap ${panelGap} leaves no room for ${columnCount}x${rowCount} facet panels`);
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
      const style = facetHeaderLabelStyleOf(facet, dimension);
      const rotate = facetHeaderLabelRotateOf(facet, dimension);
      const maxTextWidth = style?.maxTextWidth ?? Math.max(1, ((rotate ?? 0) === 0 ? rect.width : rect.height) - 8);
      const position: [number, number] = [rect.x + rect.width / 2, rect.y + rect.height / 2];
      return {
        type: 'scope',
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
        throw new Error(
          `lowerPlots: axis grid selector for dimension "${guide.dimension}" matches no target facet panel`,
        );
      }
    }

    const panelScopes: Array<IRScope> = panels.map(panel => {
      const panelAxisGuides = facetAxisGuidesForPanel(panel);
      const panelFrameGuides = facetFrameGuidesForPanel(panel);
      const panelMarkDataViews: Array<MarkDataView> = node.marks.map(mark => ({
        mark,
        rows: resolveMarkRows(mark, panel.rows, transformRegistry, transformContext),
      }));
      const roleMarkDataViews: Record<string, Array<MarkDataView>> = {};
      for (const [role, sharing] of Object.entries(arrangementResolveOf(panel.facet)?.scale ?? {})) {
        if (sharing === 'independent') roleMarkDataViews[role] = panelMarkDataViews;
      }
      const panelNode: IRPlotSpec = {
        ...node,
        coordinate: panel.facet.coordinate ?? defaultScope.coordinate,
        composition: undefined,
        marks: node.marks,
        guides: panelFrameGuides,
      };
      const panelLayout = arrangementLayoutOf(panel.facet);
      const frameResolution = resolveFrame({
        node: panelNode,
        rows: panel.rows,
        fieldTypes,
        width: panelWidth,
        height: panelHeight,
        fontSize: options.fontSize ?? DEFAULT_FONT_SIZE,
        margin: mergeCompositionMargin(panelLayout?.padding, options.margin),
        labelGap: panelLayout?.labelGap,
        provenance,
        coordinates: options.coordinates,
        scaleRegistry,
        markDataViews,
        roleMarkDataViews,
      });
      const axisResolution =
        panelAxisGuides.length === panelFrameGuides.length
          ? frameResolution
          : resolveFrame({
              node: { ...panelNode, guides: panelAxisGuides },
              rows: panel.rows,
              fieldTypes,
              width: panelWidth,
              height: panelHeight,
              fontSize: options.fontSize ?? DEFAULT_FONT_SIZE,
              margin: mergeCompositionMargin(panelLayout?.padding, options.margin),
              labelGap: panelLayout?.labelGap,
              plotAreaOverride: frameResolution.plotArea,
              provenance,
              coordinates: options.coordinates,
              scaleRegistry,
              markDataViews,
              roleMarkDataViews,
            });
      const panelGridGuides = facetGridGuidesForPanel(panel);
      const gridResolution =
        panelGridGuides.length > 0
          ? resolveFrame({
              node: { ...panelNode, guides: panelGridGuides },
              rows: panel.rows,
              fieldTypes,
              width: panelWidth,
              height: panelHeight,
              fontSize: options.fontSize ?? DEFAULT_FONT_SIZE,
              margin: mergeCompositionMargin(panelLayout?.padding, options.margin),
              labelGap: panelLayout?.labelGap,
              plotAreaOverride: frameResolution.plotArea,
              provenance,
              coordinates: options.coordinates,
              scaleRegistry,
              markDataViews,
              roleMarkDataViews,
            })
          : undefined;
      const facetContext: IRJsonObject = { id: panel.facet.id };
      if (panel.row !== undefined) facetContext.row = panel.row;
      if (panel.column !== undefined) facetContext.column = panel.column;
      const panelContext: IRJsonObject = { coordinateView: panel.id, facet: facetContext };
      const markLayers: Array<IRChild> = node.marks
        .map((mark, markIndex) => {
          const markRows = panelMarkDataViews[markIndex]?.rows ?? panel.rows;
          const layer = lowerMark(
            mark,
            markRows,
            frameResolution.frame,
            resolveMarkChannels(
              mark,
              { ...channelCtx, rows: markRows },
              channelRegistry,
              defaultColorOf(resolvedTheme.palette.series, markIndex),
              channelKindsForMark(mark, markRegistry),
            ),
            {
              markIndex,
              plotId: node.id,
              ...(provenance !== undefined ? { provenance: { context: provenance, markIndex, registerDatumId } } : {}),
              anchors: anchorRegistry,
            },
            markRegistry,
          );
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
          ...(gridResolution?.gridLayers ?? []).map(layer =>
            withFacetGuideContext(layer, panelContext, node.id, panel.id),
          ),
          ...markLayers,
          ...axisResolution.axisLayers.map(layer => withFacetGuideContext(layer, panelContext, node.id, panel.id)),
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
    const backgroundNode = plotBackgroundNode(width, height, resolvedTheme.background);
    const labelLayers = lowerPlotLabels({
      layout: node.layout,
      labels: node.labels ?? [],
      width,
      height,
      plotArea: { x: 0, y: 0, width, height },
      fontSize: options.fontSize ?? DEFAULT_FONT_SIZE,
      textStyle: resolvedTheme.labelText,
    });
    const children: Array<IRChild> = [
      ...(backgroundNode ? [backgroundNode] : []),
      ...panelScopes,
      ...facetLabelScopes,
      ...labelLayers,
    ];
    if (node.id === undefined) {
      const base: IRScope = { type: 'scope', localNamespace: true, children };
      return provenance ? { ...base, meta: rootMeta(provenance.dataReference) } : base;
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
    return { type: 'scope', id: node.id, children: [innerContent, plotAreaCarrier] };
  }

  // 每个 mark 下沉成一个图层 Scope（样式上提到 nodeDefault/pathDefault）；空图层（无可绘制点）丢弃
  // provenance 开 → 传 markProvenance（plotId / markIndex / datum 开关 + 共享 registerDatumId），各层 / datum 绑 id + 来源 meta
  const scopeOrderById = new Map(coordinateScopes.scopes.map((scope, index) => [scope.id, index] as const));
  const markLayerEntries = node.marks
    .map((mark, markIndex) => {
      const markRows = markDataViews[markIndex]?.rows ?? rows;
      const coordinateScopeId = coordinateScopeIdOf(mark, coordinateScopes.defaultScope);
      const frame = frameByScope.get(coordinateScopeId);
      if (frame === undefined) {
        throw new Error(`lowerPlots: coordinateView "${coordinateScopeId}" is not registered`);
      }
      const layer = lowerMark(
        mark,
        markRows,
        frame,
        resolveMarkChannels(
          mark,
          { ...channelCtx, rows: markRows },
          channelRegistry,
          defaultColorOf(resolvedTheme.palette.series, markIndex),
          channelKindsForMark(mark, markRegistry),
        ),
        {
          markIndex,
          plotId: node.id,
          ...(provenance !== undefined ? { provenance: { context: provenance, markIndex, registerDatumId } } : {}),
          anchors: anchorRegistry,
        },
        markRegistry,
      );
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
    const channelDescriptors = collectChannelDescriptors(
      node,
      channelCtx,
      channelRegistry,
      markRegistry,
      defaultColorOf(resolvedTheme.palette.series, 0),
      markDataViews,
    );
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
  const labelLayers = lowerPlotLabels({
    layout: node.layout,
    labels: node.labels ?? [],
    width,
    height,
    plotArea,
    fontSize: options.fontSize ?? DEFAULT_FONT_SIZE,
    textStyle: resolvedTheme.labelText,
  });

  // z-order：所有网格层 → marks → 所有轴层 → plot labels → legend（legend 在预留带最上）
  const backgroundNode = plotBackgroundNode(width, height, resolvedTheme.background);
  const children: Array<IRChild> = [
    ...(backgroundNode ? [backgroundNode] : []),
    ...gridLayers,
    ...markLayers,
    ...axisLayers,
    ...labelLayers,
    ...legendLayers,
  ];

  // 无 id：root = localNamespace 内容 scope（可带 provenance meta）。
  if (node.id === undefined) {
    const base: IRScope = { type: 'scope', localNamespace: true, children };
    return provenance ? { ...base, meta: rootMeta(provenance.dataReference) } : base;
  }

  // 有 id：外层 panel scope（id、非 localNamespace → 面板 bbox 注册父帧、外部可见）
  //   ⊃ [ 内层 localNamespace 内容 scope（封内部 datum/series id、承 provenance meta）, plotArea 不可见 carrier ]。
  // 让面板 bbox `<plotId>` 与绘图区 `<plotId>.plotArea` 都落在 localNamespace 之外、外部兄弟可锚（组合连线）。
  const inner: IRScope = { type: 'scope', localNamespace: true, children };
  const innerContent: IRScope = provenance ? { ...inner, meta: rootMeta(provenance.dataReference) } : inner;
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
  return { type: 'scope', id: node.id, children: [innerContent, plotAreaCarrier] };
};

/**
 * 构造 plot 的 Tier 2 下沉逻辑，供 core `CompileOptions.composites` 注入
 * @description 数据闭进函数、不进 IR；返回的 CompositeDefinition 把 plot composite 节点展开成 core Scope/Node/Path
 */
export const lowerPlots = (datasets: ExternalDatasets, options: LowerPlotsOptions = {}) =>
  [
    defineComposite({
      namespace: 'plot',
      type: 'plot',
      schema: PlotSpecSchema,
      expand: (node: IRPlotSpec) => expandPlot(node, datasets, options),
    }),
  ] satisfies Array<ExpandCompositeDefinition<IRPlotSpec, 'plot', 'plot'>>;
