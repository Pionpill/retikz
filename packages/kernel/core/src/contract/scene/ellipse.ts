import type {
  ScenePrimitiveBase,
  ScenePrimitiveFill,
  ScenePrimitiveStroke,
  ScenePrimitiveOpacity,
  ScenePrimitiveEffects,
} from './base';

/** 椭圆图元的中心、半轴与旋转 */
export type EllipsePrimitiveGeometry = {
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

/** 椭圆原语，圆形复用 rx=ry 的同一 Scene 分支 */
export type EllipsePrimitive = ScenePrimitiveBase &
  ScenePrimitiveFill &
  ScenePrimitiveStroke &
  ScenePrimitiveOpacity &
  ScenePrimitiveEffects &
  EllipsePrimitiveGeometry & {
    /** 标识椭圆场景图元 */
    type: 'ellipse';
  };
