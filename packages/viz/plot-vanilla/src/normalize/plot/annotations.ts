import type { IRPlotPointAnnotation, IRPlotPathAnnotation, IRPlotIntervalAnnotation } from '@retikz/plot';
import { PathAnnotationPropertiesSchema, IntervalAnnotationPropertiesSchema } from '@retikz/plot';
import type { input as ZodInput } from 'zod';

import type { InputPlotCoordinateScope } from './input-marks';

export type InputPlotPointAnnotation = Omit<IRPlotPointAnnotation, 'type' | 'kind'> & InputPlotCoordinateScope;
export type InputPlotPathAnnotation = Omit<IRPlotPathAnnotation, 'type' | 'kind' | 'properties'> &
  InputPlotCoordinateScope & {
    /** 路径固定属性，连接方式省略时复用 schema 默认 */
    properties?: ZodInput<typeof PathAnnotationPropertiesSchema>;
  };
export type InputPlotIntervalAnnotation = Omit<IRPlotIntervalAnnotation, 'type' | 'kind' | 'properties'> &
  InputPlotCoordinateScope & {
    /** 区间固定属性，连接方式省略时复用 schema 默认 */
    properties?: ZodInput<typeof IntervalAnnotationPropertiesSchema>;
  };

/** 补齐点标注身份，不改变字段或变换链的存在性 */
export const pointAnnotation = (input: InputPlotPointAnnotation): IRPlotPointAnnotation & InputPlotCoordinateScope => ({
  ...input,
  type: 'point',
  kind: 'annotation',
});

/** 补齐路径标注身份 */
export const pathAnnotation = (input: InputPlotPathAnnotation): IRPlotPathAnnotation & InputPlotCoordinateScope => ({
  ...input,
  properties:
    input.properties === undefined
      ? undefined
      : {
          ...input.properties,
          connection: PathAnnotationPropertiesSchema.shape.connection.parse(input.properties.connection),
        },
  type: 'path',
  kind: 'annotation',
});

/** 补齐区间标注身份 */
export const intervalAnnotation = (
  input: InputPlotIntervalAnnotation,
): IRPlotIntervalAnnotation & InputPlotCoordinateScope => ({
  ...input,
  properties:
    input.properties === undefined
      ? undefined
      : {
          ...input.properties,
          connection: IntervalAnnotationPropertiesSchema.shape.connection.parse(input.properties.connection),
        },
  type: 'interval',
  kind: 'annotation',
});
