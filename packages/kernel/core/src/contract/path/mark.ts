import type { JsonObject } from '@retikz/foundation';

import type { IRMarkStyle, IRPosition } from '../../schemas';
import type { PaintValue, ScenePrimitive } from '../scene';

/** 标记图元生成上下文 */
export type MarkEmitContext = {
  /** 自定义形状参数 */
  params: JsonObject;
  /** 已解析的描边 */
  stroke: PaintValue;
  /** 已解析的填充 */
  fill: PaintValue;
  /** 局部轮廓线宽 */
  lineWidth: number;
  /** 虚线节奏 */
  dashPattern?: IRMarkStyle['dashPattern'];
  /** 虚线偏移 */
  dashOffset?: number;
  /** 描边端帽 */
  lineCap?: IRMarkStyle['lineCap'];
  /** 描边连接 */
  lineJoin?: IRMarkStyle['lineJoin'];
  /** 坐标取整函数 */
  round: (value: number) => number;
};

/** 可注册的标记形状定义 */
export type MarkDefinition = {
  /** 注册名称 */
  name: string;
  /**
   * 局部基准正方形边长
   * @default 10
   */
  baseSize?: number;
  /**
   * 局部放置锚点，省略时使用基准正方形中心
   * @default resolveMarkStyle
   */
  anchor?: IRPosition;
  /**
   * 是否通过描边表达空心轮廓
   * @default false
   */
  hollow?: boolean;
  /**
   * 实例未指定长度时使用的默认长度
   * @default ARROW_MARKER_DEFAULT_SIZE
   */
  defaultLength?: number;
  /**
   * 实例未指定宽度时使用的默认宽度
   * @default ARROW_MARKER_DEFAULT_SIZE
   */
  defaultWidth?: number;
  /** 根据已解析的样式和参数生成局部基础图元 */
  emit: (context: MarkEmitContext) => Iterable<ScenePrimitive>;
};

/** 声明标记形状定义 */
export const defineMark = (definition: MarkDefinition): MarkDefinition => definition;
