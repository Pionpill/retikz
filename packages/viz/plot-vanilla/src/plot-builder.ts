import type {
  IRPlotAxisGuide,
  IRPlotCoordinateOperation,
  IRPlotGuide,
  IRPlotMarkOperation,
  IRPlotScaleOperation,
  IRPlotSpec,
} from '@retikz/plot';

import {
  PLOT_NAMESPACE,
  PlotComposite,
  PlotCoordinate,
  PlotGuide,
  PlotMark,
  PlotScale,
  PlotSpecSchema,
} from '@retikz/plot';

type CompositionSpec = NonNullable<IRPlotSpec['composition']>;
type CoordinateViewSpec = NonNullable<CompositionSpec['views']>[number];
type ArrangementSpec = NonNullable<CompositionSpec['arrangements']>[number];
type FacetGridSpec = Extract<ArrangementSpec, { kind: 'facet' }>;
type SharedScaffoldSpec = Extract<ArrangementSpec, { kind: 'tracks' }>;
type FacetDimensionInput = string | NonNullable<FacetGridSpec['row']>;

/**
 * plotBuilder 的入口配置。
 *
 * @description
 * 基本字段与 plain `IRPlotSpec` 保持一致，但 `marks` / `guides` 可以额外携带
 * builder-only 的轴、facet 与 scaffold 绑定字段。调用 `build()` 时这些字段会先被展开成
 * 普通 `IRPlotSpec` 的 `composition`、`coordinateView`、`scales` 与 guides，再交给
 * `PlotSpecSchema` 校验；它们不会进入 Plot IR，也不会被 `renderPlot` 直接消费。
 */
export type PlotBuilderConfig = Omit<IRPlotSpec, 'namespace' | 'type' | 'marks' | 'guides'> & {
  /**
   * 初始 mark 列表。
   *
   * @description
   * mark 可以使用 `xAxisId`、`yAxisId`、`facetId` 或 `trackId` 这类 builder-only
   * 绑定字段；`build()` 会把它们转换为普通 IRPlotSpec 里的 coordinate view 关系。
   */
  marks?: Array<AxisBoundMarkOperation>;
  /**
   * 初始 guide 列表。
   *
   * @description
   * guide 可以使用 `facetId`、`scaffoldId` 或 `trackId` 绑定到 builder 生成的布局；
   * 这些字段只参与 build 阶段，不会保留到输出 IR。
   */
  guides?: Array<AxisBoundGuide>;
};

type MarkBindingProps = {
  xAxisId?: string;
  yAxisId?: string;
  facetId?: string;
  trackId?: string;
};

type GuideBindingProps = {
  facetId?: string;
  scaffoldId?: string;
  trackId?: string;
};

type AxisBoundGuide = IRPlotGuide & GuideBindingProps;
type AxisBoundMarkOperation = IRPlotMarkOperation & MarkBindingProps;
type AxisBoundPathMark = Extract<IRPlotMarkOperation, { type: typeof PlotMark.Path }> & MarkBindingProps;
type AxisBoundPointMark = Extract<IRPlotMarkOperation, { type: typeof PlotMark.Point }> & MarkBindingProps;
type AxisBoundIntervalMark = Extract<IRPlotMarkOperation, { type: typeof PlotMark.Interval }> & MarkBindingProps;
type AxisBoundAxisGuide = Extract<IRPlotGuide, { type: typeof PlotGuide.Axis }> & GuideBindingProps;
type AxisBoundLegendGuide = Extract<IRPlotGuide, { type: typeof PlotGuide.Legend }> & GuideBindingProps;

/**
 * facet 布局的 builder 输入。
 *
 * @description
 * 该类型是 `plotBuilder().facet(...)` 的轻量写法：`row` / `column` 可直接写字段名，
 * `view` 可省略并由 builder 生成。`build()` 会把它展开为 plain `IRPlotSpec.composition`
 * 的 facet arrangement，输入中的便捷字段不会进入 Plot IR。
 */
export type BuilderFacetInput = Omit<FacetGridSpec, 'kind' | 'view' | 'row' | 'column'> & {
  /** 行方向分面字段；字符串会被展开为 `{ field }`。 */
  row?: FacetDimensionInput;
  /** 列方向分面字段；字符串会被展开为 `{ field }`。 */
  column?: FacetDimensionInput;
  /** 分面单元对应的 coordinate view；省略时由 builder 基于 facet id 生成。 */
  view?: string;
  /** 作用于该 facet arrangement 的间距配置。 */
  spacing?: CompositionSpec['spacing'];
  /** 作用于该 facet arrangement 的 scale / guide resolve 配置。 */
  resolve?: CompositionSpec['resolve'];
};

