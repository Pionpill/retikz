import type {
  IRPlotAnnotationPosition,
  IRPlotAnnotationPositionValue,
  IRPlotIntervalAnnotation,
  IRPlotPathAnnotation,
  IRPlotPointAnnotation,
} from '@retikz/plot';
import { PathAnnotationSchema, IntervalAnnotationSchema } from '@retikz/plot';
import type { input as ZodInput } from 'zod';

/** 点标注的常量输入，位置只能使用角色映射或 x/y 简写之一 */
export type InputPlotPointAnnotation = Omit<IRPlotPointAnnotation, 'type' | 'kind' | 'position'> &
  (
    | { position: IRPlotAnnotationPosition; x?: never; y?: never }
    | { position?: never; x: IRPlotAnnotationPositionValue; y: IRPlotAnnotationPositionValue }
  ) &
  AnnotationBindings;

/** 路径标注的常量输入 */
export type InputPlotPathAnnotation = Omit<ZodInput<typeof PathAnnotationSchema>, 'type' | 'kind'> & AnnotationBindings;

/** 区间标注的常量输入 */
export type InputPlotIntervalAnnotation = Omit<ZodInput<typeof IntervalAnnotationSchema>, 'type' | 'kind' | 'bounds'> &
  (
    | { bounds: IRPlotIntervalAnnotation['bounds']; x?: never; y?: never }
    | { bounds?: never; x: IRPlotIntervalAnnotation['bounds'][string]; y: IRPlotIntervalAnnotation['bounds'][string] }
  ) &
  AnnotationBindings;

/** 标注的作者视图绑定，沿用 Plot 的组合规则 */
type AnnotationBindings = {
  /** 分面声明标识 */
  facetId?: string;
  /** 轨道声明标识 */
  trackId?: string;
};

/** 规范化单个独立点，字符串始终为常量 */
export const pointAnnotation = (input: InputPlotPointAnnotation): IRPlotPointAnnotation & AnnotationBindings => {
  const { x, y, position, ...rest } = input;
  return { ...rest, type: 'point', kind: 'annotation', position: position ?? { x, y } };
};

/** 规范化单条独立路径 */
export const pathAnnotation = (input: InputPlotPathAnnotation): IRPlotPathAnnotation & AnnotationBindings => ({
  ...input,
  type: 'path',
  kind: 'annotation',
  connection: PathAnnotationSchema.shape.connection.parse(input.connection),
});

/** 规范化单个独立区间 */
export const intervalAnnotation = (
  input: InputPlotIntervalAnnotation,
): IRPlotIntervalAnnotation & AnnotationBindings => {
  const { x, y, bounds, ...rest } = input;
  return {
    ...rest,
    type: 'interval',
    kind: 'annotation',
    connection: IntervalAnnotationSchema.shape.connection.parse(input.connection),
    bounds: bounds ?? { x, y },
  };
};
