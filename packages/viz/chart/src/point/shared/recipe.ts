import type { JsonValue } from '@retikz/core';
import type { IRPlot, IRPlotChannel, IRPlotGuide, IRPlotOpacityChannel, IRPlotShapeChannel } from '@retikz/plot';

import { PlotGuide, PlotMark, PointMarkSchema } from '@retikz/plot';

import type { ChartRecipeSource, ChartRecipeStyleContext } from '../../_shared';

import { chartRecipeId, createChartRecipePlot } from '../../_shared';
import { RetikzChartError } from '../../error';
import { createPointChartAxisGuides, createPointChartCartesian2D, pointChartMarkValueOf } from './plot';

type PointChartMarkPatch = {
  encoding?: object;
};

type PointChartRecipeSource = ChartRecipeSource & {
  config: {
    encoding: {
      x: IRPlotChannel;
      y: IRPlotChannel;
      color?: { field?: string; value?: JsonValue; scale?: string };
      size?: { field?: string; value?: JsonValue; scale?: string };
      opacity?: IRPlotOpacityChannel;
      shape?: IRPlotShapeChannel;
    };
    mark?: PointChartMarkPatch;
  };
};

/** Point 类型解析方案的类型标识与尺寸图例配置 */
type PointChartRecipeOptions<TVariant extends PointChartRecipeSource> = {
  /** 当前具体类型的稳定判别值 */
  type: TVariant['type'];
  /** 返回实际参与图元尺寸映射的最终字段；常量尺寸或文本模式返回 undefined */
  finalSizeFieldOf: (spec: TVariant) => { field: string; scale?: string } | undefined;
};

/** 把 Plot 通道细化后的输出收窄为严格的字段或常量联合类型 */
const strictVisualChannelOf = (channel: {
  field?: string;
  value?: JsonValue;
  scale?: string;
}): { field: string; scale?: string } | { value: JsonValue } => {
  if (channel.field !== undefined) {
    return { field: channel.field, ...(channel.scale === undefined ? {} : { scale: channel.scale }) };
  }
  if (channel.value !== undefined) return { value: channel.value };
  throw new RetikzChartError('Chart visual channel requires a field or constant value');
};

/** 从 Point Chart 输入生成完整 Plot */
export const createPointChartPlot = <TVariant extends PointChartRecipeSource>(
  spec: TVariant,
  style: ChartRecipeStyleContext,
  options: PointChartRecipeOptions<TVariant>,
): IRPlot => {
  const cartesian = createPointChartCartesian2D(options.type);
  const coordinateView = spec.plot.composition?.defaultView;
  const encoding = spec.config.encoding;
  const generatedMark = {
    type: PlotMark.Point,
    id: chartRecipeId(options.type, 'mark.main'),
    ...(encoding.color === undefined ? {} : { color: pointChartMarkValueOf(strictVisualChannelOf(encoding.color)) }),
    ...(encoding.size === undefined ? {} : { size: pointChartMarkValueOf(strictVisualChannelOf(encoding.size)) }),
    ...(encoding.opacity === undefined
      ? {}
      : { opacity: pointChartMarkValueOf(strictVisualChannelOf(encoding.opacity)) }),
    ...(encoding.shape === undefined ? {} : { shape: pointChartMarkValueOf(strictVisualChannelOf(encoding.shape)) }),
    ...(coordinateView === undefined ? {} : { coordinateView }),
    encoding: { x: encoding.x, y: encoding.y },
  };
  const mark = PointMarkSchema.parse({
    ...generatedMark,
    ...(spec.config.mark ?? {}),
    encoding: {
      ...generatedMark.encoding,
      ...(spec.config.mark?.encoding ?? {}),
    },
  });
  const axisGuides = createPointChartAxisGuides(options.type, style, coordinateView);
  const finalSizeField = options.finalSizeFieldOf(spec);
  const sizeGuide: IRPlotGuide | undefined =
    style.legendEnabled && finalSizeField !== undefined
      ? {
          type: PlotGuide.Legend,
          channel: 'size',
          ...(finalSizeField.scale === undefined ? {} : { scale: finalSizeField.scale }),
        }
      : undefined;

  return createChartRecipePlot(spec, {
    scales: [...cartesian.scales],
    coordinate: cartesian.coordinate,
    marks: [mark],
    guides: [...axisGuides, ...(sizeGuide === undefined ? [] : [sizeGuide])],
  });
};