/**
 * scaffold / tracks 布局的 builder 输入。
 *
 * @description
 * 该类型是 `plotBuilder().scaffold(...)` 的共享轨道写法。`coordinate` 可省略并在
 * `build()` 时继承默认 cartesian 配置；最终会被展开为 plain `IRPlotSpec.composition`
 * 的 tracks arrangement，builder-only 字段不会进入 Plot IR。
 */
export type BuilderScaffoldInput = Omit<SharedScaffoldSpec, 'kind' | 'coordinate'> & {
  /** scaffold 内各 track 使用的坐标系；省略时 builder 使用默认 cartesian2D。 */
  coordinate?: SharedScaffoldSpec['coordinate'];
  /** 作用于该 scaffold arrangement 的间距配置。 */
  spacing?: CompositionSpec['spacing'];
  /** 作用于该 scaffold arrangement 的 scale / guide resolve 配置。 */
  resolve?: CompositionSpec['resolve'];
};

type CollectedFacet = FacetGridSpec & {
  spacing?: CompositionSpec['spacing'];
  resolve?: CompositionSpec['resolve'];
};

type CollectedScaffold = SharedScaffoldSpec & {
  spacing?: CompositionSpec['spacing'];
  resolve?: CompositionSpec['resolve'];
};

/**
 * framework-free 的 IRPlotSpec builder。
 *
 * @description
 * `PlotBuilder` 提供链式 authoring surface，方便在无 React / SSR 场景中组织 mark、
 * guide、axis、legend、facet 与 scaffold。所有便捷绑定字段都会在 `build()` 前展开为
 * plain `IRPlotSpec`；输出结果只包含标准 Plot IR 字段，可继续交给 `renderPlot(spec, datasets)`
 * 或 `lowerPlots` 使用。
 */
export type PlotBuilder = {
  /** 追加一个通用 mark，可携带 builder-only 的轴或拓扑绑定字段。 */
  mark: (mark: AxisBoundMarkOperation) => PlotBuilder;
  /** 追加一个通用 guide，可携带 builder-only 的 facet / scaffold / track 绑定字段。 */
  guide: (guide: AxisBoundGuide) => PlotBuilder;
  /** 追加 path mark。 */
  path: (mark: AxisBoundPathMark) => PlotBuilder;
  /** 追加 point mark。 */
  point: (mark: AxisBoundPointMark) => PlotBuilder;
  /** 追加 interval mark。 */
  interval: (mark: AxisBoundIntervalMark) => PlotBuilder;
  /** 追加 reference mark。 */
  reference: (mark: Extract<IRPlotMarkOperation, { type: typeof PlotMark.Reference }>) => PlotBuilder;
  /** 追加 relation mark。 */
  relation: (mark: Extract<IRPlotMarkOperation, { type: typeof PlotMark.Relation }>) => PlotBuilder;
  /** 追加 axis guide，并支持 builder-only 的拓扑绑定字段。 */
  axis: (guide: AxisBoundAxisGuide) => PlotBuilder;
  /** 追加 legend guide。 */
  legend: (guide: AxisBoundLegendGuide) => PlotBuilder;
  /** 声明 facet 布局，并允许 mark / guide 通过 `facetId` 绑定到对应 view。 */
  facet: (facet: BuilderFacetInput) => PlotBuilder;
  /** 声明 shared scaffold 布局，并允许 mark / guide 通过 `trackId` / `scaffoldId` 绑定。 */
  scaffold: (scaffold: BuilderScaffoldInput) => PlotBuilder;
  /**
   * 生成 schema-valid 的 plain `IRPlotSpec`。
   *
   * @description
   * 该方法会移除 `xAxisId`、`yAxisId`、`facetId`、`trackId`、`scaffoldId`
   * 等 builder-only 字段，并把它们展开为标准 Plot IR 的 scale、composition 与
   * coordinate view 关系。
   */
  build: () => IRPlotSpec;
};

type NormalizedAxisBinding = {
  marks: Array<IRPlotMarkOperation>;
  guides: Array<IRPlotGuide>;
  scales: Array<IRPlotScaleOperation>;
  coordinate?: IRPlotCoordinateOperation;
  composition?: IRPlotSpec['composition'];
};

