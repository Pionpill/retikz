import type {
  IRPlotAxisGuide,
  IRPlotCoordinateOperation,
  IRPlotGuide,
  IRPlotMarkOperation,
  IRPlotScaleOperation,
  IRPlotSpec,
} from '@retikz/plot';

import { PlotCoordinate, PlotGuide, PlotMark, PlotScale } from '@retikz/plot';

import type {
  InputPlotFacet,
  InputPlotGuide,
  InputPlotMark,
  InputPlotScaffold,
  NormalizedPlotBindings,
  NormalizePlotBindingsInput,
} from './input';

type CompositionSpec = NonNullable<IRPlotSpec['composition']>;
type CoordinateViewSpec = NonNullable<CompositionSpec['views']>[number];
type ArrangementSpec = NonNullable<CompositionSpec['arrangements']>[number];
type FacetGridSpec = Extract<ArrangementSpec, { kind: 'facet' }>;
type SharedScaffoldSpec = Extract<ArrangementSpec, { kind: 'tracks' }>;
type FacetDimensionInput = string | NonNullable<FacetGridSpec['row']>;

const AUTO_X = '__x';
const AUTO_Y = '__y';
const DEFAULT_AXIS_SCOPE = 'default';
const ERROR_PREFIX = 'plot authoring:';

/** 从坐标角色的基础 scale 名派生轴 scope scale 名 */
const axisScaleNameOf = (baseScaleName: string, axisId: string): string => `${baseScaleName}.${axisId}`;

/** 判断 guide 是否为坐标轴 */
const isAxisGuide = (guide: IRPlotGuide): guide is IRPlotAxisGuide => guide.type === PlotGuide.Axis;

/** 判断 mark 是否支持按坐标轴分配 coordinate view */
const isPositionMark = (mark: InputPlotMark): boolean =>
  mark.type === PlotMark.Path || mark.type === PlotMark.Point || mark.type === PlotMark.Interval;

/** 移除 mark 上的 authoring-only binding 字段 */
const stripMarkBindings = (mark: InputPlotMark): IRPlotMarkOperation => {
  const { xAxisId: _xAxisId, yAxisId: _yAxisId, facetId: _facetId, trackId: _trackId, ...rest } = mark;
  void _xAxisId;
  void _yAxisId;
  void _facetId;
  void _trackId;
  return rest;
};

/** 移除 guide 上的 authoring-only binding 字段 */
const stripGuideBindings = (guide: InputPlotGuide): IRPlotGuide => {
  const { facetId: _facetId, scaffoldId: _scaffoldId, trackId: _trackId, ...rest } = guide;
  void _facetId;
  void _scaffoldId;
  void _trackId;
  return rest;
};

/** 把 mark 绑定到解析后的 coordinate view */
const withMarkScope = (mark: InputPlotMark, coordinateView: string | undefined): IRPlotMarkOperation => {
  const stripped = stripMarkBindings(mark);
  return coordinateView === undefined ? stripped : { ...stripped, coordinateView };
};

/** 把 axis guide 绑定到解析后的 coordinate view */
const withGuideScope = (guide: InputPlotGuide, coordinateView: string | undefined): IRPlotGuide => {
  const stripped = stripGuideBindings(guide);
  if (!isAxisGuide(stripped)) return stripped;
  return coordinateView === undefined ? stripped : { ...stripped, coordinateView };
};

/** 校验单个 mark 的 binding 种类与原有 coordinate view 是否兼容 */
const assertMarkBindingCompatibility = (mark: InputPlotMark): void => {
  const ownsAxisBinding = Object.hasOwn(mark, 'xAxisId') || Object.hasOwn(mark, 'yAxisId');
  if (ownsAxisBinding && !isPositionMark(mark)) {
    throw new Error(`${ERROR_PREFIX} axis binding is only supported on path, point, and interval marks`);
  }
  const bindings = [
    mark.xAxisId !== undefined ? 'xAxisId' : undefined,
    mark.yAxisId !== undefined ? 'yAxisId' : undefined,
    mark.facetId !== undefined ? 'facetId' : undefined,
    mark.trackId !== undefined ? 'trackId' : undefined,
  ].filter((binding): binding is string => binding !== undefined);
  if (bindings.length > 1) {
    throw new Error(`${ERROR_PREFIX} mark has multiple binding props: ${bindings.join(', ')}`);
  }
  const binding = bindings.at(0);
  if (mark.coordinateView !== undefined && binding !== undefined) {
    throw new Error(`${ERROR_PREFIX} mark cannot set both coordinateView and ${binding}`);
  }
};

