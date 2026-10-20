import type {
  IRPlotAnnotationPosition,
  IRPlotAnnotationPositionValue,
  IRPlotIntervalAnnotation,
  IRPlotPathAnnotation,
  IRPlotPointAnnotation,
} from '@retikz/plot';
import { PathAnnotationSchema, IntervalAnnotationSchema } from '@retikz/plot';
import type { input as ZodInput } from 'zod';

/** 点标注的位置绑定输入，位置只能使用角色映射或 x/y 简写之一 */
export type InputPlotPointAnnotation = Omit<IRPlotPointAnnotation, 'type' | 'kind' | 'position'> &
  (
    | { position: IRPlotAnnotationPosition; x?: never; y?: never }
    | { position?: never; x: IRPlotAnnotationPositionValue; y: IRPlotAnnotationPositionValue }
  ) &
  AnnotationBindings;

/** 路径标注的位置绑定输入 */
export type InputPlotPathAnnotation = Omit<ZodInput<typeof PathAnnotationSchema>, 'type' | 'kind'> & AnnotationBindings;

/** 区间标注的位置绑定输入 */
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

/** 归一化位置常量绑定，字段与边界引用保持原样 */
const normalizeAnnotationPosition = (position: IRPlotAnnotationPosition): IRPlotAnnotationPosition =>
  Object.fromEntries(
    Object.entries(position).map(([role, value]) => [
      role,
      typeof value === 'object' && 'value' in value ? value.value : value,
    ]),
  );

/** 规范化显式点，字符串始终为常量 */
export const pointAnnotation = (input: InputPlotPointAnnotation): IRPlotPointAnnotation & AnnotationBindings => {
  const { x, y, position, ...rest } = input;
  return { ...rest, type: 'point', kind: 'annotation', position: normalizeAnnotationPosition(position ?? { x, y }) };
};

/** 规范化单条独立路径 */
export const pathAnnotation = (input: InputPlotPathAnnotation): IRPlotPathAnnotation & AnnotationBindings => ({
  ...input,
  from: normalizeAnnotationPosition(input.from),
  to: normalizeAnnotationPosition(input.to),
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
    bounds: Object.fromEntries(
      Object.entries(bounds ?? { x, y }).map(([role, bound]) => {
        const position = normalizeAnnotationPosition(bound);
        return [role, { from: position.from, to: position.to }];
      }),
    ),
  };
};
