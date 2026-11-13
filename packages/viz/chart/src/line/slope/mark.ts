import { mergeGraphicStyle, NodeLabelPosition } from '@retikz/core';
import type { JsonObject } from '@retikz/foundation';
import { BuiltinPlotMark } from '@retikz/plot';
import type { IRPlotMark, IRPlotPosition2DEncoding } from '@retikz/plot';

import type { ChartMarkDefinition, ChartResolvedFieldMapping } from '../../_chart/contract';
import { defineChartMark } from '../../_chart/contract';
import { chartRecipeId } from '../../_chart/resolve';
import { SlopeChartType } from '../constants';
import { SlopeChartMarkSchema, SlopeChartPropertiesSchema, SlopePathPropertiesSchema } from './schema';
import type { IRSlopeChartProperties, IRSlopeMark } from './schema';

/** 读取经过 Chart encoding resolve 的直接字段 */
export const slopeFieldOf = (encodings: JsonObject, slot: string): string => {
  const mapping = encodings[slot];
  return typeof mapping === 'string' ? mapping : (mapping as ChartResolvedFieldMapping).field;
};

/** 从显式名称或配对字段确定阶段顺序 */
export const slopeStagesOf = (encodings: JsonObject, properties: IRSlopeChartProperties): [string, string] =>
  properties.stages ?? [slopeFieldOf(encodings, 'start'), slopeFieldOf(encodings, 'end')];

/** 每行独立展开为连接路径与两端的观测点、标签 */
export const resolveSlopeMarkGroup = (
  encodings: JsonObject,
  properties: IRSlopeChartProperties,
): readonly [IRPlotMark, ...Array<IRPlotMark>] => {
  const stages = slopeStagesOf(encodings, properties);
  const fields = [slopeFieldOf(encodings, 'start'), slopeFieldOf(encodings, 'end')];
  const positions = fields.map(
    (field, index) =>
      ({
        x: { value: stages[index] },
        y: { field },
      }) satisfies IRPlotPosition2DEncoding,
  );
  const colorMapping = encodings.color;
  const color = {
    field: slopeFieldOf(encodings, Object.hasOwn(encodings, 'color') ? 'color' : 'entity'),
    scale:
      typeof colorMapping === 'object'
        ? ((colorMapping as ChartResolvedFieldMapping).scale ?? chartRecipeId(SlopeChartType, 'scale.color'))
        : chartRecipeId(SlopeChartType, 'scale.color'),
  };
  const path = properties.path ?? {};
  const marks: [IRPlotMark, ...Array<IRPlotMark>] = [
    {
      type: BuiltinPlotMark.Path,
      encodings: {
        from: positions[0],
        to: positions[1],
        color,
        ...(path.stroke === undefined ? { stroke: color } : {}),
      },
      properties: {
        ...path,
        strokeWidth: path.strokeWidth ?? SlopePathPropertiesSchema.shape.strokeWidth.unwrap().parse(undefined),
        ...(typeof path.opacity === 'number' ? { opacity: { overall: path.opacity } } : {}),
      },
    },
  ];
  const point = properties.point ?? SlopeChartPropertiesSchema.shape.point.unwrap().parse(undefined);
  const label = properties.label ?? SlopeChartPropertiesSchema.shape.label.unwrap().parse(undefined);
  const pointStyle = typeof point === 'object' ? point : {};
  const labelStyle = typeof label === 'object' ? label : {};
  if (point === false && label === false) return marks;

  for (let index = 0; index < 2; index += 1) {
    const endpointLabel = {
      ...labelStyle,
      position: labelStyle.position ?? (index === 0 ? NodeLabelPosition.Left : NodeLabelPosition.Right),
    };
    marks.push({
      type: BuiltinPlotMark.Point,
      encodings: {
        position: positions[index],
        ...(pointStyle.fill === undefined ? { color } : {}),
        ...(label === false ? {} : { label: slopeFieldOf(encodings, 'entity') }),
      },
      properties: {
        ...pointStyle,
        ...(typeof pointStyle.opacity === 'number' ? { opacity: { overall: pointStyle.opacity } } : {}),
        ...(point === false ? { size: 0, minimumSize: 0, strokeWidth: 0, autoPadding: false } : {}),
        ...(label === false ? {} : { label: endpointLabel }),
      },
    });
  }
  return marks;
};

/** 坡度图作者标记继承和整体语义组替换 */
export const slopeMarkDefinition: ChartMarkDefinition = defineChartMark({
  kind: SlopeChartType,
  schema: SlopeChartMarkSchema,
  resolve: context => {
    const source = context.source as IRSlopeMark;
    const inherited = context.inherited.properties as IRSlopeChartProperties;
    const explicit = source.properties ?? {};
    const inheritedPoint = typeof inherited.point === 'object' ? inherited.point : {};
    const explicitPoint = typeof explicit.point === 'object' ? explicit.point : {};
    const inheritedLabel = typeof inherited.label === 'object' ? inherited.label : {};
    const explicitLabel = typeof explicit.label === 'object' ? explicit.label : {};
    const point =
      explicit.point === undefined
        ? inherited.point
        : explicit.point === false
          ? false
          : {
              ...inheritedPoint,
              ...explicitPoint,
              ...mergeGraphicStyle({ opacity: inheritedPoint.opacity }, { opacity: explicitPoint.opacity }),
            };
    const label =
      explicit.label === undefined
        ? inherited.label
        : explicit.label === false
          ? false
          : {
              ...inheritedLabel,
              ...explicitLabel,
              font: { ...inheritedLabel.font, ...explicitLabel.font },
            };
    return {
      marks: resolveSlopeMarkGroup(
        { ...context.inherited.encodings, ...source.encodings },
        {
          ...inherited,
          stages: slopeStagesOf(context.inherited.encodings, inherited),
          path: {
            ...inherited.path,
            ...explicit.path,
            ...mergeGraphicStyle({ opacity: inherited.path?.opacity }, { opacity: explicit.path?.opacity }),
          },
          point,
          label,
        },
      ),
    };
  },
});