/** 校验单个 guide 的 topology binding 与坐标视图是否兼容 */
const assertGuideBindingCompatibility = (guide: InputPlotGuide): void => {
  const bindings = [
    guide.facetId !== undefined ? 'facetId' : undefined,
    guide.scaffoldId !== undefined ? 'scaffoldId' : undefined,
    guide.trackId !== undefined ? 'trackId' : undefined,
  ].filter((binding): binding is string => binding !== undefined);
  if (bindings.length > 1) {
    throw new Error(`${ERROR_PREFIX} guide has multiple binding props: ${bindings.join(', ')}`);
  }
  const binding = bindings.at(0);
  if (binding !== undefined && !isAxisGuide(guide)) {
    throw new Error(`${ERROR_PREFIX} ${binding} binding is only supported on axis guides`);
  }
  if (isAxisGuide(guide) && guide.coordinateView !== undefined && binding !== undefined) {
    throw new Error(`${ERROR_PREFIX} guide cannot set both coordinateView and ${binding}`);
  }
};

/** 把 facet 简写维度转为 canonical field 声明 */
const facetDimensionOf = (
  dimension: FacetDimensionInput | undefined,
): NonNullable<FacetGridSpec['row']> | undefined => {
  if (dimension === undefined) return undefined;
  if (typeof dimension === 'string') return { field: dimension };
  return Array.isArray(dimension) ? dimension.map(entry => ({ ...entry })) : { ...dimension };
};

/** 按坐标系显式角色名复制并插入多轴 scale */
const insertAxisBindingScales = (
  scales: ReadonlyArray<IRPlotScaleOperation>,
  xAxisIds: ReadonlyArray<string>,
  yAxisIds: ReadonlyArray<string>,
  baseXScaleName: string,
  baseYScaleName: string,
): Array<IRPlotScaleOperation> => {
  const hasXBinding = xAxisIds.length > 0;
  const hasYBinding = yAxisIds.length > 0;
  const baseXScale = scales.find(scale => scale.name === baseXScaleName) ?? {
    type: PlotScale.Linear,
    name: baseXScaleName,
  };
  const baseYScale = scales.find(scale => scale.name === baseYScaleName) ?? {
    type: PlotScale.Linear,
    name: baseYScaleName,
  };
  const xScales: Array<IRPlotScaleOperation> = xAxisIds.map(axisId => ({
    ...baseXScale,
    name: axisScaleNameOf(baseXScaleName, axisId),
  }));
  const xScaleNames = new Set(xScales.map(scale => scale.name));
  const yScales: Array<IRPlotScaleOperation> = yAxisIds
    .map(axisId => ({
      ...baseYScale,
      name: axisScaleNameOf(baseYScaleName, axisId),
    }))
    .filter(scale => baseXScaleName !== baseYScaleName || !hasXBinding || !xScaleNames.has(scale.name));
  const out: Array<IRPlotScaleOperation> = [];
  let insertedX = false;
  let insertedY = false;
  for (const scale of scales) {
    const replacesX = scale.name === baseXScaleName && hasXBinding;
    const replacesY = scale.name === baseYScaleName && hasYBinding;
    const preservesUnboundRole =
      (scale.name === baseXScaleName && !hasXBinding) || (scale.name === baseYScaleName && !hasYBinding);
    if (preservesUnboundRole || (!replacesX && !replacesY)) out.push({ ...scale });
    if (replacesX) {
      out.push(...xScales);
      insertedX = true;
    }
    if (replacesY) {
      out.push(...yScales);
      insertedY = true;
    }
  }
  if (!scales.some(scale => scale.name === baseXScaleName)) {
    out.unshift(...(hasXBinding ? xScales : [{ type: PlotScale.Linear, name: baseXScaleName }]));
  } else if (hasXBinding && !insertedX) {
    out.unshift(...xScales);
  }
  if (!scales.some(scale => scale.name === baseYScaleName)) {
    out.push(...(hasYBinding ? yScales : [{ type: PlotScale.Linear, name: baseYScaleName }]));
  } else if (hasYBinding && !insertedY) {
    out.push(...yScales);
  }
  return out;
};

