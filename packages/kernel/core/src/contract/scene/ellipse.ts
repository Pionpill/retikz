import type {
  ScenePrimitiveBase,
  ScenePrimitiveFill,
  ScenePrimitiveStroke,
  ScenePrimitiveOpacity,
  ScenePrimitiveEffects,
} from './base';

/** 椭圆原语，圆形复用 rx=ry 的同一 Scene 分支 */
export type EllipsePrimitive = ScenePrimitiveBase &
  ScenePrimitiveFill &
  ScenePrimitiveStroke &
  ScenePrimitiveOpacity &
  ScenePrimitiveEffects & {
    /** 标识椭圆场景图元 */
    type: 'ellipse';
    /** 椭圆中心的局部 x 坐标 */
    cx: number;
    /** 椭圆中心的局部 y 坐标 */
    cy: number;
    /** 椭圆水平半轴长度 */
    rx: number;
    /** 椭圆垂直半轴长度 */
    ry: number;
    /**
     * 绕中心旋转度数
     * @default 0
     */
    rotate?: number;
  };
