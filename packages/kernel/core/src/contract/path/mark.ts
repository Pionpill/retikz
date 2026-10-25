import type { JsonObject } from '@retikz/foundation';

import type { PaintValue, ScenePrimitive } from '../scene';

/** 标记定义生成局部图元所需的宿主上下文 */
export type MarkEmitContext = {
  /** 宿主路径的有效描边 */
  stroke: PaintValue;
  /** 编译坐标精度取整 */
  round: (value: number) => number;
};

/** 可注册的沿路径标记定义 */
export type MarkDefinition = {
  /** 标记注册名称 */
  name: string;
  /** 生成以原点为放置锚点的局部基础图元 */
  emit: (params: JsonObject, context: MarkEmitContext) => Iterable<ScenePrimitive>;
};

/** 声明沿路径标记定义 */
export const defineMark = (definition: MarkDefinition): MarkDefinition => definition;