const AUTO_X = '__x';
const AUTO_Y = '__y';
const DEFAULT_AXIS_SCOPE = 'default';

const yAxisScaleNameOf = (axisId: string): string => `__y.${axisId}`;
const xAxisScaleNameOf = (axisId: string): string => `__x.${axisId}`;

const isAxisGuide = (guide: IRPlotGuide): guide is IRPlotAxisGuide => guide.type === PlotGuide.Axis;

const isPositionMark = (mark: AxisBoundMarkOperation): boolean =>
  mark.type === PlotMark.Path || mark.type === PlotMark.Point || mark.type === PlotMark.Interval;

const stripMarkBindings = (mark: AxisBoundMarkOperation): IRPlotMarkOperation => {
  const rest = { ...mark };
  delete rest.xAxisId;
  delete rest.yAxisId;
  delete rest.facetId;
  delete rest.trackId;
  return rest;
};

const stripGuideBindings = (guide: AxisBoundGuide): IRPlotGuide => {
  const rest = { ...guide };
  delete rest.facetId;
  delete rest.scaffoldId;
  delete rest.trackId;
  return rest;
};

const withMarkScope = (mark: AxisBoundMarkOperation, coordinateView: string | undefined): IRPlotMarkOperation => {
  const stripped = stripMarkBindings(mark);
  return coordinateView === undefined ? stripped : { ...stripped, coordinateView };
};

const withGuideScope = (guide: AxisBoundGuide, coordinateView: string | undefined): IRPlotGuide => {
  const stripped = stripGuideBindings(guide);
  if (!isAxisGuide(stripped)) return stripped;
  return coordinateView === undefined ? stripped : { ...stripped, coordinateView };
};

const assertMarkBindingCompatibility = (mark: AxisBoundMarkOperation): void => {
  const bindings = [
    mark.xAxisId !== undefined ? 'xAxisId' : undefined,
    mark.yAxisId !== undefined ? 'yAxisId' : undefined,
    mark.facetId !== undefined ? 'facetId' : undefined,
    mark.trackId !== undefined ? 'trackId' : undefined,
  ].filter((binding): binding is string => binding !== undefined);
  if (bindings.length > 1) throw new Error(`plotBuilder: mark has multiple binding props: ${bindings.join(', ')}`);
  const binding = bindings.at(0);
  if (mark.coordinateView !== undefined && binding !== undefined) {
    throw new Error(`plotBuilder: mark cannot set both coordinateView and ${binding}`);
  }
};

const assertGuideBindingCompatibility = (guide: AxisBoundGuide): void => {
  const bindings = [
    guide.facetId !== undefined ? 'facetId' : undefined,
    guide.scaffoldId !== undefined ? 'scaffoldId' : undefined,
    guide.trackId !== undefined ? 'trackId' : undefined,
  ].filter((binding): binding is string => binding !== undefined);
  if (bindings.length > 1) throw new Error(`plotBuilder: guide has multiple binding props: ${bindings.join(', ')}`);
  const binding = bindings.at(0);
  if (binding !== undefined && !isAxisGuide(guide)) {
    throw new Error(`plotBuilder: ${binding} binding is only supported on axis guides`);
  }
  if (isAxisGuide(guide) && guide.coordinateView !== undefined && binding !== undefined) {
    throw new Error(`plotBuilder: guide cannot set both coordinateView and ${binding}`);
  }
};

const facetDimensionOf = (
  dimension: FacetDimensionInput | undefined,
): NonNullable<FacetGridSpec['row']> | undefined => {
  if (dimension === undefined) return undefined;
  return typeof dimension === 'string' ? { field: dimension } : dimension;
};