/** 确保 cartesian2D 坐标系声明了它引用的 x/y scale */
const ensureCartesianScales = (
  scales: ReadonlyArray<IRPlotScaleOperation>,
  coordinate: IRPlotCoordinateOperation,
): Array<IRPlotScaleOperation> => {
  const out = scales.map(scale => ({ ...scale }));
  if (coordinate.type !== PlotCoordinate.Cartesian2D) return out;
  const x = typeof coordinate.x === 'string' ? coordinate.x : AUTO_X;
  const y = typeof coordinate.y === 'string' ? coordinate.y : AUTO_Y;
  if (!out.some(scale => scale.name === x)) out.unshift({ type: PlotScale.Linear, name: x });
  if (!out.some(scale => scale.name === y)) out.push({ type: PlotScale.Linear, name: y });
  return out;
};

/** 用 Plot 默认坐标系补齐同类型 coordinate 的 scale 绑定，不改变显式绑定 */
const fillCoordinateScaleBindings = (
  input: IRPlotCoordinateOperation,
  defaults: IRPlotCoordinateOperation,
): IRPlotCoordinateOperation => {
  if (input.type !== defaults.type) return { ...input };
  if (input.type === PlotCoordinate.Cartesian2D && defaults.type === PlotCoordinate.Cartesian2D) {
    return {
      ...input,
      ...(input.x === undefined && defaults.x !== undefined ? { x: defaults.x } : {}),
      ...(input.y === undefined && defaults.y !== undefined ? { y: defaults.y } : {}),
    };
  }
  if (input.type === PlotCoordinate.Cartesian1D && defaults.type === PlotCoordinate.Cartesian1D) {
    return { ...input, ...(input.x === undefined && defaults.x !== undefined ? { x: defaults.x } : {}) };
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
  return { ...input };
};

/** 递归补齐显式 composition 中 view 与 track coordinate 的 scale 绑定 */
const fillCompositionScaleBindings = (
  composition: IRPlotSpec['composition'],
  defaults: IRPlotCoordinateOperation,
): IRPlotSpec['composition'] => {
  if (composition === undefined) return undefined;
  return {
    ...composition,
    ...(composition.views !== undefined
      ? {
          views: composition.views.map(view => ({
            ...view,
            coordinate: fillCoordinateScaleBindings(view.coordinate, defaults),
          })),
        }
      : {}),
    ...(composition.arrangements !== undefined
      ? {
          arrangements: composition.arrangements.map(arrangement =>
            arrangement.kind === 'tracks'
              ? {
                  ...arrangement,
                  coordinate: fillCoordinateScaleBindings(arrangement.coordinate, defaults),
                  tracks: arrangement.tracks.map(track => ({
                    ...track,
                    ...(track.coordinate !== undefined
                      ? { coordinate: fillCoordinateScaleBindings(track.coordinate, defaults) }
                      : {}),
                  })),
                }
              : { ...arrangement },
          ),
        }
      : {}),
  };
};

/** 把 facet authoring 输入转为 canonical facet arrangement */
const normalizeFacet = (facet: InputPlotFacet): FacetGridSpec => {
  const { row, column, view, spacing, resolve, ...rest } = facet;
  return {
    ...rest,
    kind: 'facet',
    view: view ?? `${facet.id}Panel`,
    ...(facetDimensionOf(row) !== undefined ? { row: facetDimensionOf(row) } : {}),
    ...(facetDimensionOf(column) !== undefined ? { column: facetDimensionOf(column) } : {}),
    ...(spacing !== undefined ? { spacing } : {}),
    ...(resolve !== undefined ? { resolve } : {}),
  };
};

/** 按显式 view、scaffold 模板或 authoring 默认解析 track view id */
const scaffoldTrackViewIdOf = (
  scaffold: Pick<InputPlotScaffold, 'id' | 'viewIdTemplate'>,
  track: InputPlotScaffold['tracks'][number],
): string => {
  if (track.view !== undefined) return track.view;
  if (scaffold.viewIdTemplate === undefined) return track.id;
  return scaffold.viewIdTemplate.replaceAll('{arrangement}', scaffold.id).replaceAll('{track}', track.id);
};

/** 把 scaffold authoring 输入转为 canonical tracks arrangement */
const normalizeScaffold = (scaffold: InputPlotScaffold, coordinate: IRPlotCoordinateOperation): SharedScaffoldSpec => {
  const { coordinate: scaffoldCoordinate, spacing, resolve, ...rest } = scaffold;
  return {
    ...rest,
    kind: 'tracks',
    coordinate: fillCoordinateScaleBindings(scaffoldCoordinate ?? coordinate, coordinate),
    tracks: scaffold.tracks.map(track => ({ ...track, view: scaffoldTrackViewIdOf(scaffold, track) })),
    ...(spacing !== undefined ? { spacing } : {}),
    ...(resolve !== undefined ? { resolve } : {}),
  };
};

/** 把 facet 与 scaffold authoring 声明装配为 canonical composition 与绑定索引 */
const buildTopologyComposition = (
  facets: ReadonlyArray<InputPlotFacet>,
  scaffolds: ReadonlyArray<InputPlotScaffold>,
  coordinate: IRPlotCoordinateOperation,
): {
  composition: CompositionSpec;
  facetViewById: Map<string, string>;
  trackViewById: Map<string, string>;
  scaffoldDefaultViewById: Map<string, string>;
} => {
  const views: Array<CoordinateViewSpec> = [];
  const facetSpecs: Array<FacetGridSpec> = [];
  const scaffoldSpecs: Array<SharedScaffoldSpec> = [];
  const facetViewById = new Map<string, string>();
  const trackViewById = new Map<string, string>();
  const scaffoldDefaultViewById = new Map<string, string>();

  for (const scaffoldInput of scaffolds) {
    const scaffold = normalizeScaffold(scaffoldInput, coordinate);
    if (scaffoldSpecs.some(candidate => candidate.id === scaffold.id)) {
      throw new Error(`${ERROR_PREFIX} duplicate scaffold id "${scaffold.id}"`);
    }
    scaffoldSpecs.push(scaffold);
    for (const track of scaffold.tracks) {
      if (trackViewById.has(track.id)) {
        throw new Error(`${ERROR_PREFIX} duplicate track id "${track.id}" across scaffold bindings`);
      }
      const view = track.view ?? track.id;
      trackViewById.set(track.id, view);
      scaffoldDefaultViewById.set(scaffold.id, scaffoldDefaultViewById.get(scaffold.id) ?? view);
    }
  }

  for (const facetInput of facets) {
    const facet = normalizeFacet(facetInput);
    if (facetViewById.has(facet.id)) throw new Error(`${ERROR_PREFIX} duplicate facet id "${facet.id}"`);
    facetViewById.set(facet.id, facet.view);
    facetSpecs.push(facet);
    views.push({ id: facet.view, coordinate: fillCoordinateScaleBindings(coordinate, coordinate) });
  }

  const defaultView = views.at(0)?.id ?? scaffoldSpecs[0]?.tracks[0]?.view;
  if (defaultView === undefined) {
    throw new Error(`${ERROR_PREFIX} topology binding requires at least one facet or scaffold declaration`);
  }

  return {
    composition: {
      defaultView,
      ...(views.length > 0 ? { views } : {}),
      arrangements: [...scaffoldSpecs, ...facetSpecs],
    },
    facetViewById,
    trackViewById,
    scaffoldDefaultViewById,
  };
};

/** 把 mark 与 axis guide 的 facet、track、scaffold 绑定解析为 coordinate view */
const normalizeTopologyBindings = (
  marks: ReadonlyArray<InputPlotMark>,
  guides: ReadonlyArray<InputPlotGuide>,
  scales: ReadonlyArray<IRPlotScaleOperation>,
  coordinate: IRPlotCoordinateOperation,
  facets: ReadonlyArray<InputPlotFacet>,
  scaffolds: ReadonlyArray<InputPlotScaffold>,
): NormalizedPlotBindings => {
  const { composition, facetViewById, trackViewById, scaffoldDefaultViewById } = buildTopologyComposition(
    facets,
    scaffolds,
    coordinate,
  );
  return {
    marks: marks.map(mark => {
      if (mark.facetId !== undefined) {
        const view = facetViewById.get(mark.facetId);
        if (view === undefined) throw new Error(`${ERROR_PREFIX} missing facet for facetId "${mark.facetId}"`);
        return withMarkScope(mark, view);
      }
      if (mark.trackId !== undefined) {
        const view = trackViewById.get(mark.trackId);
        if (view === undefined) throw new Error(`${ERROR_PREFIX} missing track for trackId "${mark.trackId}"`);
        return withMarkScope(mark, view);
      }
      return stripMarkBindings(mark);
    }),
    guides: guides.map(guide => {
      if (guide.facetId !== undefined) {
        const view = facetViewById.get(guide.facetId);
        if (view === undefined) throw new Error(`${ERROR_PREFIX} missing facet for facetId "${guide.facetId}"`);
        return withGuideScope(guide, view);
      }
      if (guide.trackId !== undefined) {
        const view = trackViewById.get(guide.trackId);
        if (view === undefined) throw new Error(`${ERROR_PREFIX} missing track for trackId "${guide.trackId}"`);
        return withGuideScope(guide, view);
      }
      if (guide.scaffoldId !== undefined) {
        const view = scaffoldDefaultViewById.get(guide.scaffoldId);
        if (view === undefined) {
          throw new Error(`${ERROR_PREFIX} missing scaffold for scaffoldId "${guide.scaffoldId}"`);
        }
        return withGuideScope(guide, view);
      }
      return stripGuideBindings(guide);
    }),
    scales: ensureCartesianScales(scales, coordinate),
    composition,
  };
};

/** 把 authoring-only axis、facet 与 scaffold binding 展开为 Plot Source IR 字段 */
export const normalizePlotBindings = (input: NormalizePlotBindingsInput): NormalizedPlotBindings => {
  const { marks, guides, scales, coordinate, composition, facets, scaffolds } = input;
  marks.forEach(assertMarkBindingCompatibility);
  guides.forEach(assertGuideBindingCompatibility);

  if (facets.length > 0 && scaffolds.length > 0) {
    throw new Error(`${ERROR_PREFIX} facets and scaffolds cannot be mixed in one Plot`);
  }

  const hasXAxisBinding = marks.some(mark => mark.xAxisId !== undefined);
  const hasYAxisBinding = marks.some(mark => mark.yAxisId !== undefined);
  const hasAxisBinding = hasXAxisBinding || hasYAxisBinding;
  const hasTopologyBinding =
    marks.some(mark => mark.facetId !== undefined || mark.trackId !== undefined) ||
    guides.some(guide => guide.facetId !== undefined || guide.scaffoldId !== undefined || guide.trackId !== undefined);
  const hasTopologyDeclarations = facets.length > 0 || scaffolds.length > 0;

  if (hasAxisBinding && (hasTopologyBinding || hasTopologyDeclarations)) {
    throw new Error(`${ERROR_PREFIX} multiple binding modes are not supported in one Plot`);
  }

  if (hasTopologyBinding || hasTopologyDeclarations) {
    if (composition !== undefined) {
      throw new Error(`${ERROR_PREFIX} composition cannot be mixed with facet/scaffold binding sugar`);
    }
    const effectiveCoordinate = coordinate ?? { type: PlotCoordinate.Cartesian2D, x: AUTO_X, y: AUTO_Y };
    return normalizeTopologyBindings(marks, guides, scales, effectiveCoordinate, facets, scaffolds);
  }

  if (!hasAxisBinding) {
    return {
      marks: marks.map(stripMarkBindings),
      guides: guides.map(stripGuideBindings),
      scales: scales.map(scale => ({ ...scale })),
      ...(composition !== undefined && coordinate !== undefined
        ? { composition: fillCompositionScaleBindings(composition, coordinate) }
        : composition !== undefined
          ? { composition: { ...composition } }
          : coordinate !== undefined
            ? { coordinate: { ...coordinate } }
            : {}),
    };
  }

  const effectiveCoordinate = coordinate ?? { type: PlotCoordinate.Cartesian2D, x: AUTO_X, y: AUTO_Y };
  if (effectiveCoordinate.type !== PlotCoordinate.Cartesian2D) {
    throw new Error(`${ERROR_PREFIX} axis id binding only supports cartesian2D coordinates`);
  }

  const axes = guides.filter(isAxisGuide);
  const xAxesById = new Map<string, IRPlotAxisGuide>();
  const yAxesById = new Map<string, IRPlotAxisGuide>();
  const axesById = new Map<string, IRPlotAxisGuide>();
  const seenAxisKeys = new Set<string>();
  const seenBindingScopeIds = new Map<string, string>();
  for (const axis of axes) {
    if (axis.id === undefined) continue;
    if (axis.id.length === 0) throw new Error(`${ERROR_PREFIX} axis id must be non-empty when using axis id binding`);
    const duplicateKey = `${axis.dimension}:${axis.id}`;
    if (seenAxisKeys.has(duplicateKey)) {
      throw new Error(`${ERROR_PREFIX} duplicate axis id "${axis.id}" for dimension "${axis.dimension}"`);
    }
    seenAxisKeys.add(duplicateKey);
    axesById.set(axis.id, axis);
    if (axis.dimension === 'x') xAxesById.set(axis.id, axis);
    if (axis.dimension === 'y') yAxesById.set(axis.id, axis);
    if ((axis.dimension === 'x' && hasXAxisBinding) || (axis.dimension === 'y' && hasYAxisBinding)) {
      const previousDimension = seenBindingScopeIds.get(axis.id);
      if (previousDimension !== undefined && previousDimension !== axis.dimension) {
        throw new Error(
          `${ERROR_PREFIX} axis id "${axis.id}" cannot be reused across dimensions when using axis id binding`,
        );
      }
      seenBindingScopeIds.set(axis.id, axis.dimension);
    }
  }

  const referencedXAxisIds: Array<string> = [];
  const referencedYAxisIds: Array<string> = [];
  for (const mark of marks) {
    if (mark.xAxisId !== undefined) {
      if (mark.xAxisId.length === 0) throw new Error(`${ERROR_PREFIX} xAxisId must be a non-empty string`);
      if (mark.xAxisId !== DEFAULT_AXIS_SCOPE) {
        if (xAxesById.has(mark.xAxisId)) {
          if (!referencedXAxisIds.includes(mark.xAxisId)) referencedXAxisIds.push(mark.xAxisId);
        } else if (axesById.has(mark.xAxisId)) {
          throw new Error(`${ERROR_PREFIX} xAxisId "${mark.xAxisId}" must reference an axis with dimension "x"`);
        } else {
          throw new Error(`${ERROR_PREFIX} missing x axis for xAxisId "${mark.xAxisId}"`);
        }
      }
    }
    if (mark.yAxisId !== undefined) {
      if (mark.yAxisId.length === 0) throw new Error(`${ERROR_PREFIX} yAxisId must be a non-empty string`);
      if (mark.yAxisId !== DEFAULT_AXIS_SCOPE) {
        if (yAxesById.has(mark.yAxisId)) {
          if (!referencedYAxisIds.includes(mark.yAxisId)) referencedYAxisIds.push(mark.yAxisId);
        } else if (axesById.has(mark.yAxisId)) {
          throw new Error(`${ERROR_PREFIX} yAxisId "${mark.yAxisId}" must reference an axis with dimension "y"`);
        } else {
          throw new Error(`${ERROR_PREFIX} missing y axis for yAxisId "${mark.yAxisId}"`);
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
  for (const axisId of referencedXAxisIds) if (!xAxisIds.includes(axisId)) xAxisIds.push(axisId);
  for (const axisId of referencedYAxisIds) if (!yAxisIds.includes(axisId)) yAxisIds.push(axisId);

  const explicitComposition =
    composition !== undefined ? fillCompositionScaleBindings(composition, effectiveCoordinate) : undefined;
  if (explicitComposition !== undefined) {
    const viewIds = new Set([
      ...(explicitComposition.views ?? []).map(view => view.id),
      ...(explicitComposition.arrangements ?? []).flatMap(arrangement =>
        arrangement.kind === 'tracks'
          ? arrangement.tracks.map(track =>
              (track.view ?? arrangement.viewIdTemplate ?? '{arrangement}.track.{track}')
                .replaceAll('{arrangement}', arrangement.id)
                .replaceAll('{track}', track.id),
            )
          : [],
      ),
    ]);
    for (const axisId of [...xAxisIds, ...yAxisIds]) {
      if (!viewIds.has(axisId)) {
        throw new Error(`${ERROR_PREFIX} axis id "${axisId}" requires an explicit composition view with the same id`);
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
        `${ERROR_PREFIX} ${guide.dimension} axis "${guide.id ?? '<anonymous>'}" cannot set coordinateView different from its bound coordinate view`,
      );
    }
    return withGuideScope(guide, coordinateView);
  });

  if (explicitComposition !== undefined) {
    return {
      marks: normalizedMarks,
      guides: normalizedGuides,
      scales: scales.map(scale => ({ ...scale })),
      composition: explicitComposition,
    };
  }

  const baseXScaleName = typeof effectiveCoordinate.x === 'string' ? effectiveCoordinate.x : AUTO_X;
  const baseYScaleName = typeof effectiveCoordinate.y === 'string' ? effectiveCoordinate.y : AUTO_Y;
  const defaultXScaleName = hasXAxisBinding ? axisScaleNameOf(baseXScaleName, DEFAULT_AXIS_SCOPE) : baseXScaleName;
  const defaultYScaleName = hasYAxisBinding ? axisScaleNameOf(baseYScaleName, DEFAULT_AXIS_SCOPE) : baseYScaleName;
  const xAxisScopes: Array<CoordinateViewSpec> = xAxisIds
    .filter(axisId => axisId !== DEFAULT_AXIS_SCOPE)
    .map(axisId => ({
      id: axisId,
      coordinate: {
        type: PlotCoordinate.Cartesian2D,
        x: axisScaleNameOf(baseXScaleName, axisId),
        y: defaultYScaleName,
      },
      placement: { kind: 'overlay', target: DEFAULT_AXIS_SCOPE },
    }));
  const yAxisScopes: Array<CoordinateViewSpec> = yAxisIds
    .filter(axisId => axisId !== DEFAULT_AXIS_SCOPE)
    .map(axisId => ({
      id: axisId,
      coordinate: {
        type: PlotCoordinate.Cartesian2D,
        x: defaultXScaleName,
        y: axisScaleNameOf(baseYScaleName, axisId),
      },
      placement: { kind: 'overlay', target: DEFAULT_AXIS_SCOPE },
    }));

  return {
    marks: normalizedMarks,
    guides: normalizedGuides,
    scales: insertAxisBindingScales(scales, xAxisIds, yAxisIds, baseXScaleName, baseYScaleName),
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
