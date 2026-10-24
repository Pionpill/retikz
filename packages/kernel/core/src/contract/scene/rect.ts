import type { IRNode } from '../../schemas';
import type {
  ScenePrimitiveBase,
  ScenePrimitiveFill,
  ScenePrimitiveStroke,
  ScenePrimitiveOpacity,
  ScenePrimitiveEffects,
} from './base';

/** 矩形原语 */
export type RectPrimitive = ScenePrimitiveBase &
  ScenePrimitiveFill &
  ScenePrimitiveStroke &
  ScenePrimitiveOpacity &
  ScenePrimitiveEffects & {
    /** 类型判别符 */
    type: 'rect';
    /** 左上角横坐标 */
    x: number;
    /** 左上角纵坐标 */
    y: number;
    /** 矩形宽度 */
    width: number;
    /** 矩形高度 */
    height: number;
    /**
     * 圆角半径（同时作用于 rx/ry）
     * @default 0
     */
    cornerRadius?: IRNode['cornerRadius'];
  };