const insertAxisBindingScales = (
  scales: ReadonlyArray<IRPlotScaleOperation>,
  xAxisIds: ReadonlyArray<string>,
  yAxisIds: ReadonlyArray<string>,
): Array<IRPlotScaleOperation> => {
  const hasXBinding = xAxisIds.length > 0;
  const hasYBinding = yAxisIds.length > 0;
  const baseXScale = scales.find(scale => scale.name === AUTO_X) ?? { type: PlotScale.Linear, name: AUTO_X };
  const baseYScale = scales.find(scale => scale.name === AUTO_Y) ?? { type: PlotScale.Linear, name: AUTO_Y };
  const xScales: Array<IRPlotScaleOperation> = xAxisIds.map(axisId => ({
    ...baseXScale,
    name: xAxisScaleNameOf(axisId),
  }));
  const yScales: Array<IRPlotScaleOperation> = yAxisIds.map(axisId => ({
    ...baseYScale,
    name: yAxisScaleNameOf(axisId),
  }));
  const out: Array<IRPlotScaleOperation> = [];
  let insertedX = false;
  let insertedY = false;
  for (const scale of scales) {
    if (scale.name === AUTO_X && hasXBinding) {
      out.push(...xScales);
      insertedX = true;
    } else if (scale.name === AUTO_Y && hasYBinding) {
      out.push(...yScales);
      insertedY = true;
    } else {
      out.push(scale);
    }
  }
  if (!scales.some(scale => scale.name === AUTO_X)) {
    out.unshift(...(hasXBinding ? xScales : [{ type: PlotScale.Linear, name: AUTO_X }]));
  } else if (hasXBinding && !insertedX) {
    out.unshift(...xScales);
  }
  if (!scales.some(scale => scale.name === AUTO_Y)) {
    out.push(...(hasYBinding ? yScales : [{ type: PlotScale.Linear, name: AUTO_Y }]));
  } else if (hasYBinding && !insertedY) {
    out.push(...yScales);
  }
  return out;
};

const ensureCartesianScales = (
  scales: ReadonlyArray<IRPlotScaleOperation>,
  coordinate: IRPlotCoordinateOperation,
): Array<IRPlotScaleOperation> => {
  if (coordinate.type !== PlotCoordinate.Cartesian2D) return [...scales];
  const out: Array<IRPlotScaleOperation> = [...scales];
  const x = typeof coordinate.x === 'string' ? coordinate.x : AUTO_X;
  const y = typeof coordinate.y === 'string' ? coordinate.y : AUTO_Y;
  if (!out.some(scale => scale.name === x)) out.unshift({ type: PlotScale.Linear, name: x });
  if (!out.some(scale => scale.name === y)) out.push({ type: PlotScale.Linear, name: y });
  return out;
};

const fillCoordinateScaleBindings = (
  input: IRPlotCoordinateOperation,
  defaults: IRPlotCoordinateOperation,
): IRPlotCoordinateOperation => {
  if (input.type !== defaults.type) return input;
  if (input.type === PlotCoordinate.Cartesian2D && defaults.type === PlotCoordinate.Cartesian2D) {
    return {
      ...input,
      ...(input.x === undefined && defaults.x !== undefined ? { x: defaults.x } : {}),
      ...(input.y === undefined && defaults.y !== undefined ? { y: defaults.y } : {}),
    };
  }
  if (input.type === PlotCoordinate.Cartesian1D && defaults.type === PlotCoordinate.Cartesian1D) {
    return {
      ...input,
      ...(input.x === undefined && defaults.x !== undefined ? { x: defaults.x } : {}),
    };
  }
  if (input.type === PlotCoordinate.Polar2D && defaults.type === PlotCoordinate.Polar2D) {
    return {
      ...input,
      ...(input.angle === undefined && defaults.angle !== undefined ? { angle: defaults.angle } : {}),
      ...(input.radius === undefined && defaults.radius !== undefined ? { radius: defaults.radius } : {}),
    };
  }
  if (input.type === PlotCoordinate.Polar1D && defaults.type === PlotCoordinate.Polar1D) {
    return {
      ...input,
      ...(input.angle === undefined && defaults.angle !== undefined ? { angle: defaults.angle } : {}),
    };
  }
  return input;
};

