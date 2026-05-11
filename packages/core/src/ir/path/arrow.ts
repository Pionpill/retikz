import type { ValueOf } from '../../types';

/**
 * 箭头形状常量（用 const 而非 TS enum 避免 reverse-mapping 和字面量不互通）
 * @description normal 实心三角（默认）；open 空心三角（UML 泛化/继承）；stealth 尖锐倒钩；diamond 实心菱形（UML 组合）；openDiamond 空心菱形（聚合）；circle 实心圆点；openCircle 空心圆点
 */
export const ARROW_SHAPES = {
  normal: 'normal',
  open: 'open',
  stealth: 'stealth',
  diamond: 'diamond',
  openDiamond: 'openDiamond',
  circle: 'circle',
  openCircle: 'openCircle',
} as const;

/** 箭头形状字面量类型 */
export type ArrowShape = ValueOf<typeof ARROW_SHAPES>;
