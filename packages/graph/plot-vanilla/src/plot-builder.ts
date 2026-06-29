import type { AxisGuide, CoordinateOperation, Guide, MarkOperation, PlotSpec, ScaleOperation } from '@retikz/plot';

import { PLOT_NAMESPACE, PlotComposite, PlotCoordinate, PlotGuide, PlotMark, PlotScale, PlotSpecSchema } from '@retikz/plot';

type CompositionSpec = NonNullable<PlotSpec['composition']>;
type CoordinateScopeSpec = CompositionSpec['scopes'][number];
type FacetGridSpec = NonNullable<CompositionSpec['facets']>[number];
type SharedScaffoldSpec = NonNullable<CompositionSpec['scaffolds']>[number];
type FacetDimensionInput = string | NonNullable<FacetGridSpec['row']>;

export type PlotBuilderConfig = Omit<PlotSpec, 'namespace' | 'type' | 'marks' | 'guides'> & {
  marks?: Array<AxisBoundMarkOperation>;
  guides?: Array<AxisBoundGuide>;
};

type MarkBindingProps = {
  yAxisId?: string;
  facetId?: string;
  trackId?: string;
};

type GuideBindingProps = {
  facetId?: string;
  scaffoldId?: string;
  trackId?: string;
};

type AxisBoundGuide = Guide & GuideBindingProps;
type AxisBoundMarkOperation = MarkOperation & MarkBindingProps;
type AxisBoundPathMark = Extract<MarkOperation, { type: typeof PlotMark.Path }> & MarkBindingProps;
type AxisBoundPointMark = Extract<MarkOperation, { type: typeof PlotMark.Point }> & MarkBindingProps;
type AxisBoundIntervalMark = Extract<MarkOperation, { type: typeof PlotMark.Interval }> & MarkBindingProps;
type AxisBoundAxisGuide = Extract<Guide, { type: typeof PlotGuide.Axis }> & GuideBindingProps;
type AxisBoundLegendGuide = Extract<Guide, { type: typeof PlotGuide.Legend }> & GuideBindingProps;

export type BuilderFacetInput = Omit<FacetGridSpec, 'row' | 'column'> & {
  row?: FacetDimensionInput;
  column?: FacetDimensionInput;
  scopeId?: string;
  layout?: CompositionSpec['layout'];
  guidePolicy?: CompositionSpec['guidePolicy'];
};

export type BuilderScaffoldInput = Omit<SharedScaffoldSpec, 'coordinate'> & {
  coordinate?: SharedScaffoldSpec['coordinate'];
  layout?: CompositionSpec['layout'];
  guidePolicy?: CompositionSpec['guidePolicy'];
};

type CollectedFacet = FacetGridSpec & {
  scopeId: string;
  layout?: CompositionSpec['layout'];
  guidePolicy?: CompositionSpec['guidePolicy'];
};

type CollectedScaffold = SharedScaffoldSpec & {
  layout?: CompositionSpec['layout'];
  guidePolicy?: CompositionSpec['guidePolicy'];
};

export type PlotBuilder = {
  mark: (mark: AxisBoundMarkOperation) => PlotBuilder;
  guide: (guide: AxisBoundGuide) => PlotBuilder;
  path: (mark: AxisBoundPathMark) => PlotBuilder;
  point: (mark: AxisBoundPointMark) => PlotBuilder;
  interval: (mark: AxisBoundIntervalMark) => PlotBuilder;
  reference: (mark: Extract<MarkOperation, { type: typeof PlotMark.Reference }>) => PlotBuilder;
  relation: (mark: Extract<MarkOperation, { type: typeof PlotMark.Relation }>) => PlotBuilder;
  axis: (guide: AxisBoundAxisGuide) => PlotBuilder;
  legend: (guide: AxisBoundLegendGuide) => PlotBuilder;
  facet: (facet: BuilderFacetInput) => PlotBuilder;
  scaffold: (scaffold: BuilderScaffoldInput) => PlotBuilder;
  build: () => PlotSpec;
};