const buildTopologyComposition = (
  facets: ReadonlyArray<CollectedFacet>,
  scaffolds: ReadonlyArray<CollectedScaffold>,
  coordinate: IRPlotCoordinateOperation,
): {
  composition: CompositionSpec;
  facetViewById: Map<string, string>;
  trackViewById: Map<string, string>;
  scaffoldDefaultViewById: Map<string, string>;
} => {
  const views: Array<CoordinateViewSpec> = [];
  const arrangements: Array<ArrangementSpec> = [];
  const facetViewById = new Map<string, string>();
  const trackViewById = new Map<string, string>();
  const scaffoldDefaultViewById = new Map<string, string>();

  for (const scaffold of scaffolds) {
    if (arrangements.some(candidate => candidate.id === scaffold.id)) {
      throw new Error(`plotBuilder: duplicate scaffold id "${scaffold.id}"`);
    }
    arrangements.push({
      ...scaffold,
      kind: 'tracks',
      coordinate: fillCoordinateScaleBindings(scaffold.coordinate, coordinate),
      tracks: scaffold.tracks.map(track => ({ ...track, view: track.view ?? track.id })),
    });
    for (const track of scaffold.tracks) {
      if (trackViewById.has(track.id)) {
        throw new Error(`plotBuilder: duplicate track id "${track.id}" across scaffold bindings`);
      }
      const view = track.view ?? track.id;
      trackViewById.set(track.id, view);
      scaffoldDefaultViewById.set(scaffold.id, scaffoldDefaultViewById.get(scaffold.id) ?? view);
    }
  }

  for (const facet of facets) {
    if (facetViewById.has(facet.id)) throw new Error(`plotBuilder: duplicate facet id "${facet.id}"`);
    facetViewById.set(facet.id, facet.view);
    arrangements.push(facet);
    views.push({
      id: facet.view,
      coordinate: fillCoordinateScaleBindings(coordinate, coordinate),
    });
  }

  const defaultView = trackViewById.values().next().value ?? views.at(0)?.id;
  if (defaultView === undefined) {
    throw new Error('plotBuilder: topology binding requires at least one facet or scaffold declaration');
  }

  return {
    composition: {
      defaultView,
      ...(views.length > 0 ? { views } : {}),
      arrangements,
    },
    facetViewById,
    trackViewById,
    scaffoldDefaultViewById,
  };
};

const normalizeTopologyBindings = (
  baseScales: ReadonlyArray<IRPlotScaleOperation>,
  marks: ReadonlyArray<AxisBoundMarkOperation>,
  guides: ReadonlyArray<AxisBoundGuide>,
  coordinate: IRPlotCoordinateOperation,
  facets: ReadonlyArray<CollectedFacet>,
  scaffolds: ReadonlyArray<CollectedScaffold>,
): NormalizedAxisBinding => {
  const { composition, facetViewById, trackViewById, scaffoldDefaultViewById } = buildTopologyComposition(
    facets,
    scaffolds,
    coordinate,
  );

  return {
    marks: marks.map(mark => {
      if (mark.facetId !== undefined) {
        const view = facetViewById.get(mark.facetId);
        if (view === undefined) throw new Error(`plotBuilder: missing facet for facetId "${mark.facetId}"`);
        return withMarkScope(mark, view);
      }
      if (mark.trackId !== undefined) {
        const view = trackViewById.get(mark.trackId);
        if (view === undefined) throw new Error(`plotBuilder: missing track for trackId "${mark.trackId}"`);
        return withMarkScope(mark, view);
      }
      return stripMarkBindings(mark);
    }),
    guides: guides.map(guide => {
      if (guide.facetId !== undefined) {
        const view = facetViewById.get(guide.facetId);
        if (view === undefined) throw new Error(`plotBuilder: missing facet for facetId "${guide.facetId}"`);
        return withGuideScope(guide, view);
      }
      if (guide.trackId !== undefined) {
        const view = trackViewById.get(guide.trackId);
        if (view === undefined) throw new Error(`plotBuilder: missing track for trackId "${guide.trackId}"`);
        return withGuideScope(guide, view);
      }
      if (guide.scaffoldId !== undefined) {
        const view = scaffoldDefaultViewById.get(guide.scaffoldId);
        if (view === undefined) throw new Error(`plotBuilder: missing scaffold for scaffoldId "${guide.scaffoldId}"`);
        return withGuideScope(guide, view);
      }
      return stripGuideBindings(guide);
    }),
    scales: ensureCartesianScales(baseScales, coordinate),
    composition,
  };
};

