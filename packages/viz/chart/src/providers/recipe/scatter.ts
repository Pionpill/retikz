import type { IRJsonObject, JsonValue } from '@retikz/core';
import type { IRPlotGuide, IRPlotSpec } from '@retikz/plot';

import { JsonObjectSchema, JsonValueSchema } from '@retikz/core';
import { PLOT_NAMESPACE, PlotComposite, PlotCoordinate, PlotGuide, PlotMark, PointMarkSchema } from '@retikz/plot';

import type { IRScatterChartSpec } from '../../schemas';
import type { ChartPatchChange, ChartRecipe, ChartRecipeSeed, ChartRecipeStyleContext } from './types';

import { ChartInspectionMemberKind, ScatterChartSpecSchema, ScatterChartType } from '../../schemas';
import { ChartRecipeInvariantError, ChartRecipeInvariantReason } from './invariant';
import { chartRecipeId, createChartAxisGuides, createChartCartesian2DSeed, plotMarkValueOf } from './shared';

const scatterPointPatchPaths = [
  'color',
  'textColor',
  'shape',
  'fill',
  'stroke',
  'strokeWidth',
  'fillOpacity',
  'strokeOpacity',
  'opacity',
  'rotate',
  'minimumSize',
  'zIndex',
  'align',
  'lineHeight',
  'maxTextWidth',
  'cornerRadius',
  'scale',
  'padding',
  'margin',
  'dashed',
  'dotted',
  'dashPattern',
  'font',
  'boundary',
  'shadow',
  'blendMode',
  'dx',
  'dy',
  'anchorId',
  'layer',
  'label',
] as const;

const jsonObject = (value: unknown): IRJsonObject => JsonObjectSchema.parse(value);

/** 把 Plot legacy channel 的 refined 输出收窄为严格 field/value union */
const strictVisualChannelOf = (channel: {
  field?: string;
  value?: JsonValue;
  scale?: string;
}): { field: string; scale?: string } | { value: JsonValue } => {
  if (channel.field !== undefined) {
    return { field: channel.field, ...(channel.scale === undefined ? {} : { scale: channel.scale }) };
  }
  if (channel.value !== undefined) return { value: channel.value };
  throw new Error('Chart visual channel requires a field or constant value');
};

/** 把 Scatter Point patch 转成 merge pipeline 的逐叶 change */
const scatterPointPatchChanges = (patch: IRScatterChartSpec['mark']): Array<ChartPatchChange> => {
  if (patch === undefined) return [];
  const changes: Array<ChartPatchChange> = [];
  for (const path of scatterPointPatchPaths) {
    const value = patch[path];
    if (value !== undefined) changes.push({ path: [path], value: JsonValueSchema.parse(value) });
  }
  return changes;
};