type NormalizedAxisBinding = {
  marks: Array<MarkOperation>;
  guides: Array<Guide>;
  scales: Array<ScaleOperation>;
  coordinate?: CoordinateOperation;
  composition?: PlotSpec['composition'];
};

const AUTO_X = '__x';
const AUTO_Y = '__y';
const DEFAULT_AXIS_SCOPE = 'default';

const yAxisScaleNameOf = (axisId: string): string => `__y.${axisId}`;

const isAxisGuide = (guide: Guide): guide is AxisGuide => guide.type === PlotGuide.Axis;

const isPositionMark = (mark: AxisBoundMarkOperation): boolean =>
  mark.type === PlotMark.Path || mark.type === PlotMark.Point || mark.type === PlotMark.Interval;

const stripMarkBindings = (mark: AxisBoundMarkOperation): MarkOperation => {
  const rest = { ...mark };
  delete rest.yAxisId;
  delete rest.facetId;
  delete rest.trackId;
  return rest;
};

const stripGuideBindings = (guide: AxisBoundGuide): Guide => {
  const rest = { ...guide };
  delete rest.facetId;
  delete rest.scaffoldId;
  delete rest.trackId;
  return rest;
};

const withMarkScope = (mark: AxisBoundMarkOperation, coordinateScope: string | undefined): MarkOperation => {
  const stripped = stripMarkBindings(mark);
  return coordinateScope === undefined ? stripped : { ...stripped, coordinateScope };
};

const withGuideScope = (guide: AxisBoundGuide, coordinateScope: string | undefined): Guide => {
  const stripped = stripGuideBindings(guide);
  if (!isAxisGuide(stripped)) return stripped;
  return coordinateScope === undefined ? stripped : { ...stripped, coordinateScope };
};