const normalizeAxisBindings = (
  base: Omit<PlotBuilderConfig, 'marks' | 'guides'>,
  marks: ReadonlyArray<AxisBoundMarkOperation>,
  guides: ReadonlyArray<AxisBoundGuide>,
  facets: ReadonlyArray<CollectedFacet>,
  scaffolds: ReadonlyArray<CollectedScaffold>,
): NormalizedAxisBinding => {
  marks.forEach(assertMarkBindingCompatibility);
  guides.forEach(assertGuideBindingCompatibility);

  const hasXAxisBinding = marks.some(mark => mark.xAxisId !== undefined);
  const hasYAxisBinding = marks.some(mark => mark.yAxisId !== undefined);
  const hasAxisBinding = hasXAxisBinding || hasYAxisBinding;
  const hasTopologyBinding =
    marks.some(mark => mark.facetId !== undefined || mark.trackId !== undefined) ||
    guides.some(guide => guide.facetId !== undefined || guide.scaffoldId !== undefined || guide.trackId !== undefined);
  const hasTopologyDeclarations = facets.length > 0 || scaffolds.length > 0;

  if (hasAxisBinding && (hasTopologyBinding || hasTopologyDeclarations)) {
    throw new Error('plotBuilder: multiple binding modes are not supported in one Plot');
  }

  if (hasTopologyBinding || hasTopologyDeclarations) {
    if (base.composition !== undefined) {
      throw new Error('plotBuilder: composition cannot be mixed with facet/scaffold binding sugar');
    }
    const coordinate = base.coordinate ?? { type: PlotCoordinate.Cartesian2D, x: AUTO_X, y: AUTO_Y };
    return normalizeTopologyBindings(base.scales, marks, guides, coordinate, facets, scaffolds);
  }

  if (!hasAxisBinding) {
    return {
      marks: marks.map(stripMarkBindings),
      guides: guides.map(stripGuideBindings),
      scales: [...base.scales],
      ...(base.composition !== undefined ? { composition: base.composition } : {}),
      ...(base.coordinate !== undefined ? { coordinate: base.coordinate } : {}),
    };
  }

  if (base.coordinate !== undefined && base.coordinate.type !== PlotCoordinate.Cartesian2D) {
    throw new Error('plotBuilder: axis id binding only supports cartesian2D coordinates');
  }

  const axes = guides.filter(isAxisGuide);
  const xAxesById = new Map<string, IRPlotAxisGuide>();
  const yAxesById = new Map<string, IRPlotAxisGuide>();
  const axesById = new Map<string, IRPlotAxisGuide>();
  const seenAxisKeys = new Set<string>();
  const seenBindingScopeIds = new Map<string, string>();
  for (const axis of axes) {
    if (axis.id === undefined) continue;
    if (axis.id.length === 0) throw new Error('plotBuilder: axis id must be non-empty when using axis id binding');
    const duplicateKey = `${axis.dimension}:${axis.id}`;
    if (seenAxisKeys.has(duplicateKey)) {
      throw new Error(`plotBuilder: duplicate axis id "${axis.id}" for dimension "${axis.dimension}"`);
    }
    seenAxisKeys.add(duplicateKey);
    axesById.set(axis.id, axis);
    if (axis.dimension === 'x') xAxesById.set(axis.id, axis);
    if (axis.dimension === 'y') yAxesById.set(axis.id, axis);
    if ((axis.dimension === 'x' && hasXAxisBinding) || (axis.dimension === 'y' && hasYAxisBinding)) {
      const previousDimension = seenBindingScopeIds.get(axis.id);
      if (previousDimension !== undefined && previousDimension !== axis.dimension) {
        throw new Error(
          `plotBuilder: axis id "${axis.id}" cannot be reused across dimensions when using axis id binding`,
        );
      }
      seenBindingScopeIds.set(axis.id, axis.dimension);
    }
  }

  const referencedXAxisIds: Array<string> = [];
  const referencedYAxisIds: Array<string> = [];
  for (const mark of marks) {
    if (mark.xAxisId !== undefined) {
      if (mark.xAxisId.length === 0) throw new Error('plotBuilder: xAxisId must be a non-empty string');
      if (mark.xAxisId !== DEFAULT_AXIS_SCOPE) {
        if (xAxesById.has(mark.xAxisId)) {
          if (!referencedXAxisIds.includes(mark.xAxisId)) referencedXAxisIds.push(mark.xAxisId);
        } else if (axesById.has(mark.xAxisId)) {
          throw new Error(`plotBuilder: xAxisId "${mark.xAxisId}" must reference an axis with dimension "x"`);
        } else {
          throw new Error(`plotBuilder: missing x axis for xAxisId "${mark.xAxisId}"`);
        }
      }
    }
    if (mark.yAxisId !== undefined) {
      if (mark.yAxisId.length === 0) throw new Error('plotBuilder: yAxisId must be a non-empty string');
      if (mark.yAxisId !== DEFAULT_AXIS_SCOPE) {
        if (yAxesById.has(mark.yAxisId)) {
          if (!referencedYAxisIds.includes(mark.yAxisId)) referencedYAxisIds.push(mark.yAxisId);
        } else if (axesById.has(mark.yAxisId)) {
          throw new Error(`plotBuilder: yAxisId "${mark.yAxisId}" must reference an axis with dimension "y"`);
        } else {
          throw new Error(`plotBuilder: missing y axis for yAxisId "${mark.yAxisId}"`);
        }
      }
    }
  }

  const xAxisIds: Array<string> = hasXAxisBinding ? [DEFAULT_AXIS_SCOPE] : [];
  const yAxisIds: Array<string> = hasYAxisBinding ? [DEFAULT_AXIS_SCOPE] : [];
  for (const axis of axes) {
    if (axis.dimension === 'x' && hasXAxisBinding && axis.id !== undefined && axis.id !== DEFAULT_AXIS_SCOPE) {
      xAxisIds.push(axis.id);
    }
    if (axis.dimension === 'y' && hasYAxisBinding && axis.id !== undefined && axis.id !== DEFAULT_AXIS_SCOPE) {
      yAxisIds.push(axis.id);
    }
  }
  for (const axisId of referencedXAxisIds) {
    if (!xAxisIds.includes(axisId)) xAxisIds.push(axisId);
  }
  for (const axisId of referencedYAxisIds) {
    if (!yAxisIds.includes(axisId)) yAxisIds.push(axisId);
  }

  if (base.composition !== undefined) {
    const viewIds = new Set([
      ...(base.composition.views ?? []).map(view => view.id),
      ...(base.composition.arrangements ?? [])
        .filter((arrangement): arrangement is SharedScaffoldSpec => arrangement.kind === 'tracks')
        .flatMap(arrangement =>
          arrangement.tracks.map(track =>
            (track.view ?? arrangement.viewIdTemplate ?? '{arrangement}.track.{track}')
              .replaceAll('{arrangement}', arrangement.id)
              .replaceAll('{track}', track.id),
          ),
        ),
    ]);
    for (const axisId of [...xAxisIds, ...yAxisIds]) {
      if (!viewIds.has(axisId)) {
        throw new Error(`plotBuilder: axis id "${axisId}" requires an explicit composition view with the same id`);
      }
    }
  }

  const normalizedMarks = marks.map(mark => {
    if (!isPositionMark(mark)) return stripMarkBindings(mark);
    if (mark.xAxisId !== undefined) return withMarkScope(mark, mark.xAxisId);
    if (mark.yAxisId !== undefined) return withMarkScope(mark, mark.yAxisId);
    return mark.coordinateView === undefined ? withMarkScope(mark, DEFAULT_AXIS_SCOPE) : stripMarkBindings(mark);
  });
  const normalizedGuides = guides.map(guide => {
    if (!isAxisGuide(guide)) return stripGuideBindings(guide);
    if (guide.dimension !== 'x' && guide.dimension !== 'y') return stripGuideBindings(guide);
    if (guide.dimension === 'x' && !hasXAxisBinding) return stripGuideBindings(guide);
    if (guide.dimension === 'y' && !hasYAxisBinding) return stripGuideBindings(guide);
    const coordinateView = guide.id ?? DEFAULT_AXIS_SCOPE;
    if (guide.coordinateView !== undefined && guide.coordinateView !== coordinateView) {
      throw new Error(
        `plotBuilder: ${guide.dimension} axis "${guide.id ?? '<anonymous>'}" cannot set coordinateView different from its bound coordinate view`,
      );
    }
    return withGuideScope(guide, coordinateView);
  });

  if (base.composition !== undefined) {
    return {
      marks: normalizedMarks,
      guides: normalizedGuides,
      scales: [...base.scales],
      composition: base.composition,
    };
  }

  const defaultXScaleName = hasXAxisBinding ? xAxisScaleNameOf(DEFAULT_AXIS_SCOPE) : AUTO_X;
  const defaultYScaleName = hasYAxisBinding ? yAxisScaleNameOf(DEFAULT_AXIS_SCOPE) : AUTO_Y;
  const xAxisScopes: Array<CoordinateViewSpec> = xAxisIds
    .filter(axisId => axisId !== DEFAULT_AXIS_SCOPE)
    .map(axisId => ({
      id: axisId,
      coordinate: { type: PlotCoordinate.Cartesian2D, x: xAxisScaleNameOf(axisId), y: defaultYScaleName },
      placement: { kind: 'overlay' as const, target: DEFAULT_AXIS_SCOPE },
    }));
  const yAxisScopes: Array<CoordinateViewSpec> = yAxisIds
    .filter(axisId => axisId !== DEFAULT_AXIS_SCOPE)
    .map(axisId => ({
      id: axisId,
      coordinate: { type: PlotCoordinate.Cartesian2D, x: defaultXScaleName, y: yAxisScaleNameOf(axisId) },
      placement: { kind: 'overlay' as const, target: DEFAULT_AXIS_SCOPE },
    }));

  return {
    marks: normalizedMarks,
    guides: normalizedGuides,
    scales: insertAxisBindingScales(base.scales, xAxisIds, yAxisIds),
    composition: {
      defaultView: DEFAULT_AXIS_SCOPE,
      views: [
        {
          id: DEFAULT_AXIS_SCOPE,
          coordinate: { type: PlotCoordinate.Cartesian2D, x: defaultXScaleName, y: defaultYScaleName },
        },
        ...xAxisScopes,
        ...yAxisScopes,
      ],
    },
  };
};