/** 从 Scatter 输入建立 resolver 消费的不可变 recipe seed */
const createScatterSeed = (spec: IRScatterChartSpec, style: ChartRecipeStyleContext): ChartRecipeSeed => {
  const cartesian = createChartCartesian2DSeed(ScatterChartType);
  const coordinateView = spec.composition?.defaultView;
  const mark = PointMarkSchema.parse({
    type: PlotMark.Point,
    id: chartRecipeId(ScatterChartType, 'mark.main'),
    ...(spec.encoding.color === undefined ? {} : { color: plotMarkValueOf(spec.encoding.color) }),
    ...(spec.encoding.size === undefined ? {} : { size: plotMarkValueOf(spec.encoding.size) }),
    ...(spec.encoding.opacity === undefined
      ? {}
      : { opacity: plotMarkValueOf(strictVisualChannelOf(spec.encoding.opacity)) }),
    ...(spec.encoding.shape === undefined
      ? {}
      : { shape: plotMarkValueOf(strictVisualChannelOf(spec.encoding.shape)) }),
    ...(coordinateView === undefined ? {} : { coordinateView }),
    encoding: { x: spec.encoding.x, y: spec.encoding.y },
  });
  const axisGuides = createChartAxisGuides(ScatterChartType, style, coordinateView);
  const sizeGuide: IRPlotGuide | undefined =
    style.legendEnabled && spec.encoding.size !== undefined && 'field' in spec.encoding.size
      ? {
          type: PlotGuide.Legend,
          channel: 'size',
          scale: spec.encoding.size.scale ?? `__size_${spec.encoding.size.field}`,
        }
      : undefined;
  const guides = [...axisGuides, ...(sizeGuide === undefined ? [] : [sizeGuide])];
  const plot: IRPlotSpec = {
    namespace: PLOT_NAMESPACE,
    type: PlotComposite.Plot,
    ...(spec.id === undefined ? {} : { id: `${spec.id}/plot` }),
    data: spec.data,
    scales: [...cartesian.scales],
    ...(spec.composition === undefined ? { coordinate: cartesian.coordinate } : { composition: spec.composition }),
    marks: [mark],
    guides,
    ...(spec.layout === undefined ? {} : { layout: spec.layout }),
    ...(spec.width === undefined ? {} : { width: spec.width }),
    ...(spec.height === undefined ? {} : { height: spec.height }),
    ...(spec.meta === undefined ? {} : { meta: spec.meta }),
  };
  const spatialMember =
    spec.composition === undefined
      ? {
          target: 'coordinate.main',
          kind: ChartInspectionMemberKind.Coordinate,
          core: true,
          value: jsonObject(cartesian.coordinate),
          plotPath: ['coordinate'] as const,
          patchablePaths: [],
          sourcePath: '$recipe/scatter/coordinate.main',
        }
      : {
          target: 'composition.main',
          kind: ChartInspectionMemberKind.Composition,
          core: true,
          value: jsonObject(spec.composition),
          plotPath: ['composition'] as const,
          patchablePaths: [],
          sourcePath: '$recipe/scatter/composition.main',
        };
  const guideMembers = guides.map((guide, index) => ({
    target: guide.type === PlotGuide.Legend ? 'guide.size' : guide.dimension === 'x' ? 'guide.x' : 'guide.y',
    kind: ChartInspectionMemberKind.Guide,
    core: false,
    value: jsonObject(guide),
    plotPath: ['guides', index] as const,
    patchablePaths: [],
    sourcePath: `$recipe/scatter/${guide.type === PlotGuide.Legend ? 'guide.size' : `guide.${guide.dimension}`}`,
  }));
  const patchChanges = scatterPointPatchChanges(spec.mark);
  return {
    plot,
    members: [
      {
        target: 'scale.x',
        kind: ChartInspectionMemberKind.Scale,
        core: true,
        value: jsonObject(cartesian.scales[0]),
        plotPath: ['scales', 0],
        patchablePaths: [],
        sourcePath: '$recipe/scatter/scale.x',
      },
      {
        target: 'scale.y',
        kind: ChartInspectionMemberKind.Scale,
        core: true,
        value: jsonObject(cartesian.scales[1]),
        plotPath: ['scales', 1],
        patchablePaths: [],
        sourcePath: '$recipe/scatter/scale.y',
      },
      spatialMember,
      {
        target: 'mark.main',
        kind: ChartInspectionMemberKind.Mark,
        core: true,
        value: jsonObject(mark),
        plotPath: ['marks', 0],
        patchablePaths: scatterPointPatchPaths.map(path => [path]),
        sourcePath: '$recipe/scatter/mark.main',
      },
      ...guideMembers,
    ],
    patches:
      patchChanges.length === 0
        ? []
        : [{ target: 'mark.main', inputPath: ['mark'], sourcePath: '$spec/mark', changes: patchChanges }],
  };
};

const sameChannel = (left: unknown, right: unknown): boolean => JSON.stringify(left) === JSON.stringify(right);

/** 验证 merge 后的 PlotSpec 仍保留 Scatter 的不可撤销语义 */
const validateScatterCore = (spec: IRScatterChartSpec, plotSpec: IRPlotSpec): void => {
  const requiredScaleNames = [chartRecipeId(ScatterChartType, 'scale.x'), chartRecipeId(ScatterChartType, 'scale.y')];
  if (requiredScaleNames.some(name => !plotSpec.scales.some(scale => scale.name === name))) {
    throw new ChartRecipeInvariantError(ChartRecipeInvariantReason.RequiredScale, ['scales']);
  }

  if (plotSpec.coordinate !== undefined) {
    if (
      plotSpec.coordinate.type === PlotCoordinate.Cartesian1D ||
      plotSpec.coordinate.type === PlotCoordinate.Polar1D
    ) {
      throw new ChartRecipeInvariantError(ChartRecipeInvariantReason.SpatialRoot, ['coordinate']);
    }
  } else if (plotSpec.composition === undefined) {
    throw new ChartRecipeInvariantError(ChartRecipeInvariantReason.SpatialRoot, ['coordinate']);
  } else {
    const defaultView = plotSpec.composition.views?.find(view => view.id === plotSpec.composition?.defaultView);
    if (
      defaultView?.coordinate.type === PlotCoordinate.Cartesian1D ||
      defaultView?.coordinate.type === PlotCoordinate.Polar1D
    ) {
      throw new ChartRecipeInvariantError(ChartRecipeInvariantReason.SpatialRoot, ['composition', 'defaultView']);
    }
  }

  const mainMark = PointMarkSchema.safeParse(plotSpec.marks[0]);
  const expectedView = plotSpec.composition?.defaultView;
  if (
    !mainMark.success ||
    mainMark.data.id !== chartRecipeId(ScatterChartType, 'mark.main') ||
    !sameChannel(mainMark.data.encoding.x, spec.encoding.x) ||
    !sameChannel(mainMark.data.encoding.y, spec.encoding.y) ||
    mainMark.data.coordinateView !== expectedView
  ) {
    throw new ChartRecipeInvariantError(ChartRecipeInvariantReason.CoreMark, ['marks']);
  }
};

/** Scatter canonical type 的内建 recipe */
export const ScatterChartRecipe: ChartRecipe<IRScatterChartSpec> = {
  type: ScatterChartType,
  schema: ScatterChartSpecSchema,
  createSeed: createScatterSeed,
  validateCore: validateScatterCore,
};