const assertMarkBindingCompatibility = (mark: AxisBoundMarkOperation): void => {
  const bindings = [
    mark.yAxisId !== undefined ? 'yAxisId' : undefined,
    mark.facetId !== undefined ? 'facetId' : undefined,
    mark.trackId !== undefined ? 'trackId' : undefined,
  ].filter((binding): binding is string => binding !== undefined);
  if (bindings.length > 1) throw new Error(`plotBuilder: mark has multiple binding props: ${bindings.join(', ')}`);
  const binding = bindings.at(0);
  if (mark.coordinateScope !== undefined && binding !== undefined) {
    throw new Error(`plotBuilder: mark cannot set both coordinateScope and ${binding}`);
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
  if (isAxisGuide(guide) && guide.coordinateScope !== undefined && binding !== undefined) {
    throw new Error(`plotBuilder: guide cannot set both coordinateScope and ${binding}`);
  }
};

const facetDimensionOf = (
  dimension: FacetDimensionInput | undefined,
): NonNullable<FacetGridSpec['row']> | undefined => {
  if (dimension === undefined) return undefined;
  return typeof dimension === 'string' ? { field: dimension } : dimension;
};

const insertAxisBindingScales = (
  scales: ReadonlyArray<ScaleOperation>,
  axisIds: ReadonlyArray<string>,
): Array<ScaleOperation> => {
  const hasXScale = scales.some(scale => scale.name === AUTO_X);
  const baseYScale = scales.find(scale => scale.name === AUTO_Y) ?? { type: PlotScale.Linear, name: AUTO_Y };
  const yScales: Array<ScaleOperation> = axisIds.map(axisId => ({
    ...baseYScale,
    name: yAxisScaleNameOf(axisId),
  }));
  const out: Array<ScaleOperation> = hasXScale ? [] : [{ type: PlotScale.Linear, name: AUTO_X }];
  let inserted = false;
  for (const scale of scales) {
    if (scale.name === AUTO_Y) {
      out.push(...yScales);
      inserted = true;
    } else {
      out.push(scale);
    }
  }
  if (!inserted) out.push(...yScales);
  return out;
};

const ensureCartesianScales = (
  scales: ReadonlyArray<ScaleOperation>,
  coordinate: CoordinateOperation,
): Array<ScaleOperation> => {
  if (coordinate.type !== PlotCoordinate.Cartesian2D) return [...scales];
  const out: Array<ScaleOperation> = [...scales];
  const x = typeof coordinate.x === 'string' ? coordinate.x : AUTO_X;
  const y = typeof coordinate.y === 'string' ? coordinate.y : AUTO_Y;
  if (!out.some(scale => scale.name === x)) out.unshift({ type: PlotScale.Linear, name: x });
  if (!out.some(scale => scale.name === y)) out.push({ type: PlotScale.Linear, name: y });
  return out;
};

const fillCoordinateScaleBindings = (
  input: CoordinateOperation,
  defaults: CoordinateOperation,
): CoordinateOperation => {
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

const mergeCompositionObject = <T extends object>(
  current: T | undefined,
  next: T | undefined,
): T | undefined => {
  if (next === undefined) return current;
  if (current === undefined) return { ...next };
  return { ...current, ...next };
};

const buildTopologyComposition = (
  facets: ReadonlyArray<CollectedFacet>,
  scaffolds: ReadonlyArray<CollectedScaffold>,
  coordinate: CoordinateOperation,
): {
  composition: CompositionSpec;
  facetScopeById: Map<string, string>;
  trackScopeById: Map<string, string>;
  scaffoldDefaultScopeById: Map<string, string>;
} => {
  const scopes: Array<CoordinateScopeSpec> = [];
  const facetSpecs: Array<FacetGridSpec> = [];
  const scaffoldSpecs: Array<SharedScaffoldSpec> = [];
  const facetScopeById = new Map<string, string>();
  const trackScopeById = new Map<string, string>();
  const scaffoldDefaultScopeById = new Map<string, string>();
  let layout: CompositionSpec['layout'] | undefined;
  let guidePolicy: CompositionSpec['guidePolicy'] | undefined;

  for (const scaffold of scaffolds) {
    if (scaffoldSpecs.some(candidate => candidate.id === scaffold.id)) {
      throw new Error(`plotBuilder: duplicate scaffold id "${scaffold.id}"`);
    }
    const { layout: scaffoldLayout, guidePolicy: scaffoldGuidePolicy, ...scaffoldSpec } = scaffold;
    layout = mergeCompositionObject(layout, scaffoldLayout);
    guidePolicy = mergeCompositionObject(guidePolicy, scaffoldGuidePolicy);
    scaffoldSpecs.push({
      ...scaffoldSpec,
      coordinate: fillCoordinateScaleBindings(scaffold.coordinate, coordinate),
    });
    for (const track of scaffold.tracks) {
      if (trackScopeById.has(track.id)) {
        throw new Error(`plotBuilder: duplicate track id "${track.id}" across scaffold bindings`);
      }
      trackScopeById.set(track.id, track.id);
      scaffoldDefaultScopeById.set(scaffold.id, scaffoldDefaultScopeById.get(scaffold.id) ?? track.id);
      scopes.push({
        id: track.id,
        placement: { kind: 'track', scaffold: scaffold.id, track: track.id },
      });
    }
  }

  for (const facet of facets) {
    if (facetScopeById.has(facet.id)) throw new Error(`plotBuilder: duplicate facet id "${facet.id}"`);
    const { scopeId, layout: facetLayout, guidePolicy: facetGuidePolicy, ...facetSpec } = facet;
    layout = mergeCompositionObject(layout, facetLayout);
    guidePolicy = mergeCompositionObject(guidePolicy, facetGuidePolicy);
    facetScopeById.set(facet.id, scopeId);
    facetSpecs.push(facetSpec);
    scopes.push({
      id: scopeId,
      coordinate: fillCoordinateScaleBindings(coordinate, coordinate),
    });
  }

  const defaultScope = scopes.at(0)?.id;
  if (defaultScope === undefined) {
    throw new Error('plotBuilder: topology binding requires at least one facet or scaffold declaration');
  }

  return {
    composition: {
      defaultScope,
      ...(scaffoldSpecs.length > 0 ? { scaffolds: scaffoldSpecs } : {}),
      scopes,
      ...(facetSpecs.length > 0 ? { facets: facetSpecs } : {}),
      ...(layout !== undefined ? { layout } : {}),
      ...(guidePolicy !== undefined ? { guidePolicy } : {}),
    },
    facetScopeById,
    trackScopeById,
    scaffoldDefaultScopeById,
  };
};

const normalizeTopologyBindings = (
  baseScales: ReadonlyArray<ScaleOperation>,
  marks: ReadonlyArray<AxisBoundMarkOperation>,
  guides: ReadonlyArray<AxisBoundGuide>,
  coordinate: CoordinateOperation,
  facets: ReadonlyArray<CollectedFacet>,
  scaffolds: ReadonlyArray<CollectedScaffold>,
): NormalizedAxisBinding => {
  const { composition, facetScopeById, trackScopeById, scaffoldDefaultScopeById } = buildTopologyComposition(
    facets,
    scaffolds,
    coordinate,
  );

  return {
    marks: marks.map(mark => {
      if (mark.facetId !== undefined) {
        const scope = facetScopeById.get(mark.facetId);
        if (scope === undefined) throw new Error(`plotBuilder: missing facet for facetId "${mark.facetId}"`);
        return withMarkScope(mark, scope);
      }
      if (mark.trackId !== undefined) {
        const scope = trackScopeById.get(mark.trackId);
        if (scope === undefined) throw new Error(`plotBuilder: missing track for trackId "${mark.trackId}"`);
        return withMarkScope(mark, scope);
      }
      return stripMarkBindings(mark);
    }),
    guides: guides.map(guide => {
      if (guide.facetId !== undefined) {
        const scope = facetScopeById.get(guide.facetId);
        if (scope === undefined) throw new Error(`plotBuilder: missing facet for facetId "${guide.facetId}"`);
        return withGuideScope(guide, scope);
      }
      if (guide.trackId !== undefined) {
        const scope = trackScopeById.get(guide.trackId);
        if (scope === undefined) throw new Error(`plotBuilder: missing track for trackId "${guide.trackId}"`);
        return withGuideScope(guide, scope);
      }
      if (guide.scaffoldId !== undefined) {
        const scope = scaffoldDefaultScopeById.get(guide.scaffoldId);
        if (scope === undefined) throw new Error(`plotBuilder: missing scaffold for scaffoldId "${guide.scaffoldId}"`);
        return withGuideScope(guide, scope);
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

  const hasAxisBinding = marks.some(mark => mark.yAxisId !== undefined);
  const hasTopologyBinding = marks.some(mark => mark.facetId !== undefined || mark.trackId !== undefined) ||
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
    throw new Error('plotBuilder: yAxisId binding only supports cartesian2D coordinates');
  }

  const axes = guides.filter(isAxisGuide);
  const yAxesById = new Map<string, AxisGuide>();
  const axesById = new Map<string, AxisGuide>();
  const seenAxisKeys = new Set<string>();
  for (const axis of axes) {
    if (axis.id === undefined) continue;
    if (axis.id.length === 0) throw new Error('plotBuilder: axis id must be non-empty when using yAxisId');
    const duplicateKey = `${axis.dimension}:${axis.id}`;
    if (seenAxisKeys.has(duplicateKey)) {
      throw new Error(`plotBuilder: duplicate axis id "${axis.id}" for dimension "${axis.dimension}"`);
    }
    seenAxisKeys.add(duplicateKey);
    axesById.set(axis.id, axis);
    if (axis.dimension === 'y') yAxesById.set(axis.id, axis);
  }

  const referencedAxisIds: Array<string> = [];
  for (const mark of marks) {
    if (mark.yAxisId === undefined) continue;
    if (mark.yAxisId.length === 0) throw new Error('plotBuilder: yAxisId must be a non-empty string');
    if (mark.yAxisId === DEFAULT_AXIS_SCOPE) continue;
    if (yAxesById.has(mark.yAxisId)) {
      if (!referencedAxisIds.includes(mark.yAxisId)) referencedAxisIds.push(mark.yAxisId);
      continue;
    }
    if (axesById.has(mark.yAxisId)) {
      throw new Error(`plotBuilder: yAxisId "${mark.yAxisId}" must reference an axis with dimension "y"`);
    }
    throw new Error(`plotBuilder: missing y axis for yAxisId "${mark.yAxisId}"`);
  }

  const yAxisIds: Array<string> = [DEFAULT_AXIS_SCOPE];
  for (const axis of axes) {
    if (axis.dimension === 'y' && axis.id !== undefined && axis.id !== DEFAULT_AXIS_SCOPE) yAxisIds.push(axis.id);
  }
  for (const axisId of referencedAxisIds) {
    if (!yAxisIds.includes(axisId)) yAxisIds.push(axisId);
  }

  if (base.composition !== undefined) {
    const scopeIds = new Set(base.composition.scopes.map(scope => scope.id));
    for (const axisId of yAxisIds) {
      if (!scopeIds.has(axisId)) {
        throw new Error(`plotBuilder: yAxisId "${axisId}" requires an explicit composition scope with the same id`);
      }
    }
  }

  const normalizedMarks = marks.map(mark => {
    if (!isPositionMark(mark)) return stripMarkBindings(mark);
    if (mark.yAxisId !== undefined) return withMarkScope(mark, mark.yAxisId);
    return mark.coordinateScope === undefined ? withMarkScope(mark, DEFAULT_AXIS_SCOPE) : stripMarkBindings(mark);
  });
  const normalizedGuides = guides.map(guide => {
    if (!isAxisGuide(guide) || guide.dimension !== 'y') return stripGuideBindings(guide);
    const coordinateScope = guide.id ?? DEFAULT_AXIS_SCOPE;
    if (guide.coordinateScope !== undefined && guide.coordinateScope !== coordinateScope) {
      throw new Error(
        `plotBuilder: y axis "${guide.id ?? '<anonymous>'}" cannot set coordinateScope different from its binding scope`,
      );
    }
    return withGuideScope(guide, coordinateScope);
  });

  if (base.composition !== undefined) {
    return {
      marks: normalizedMarks,
      guides: normalizedGuides,
      scales: [...base.scales],
      composition: base.composition,
    };
  }

  return {
    marks: normalizedMarks,
    guides: normalizedGuides,
    scales: insertAxisBindingScales(base.scales, yAxisIds),
    composition: {
      defaultScope: DEFAULT_AXIS_SCOPE,
      scopes: yAxisIds.map(axisId => ({
        id: axisId,
        coordinate: { type: PlotCoordinate.Cartesian2D, x: AUTO_X, y: yAxisScaleNameOf(axisId) },
        ...(axisId !== DEFAULT_AXIS_SCOPE
          ? { placement: { kind: 'overlay' as const, target: DEFAULT_AXIS_SCOPE } }
          : {}),
      })),
    },
  };
};

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
      const { row, column, scopeId, layout, guidePolicy, ...facetSpec } = facet;
      facets.push({
        ...facetSpec,
        scopeId: scopeId ?? `${facet.id}Panel`,
        ...(facetDimensionOf(row) !== undefined ? { row: facetDimensionOf(row) } : {}),
        ...(facetDimensionOf(column) !== undefined ? { column: facetDimensionOf(column) } : {}),
        ...(layout !== undefined ? { layout } : {}),
        ...(guidePolicy !== undefined ? { guidePolicy } : {}),
      });
      return builder;
    },
    scaffold: scaffold => {
      const { coordinate, layout, guidePolicy, ...scaffoldSpec } = scaffold;
      scaffolds.push({
        ...scaffoldSpec,
        coordinate: coordinate ?? { type: PlotCoordinate.Cartesian2D },
        ...(layout !== undefined ? { layout } : {}),
        ...(guidePolicy !== undefined ? { guidePolicy } : {}),
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
