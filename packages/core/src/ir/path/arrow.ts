import type { ValueOf } from '../../types';

/**
 * 箭头形状常量。值就是 IR / Scene 中 arrow 字段的字面字符串；
 * 用 const 而不是 TS enum——避免 enum 在数值场景生成 reverse-mapping、
 * 在 string 场景与字面量类型不互通的两个坑。
 *
 * - `normal`：实心三角（默认；最常见）
 * - `open`：空心三角（UML 泛化 / 继承）
 * - `stealth`：尖锐倒钩三角（流图常见、视觉锐利）
 * - `diamond`：实心菱形（UML 组合）
 * - `openDiamond`：空心菱形（UML 聚合）
 * - `circle`：实心圆点（连接点 / dot end）
 * - `openCircle`：空心圆点（白圈 / o-end）
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

/** 箭头形状字面量类型，由 `ARROW_SHAPES` 派生 */
export type ArrowShape = ValueOf<typeof ARROW_SHAPES>;