/**
 * 创建 framework-free 的 IRPlotSpec builder。
 *
 * @description
 * 适合在非 React、SSR 或构建期生成图表规格。`plotBuilder(config).build()` 的返回值是
 * plain `IRPlotSpec`；builder-only 字段只在 build 阶段参与展开，不会进入 IR。渲染时仍使用
 * `renderPlot(spec, datasets, options?)`，它只消费已经 build 出来的 `IRPlotSpec` 与外部数据集。
 */
export const plotBuilder = (config: PlotBuilderConfig): PlotBuilder => {
  const marks: Array<AxisBoundMarkOperation> = [...(config.marks ?? [])];
  const guides: Array<AxisBoundGuide> = [...(config.guides ?? [])];
  const facets: Array<CollectedFacet> = [];
  const scaffolds: Array<CollectedScaffold> = [];
  const base = { ...config };
  delete base.marks;
  delete base.guides;

  const builder: PlotBuilder = {
    mark: mark => {
      marks.push(mark);
      return builder;
    },
    guide: guide => {
      guides.push(guide);
      return builder;
    },
    path: mark => builder.mark(mark),
    point: mark => builder.mark(mark),
    interval: mark => builder.mark(mark),
    reference: mark => builder.mark(mark),
    relation: mark => builder.mark(mark),
    axis: guide => builder.guide(guide),
    legend: guide => builder.guide(guide),
    facet: facet => {
      const { row, column, view, spacing, resolve, ...facetSpec } = facet;
      const coordinateView = view ?? `${facet.id}Panel`;
      facets.push({
        ...facetSpec,
        kind: 'facet',
        view: coordinateView,
        ...(facetDimensionOf(row) !== undefined ? { row: facetDimensionOf(row) } : {}),
        ...(facetDimensionOf(column) !== undefined ? { column: facetDimensionOf(column) } : {}),
        ...(spacing !== undefined ? { spacing } : {}),
        ...(resolve !== undefined ? { resolve } : {}),
      });
      return builder;
    },
    scaffold: scaffold => {
      const { coordinate, spacing, resolve, ...scaffoldSpec } = scaffold;
      scaffolds.push({
        ...scaffoldSpec,
        kind: 'tracks',
        coordinate: coordinate ?? { type: PlotCoordinate.Cartesian2D },
        ...(spacing !== undefined ? { spacing } : {}),
        ...(resolve !== undefined ? { resolve } : {}),
      });
      return builder;
    },
    build: () =>
      (() => {
        const normalized = normalizeAxisBindings(base, marks, guides, facets, scaffolds);
        const baseWithoutCoordinate = { ...base };
        delete baseWithoutCoordinate.coordinate;
        delete baseWithoutCoordinate.composition;
        return PlotSpecSchema.parse({
          namespace: PLOT_NAMESPACE,
          type: PlotComposite.Plot,
          ...baseWithoutCoordinate,
          scales: normalized.scales,
          ...(normalized.composition !== undefined ? { composition: normalized.composition } : {}),
          ...(normalized.coordinate !== undefined ? { coordinate: normalized.coordinate } : {}),
          marks: normalized.marks,
          guides: normalized.guides,
        });
      })(),
  };

  return builder;
};
