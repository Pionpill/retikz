import type { IRJsonObject, JsonValue } from '@retikz/core';
import type { IRPlotGuide, IRPlotPointMark, IRPlotSpec } from '@retikz/plot';

import { JsonObjectSchema, JsonValueSchema } from '@retikz/core';
import { PLOT_NAMESPACE, PlotComposite, PlotCoordinate, PlotGuide, PlotMark, PointMarkSchema } from '@retikz/plot';

import type { ChartPatchChange, ChartRecipeSeed, ChartRecipeStyleContext } from '../../shared';
import type { IRBubbleChartSpec } from '../bubble';
import type { IRScatterChartSpec } from '../scatter';

import { ChartInspectionMemberKind } from '../../../inspection';
import { chartRecipeId } from '../../../shared';
import { ChartRecipeInvariantError, ChartRecipeInvariantReason } from '../../shared';
import { createChartAxisGuides, createChartCartesian2DSeed, plotMarkValueOf } from './plot-seed';

/** 共享 Point recipe 可消费的封闭 Chart variant */
type IRPointChartSpec = IRScatterChartSpec | IRBubbleChartSpec;

/** Point recipe 的 variant-specific identity、patch 与核心校验契约 */
type PointChartRecipeOptions<TSpec extends IRPointChartSpec> = {
  /** 当前 canonical variant 的稳定判别值 */
  type: TSpec['type'];
  /** 主 Point 允许写入的顶层 patch 路径 */
  patchPaths: Array<string>;
  /** 返回实际参与 glyph 尺寸映射的最终字段；常量尺寸或 text mode 返回 undefined */
  finalSizeFieldOf: (spec: TSpec) => { field: string; scale?: string } | undefined;
  /** 对 variant 独有的主 Point 核心语义执行额外复验 */
  validateMainMark?: (spec: TSpec, mark: IRPlotPointMark) => boolean;
};

const jsonObject = (value: unknown): IRJsonObject => JsonObjectSchema.parse(value);

/** 把 Plot channel 的 refined 输出收窄为严格 field/value union */
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

/** 把 Point Chart patch 转成 resolution merge 的逐叶 change */
const pointPatchChanges = (patch: IRPointChartSpec['mark'], patchPaths: Array<string>): Array<ChartPatchChange> => {
  if (patch === undefined) return [];
  const patchRecord = patch as Record<string, unknown>;
  const changes: Array<ChartPatchChange> = [];
  for (const path of patchPaths) {
    const value = patchRecord[path];
    if (value !== undefined) changes.push({ path: [path], value: JsonValueSchema.parse(value) });
  }
  const encodingPatch: Readonly<Record<string, unknown>> = patch.encoding ?? {};
  for (const [path, value] of Object.entries(encodingPatch)) {
    if (value !== undefined) changes.push({ path: ['encoding', path], value: JsonValueSchema.parse(value) });
  }
  return changes;
};

/** 从 Point Chart 输入建立 resolver 消费的不可变 recipe seed */
export const createPointChartSeed = <TSpec extends IRPointChartSpec>(
  spec: TSpec,
  style: ChartRecipeStyleContext,
  options: PointChartRecipeOptions<TSpec>,
): ChartRecipeSeed => {
  const cartesian = createChartCartesian2DSeed(options.type);
  const coordinateView = spec.composition?.defaultView;
  const mark = PointMarkSchema.parse({
    type: PlotMark.Point,
    id: chartRecipeId(options.type, 'mark.main'),
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
  const axisGuides = createChartAxisGuides(options.type, style, coordinateView);
  const finalSizeField = options.finalSizeFieldOf(spec);
  const sizeGuide: IRPlotGuide | undefined =
    style.legendEnabled && finalSizeField !== undefined
      ? {
          type: PlotGuide.Legend,
          channel: 'size',
          ...(finalSizeField.scale === undefined ? {} : { scale: finalSizeField.scale }),
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
          sourcePath: `$recipe/${options.type}/coordinate.main`,
        }
      : {
          target: 'composition.main',
          kind: ChartInspectionMemberKind.Composition,
          core: true,
          value: jsonObject(spec.composition),
          plotPath: ['composition'] as const,
          patchablePaths: [],
          sourcePath: `$recipe/${options.type}/composition.main`,
        };
  const guideMembers = guides.map((guide, index) => ({
    target: guide.type === PlotGuide.Legend ? 'guide.size' : guide.dimension === 'x' ? 'guide.x' : 'guide.y',
    kind: ChartInspectionMemberKind.Guide,
    core: false,
    value: jsonObject(guide),
    plotPath: ['guides', index] as const,
    patchablePaths: [],
    sourcePath: `$recipe/${options.type}/${guide.type === PlotGuide.Legend ? 'guide.size' : `guide.${guide.dimension}`}`,
  }));
  const patchChanges = pointPatchChanges(spec.mark, options.patchPaths);
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
        sourcePath: `$recipe/${options.type}/scale.x`,
      },
      {
        target: 'scale.y',
        kind: ChartInspectionMemberKind.Scale,
        core: true,
        value: jsonObject(cartesian.scales[1]),
        plotPath: ['scales', 1],
        patchablePaths: [],
        sourcePath: `$recipe/${options.type}/scale.y`,
      },
      spatialMember,
      {
        target: 'mark.main',
        kind: ChartInspectionMemberKind.Mark,
        core: true,
        value: jsonObject(mark),
        plotPath: ['marks', 0],
        patchablePaths: [
          ...options.patchPaths.map(path => [path]),
          ...Object.keys(spec.mark?.encoding ?? {}).map(path => ['encoding', path]),
        ],
        sourcePath: `$recipe/${options.type}/mark.main`,
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

/** 验证 merge 后的 PlotSpec 仍保留 Point Chart 的不可撤销语义 */
export const validatePointChartCore = <TSpec extends IRPointChartSpec>(
  spec: TSpec,
  plotSpec: IRPlotSpec,
  options: PointChartRecipeOptions<TSpec>,
): void => {
  const requiredScaleNames = [chartRecipeId(options.type, 'scale.x'), chartRecipeId(options.type, 'scale.y')];
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
    mainMark.data.id !== chartRecipeId(options.type, 'mark.main') ||
    !sameChannel(mainMark.data.encoding.x, spec.encoding.x) ||
    !sameChannel(mainMark.data.encoding.y, spec.encoding.y) ||
    mainMark.data.coordinateView !== expectedView ||
    (options.validateMainMark !== undefined && !options.validateMainMark(spec, mainMark.data))
  ) {
    throw new ChartRecipeInvariantError(ChartRecipeInvariantReason.CoreMark, ['marks']);
  }
};
