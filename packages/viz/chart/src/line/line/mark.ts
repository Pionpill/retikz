import { mergeGraphicStyle } from '@retikz/core';
import type { JsonObject } from '@retikz/foundation';
import type { IRPlotMark, IRPlotPathMark, IRPlotPointMark } from '@retikz/plot';

import type { ChartMarkDefinition, ChartResolvedFieldMapping } from '../../_chart/contract';
import { defineChartMark } from '../../_chart/contract';
import { chartRecipeId } from '../../_chart/resolve';
import { LineChartMarkSchema, LineChartPropertiesSchema, LinePathPropertiesSchema } from './schema';
import type { IRLineChartProperties, IRLineMark } from './schema';

/** 读取字段映射解析阶段已经确定的直接字段 */
const fieldOf = (encodings: JsonObject, slot: string): string => {
  const value = encodings[slot];
  return typeof value === 'string' ? value : (value as ChartResolvedFieldMapping).field;
};

/** 将 Line 语义组下沉为开放路径和可选观测点 */
export const resolveLineMarkGroup = (
  encodings: JsonObject,
  properties: IRLineChartProperties,
): readonly [IRPlotMark, ...Array<IRPlotMark>] => {
  const x = fieldOf(encodings, 'x');
  const y = fieldOf(encodings, 'y');
  const series = encodings.series;
  const color = !Object.hasOwn(encodings, 'series')
    ? undefined
    : {
        field: fieldOf(encodings, 'series'),
        scale:
          typeof series === 'string'
            ? chartRecipeId('line', 'scale.series')
            : ((series as ChartResolvedFieldMapping).scale ?? chartRecipeId('line', 'scale.series')),
      };
  const pathProperties = properties.path ?? {};
  const path: IRPlotPathMark = {
    type: 'path',
    encodings: {
      position: { x: { field: x }, y: { field: y } },
      ...(!Object.hasOwn(encodings, 'order') ? {} : { order: fieldOf(encodings, 'order') }),
      ...(color === undefined ? {} : { series: color.field, color }),
      ...(color === undefined || pathProperties.stroke !== undefined ? {} : { stroke: color }),
    },
    properties: {
      ...pathProperties,
      closed: false,
      strokeWidth: pathProperties.strokeWidth ?? LinePathPropertiesSchema.shape.strokeWidth.unwrap().parse(undefined),
      ...(typeof pathProperties.opacity === 'number' ? { opacity: { overall: pathProperties.opacity } } : {}),
    },
  };
  const pointOption = properties.point ?? LineChartPropertiesSchema.shape.point.unwrap().parse(undefined);
  if (pointOption === false) return [path];
  const pointProperties = pointOption === true ? {} : pointOption;
  const point: IRPlotPointMark = {
    type: 'point',
    encodings: {
      position: { x: { field: x }, y: { field: y } },
      ...(color === undefined || pointProperties.fill !== undefined ? {} : { color }),
    },
    properties: {
      ...pointProperties,
      ...(typeof pointProperties.opacity === 'number' ? { opacity: { overall: pointProperties.opacity } } : {}),
    },
  };
  return [path, point];
};

/** Line authored mark 与内建组共用同一解析链 */
export const lineMarkDefinition: ChartMarkDefinition = defineChartMark({
  kind: 'line',
  schema: LineChartMarkSchema,
  resolve: context => {
    const source = context.source as IRLineMark;
    const inherited = context.inherited.properties as IRLineChartProperties;
    const explicit = source.properties ?? {};
    const inheritedPoint = typeof inherited.point === 'object' ? inherited.point : {};
    const explicitPoint = typeof explicit.point === 'object' ? explicit.point : {};
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
    return {
      marks: resolveLineMarkGroup(
        { ...context.inherited.encodings, ...source.encodings },
        {
          ...inherited,
          ...explicit,
          path: {
            ...inherited.path,
            ...explicit.path,
            ...mergeGraphicStyle({ opacity: inherited.path?.opacity }, { opacity: explicit.path?.opacity }),
          },
          point,
        },
      ),
    };
  },
});
