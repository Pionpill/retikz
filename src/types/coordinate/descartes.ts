/** 笛卡尔象限 */
export enum Quadrant {
  TR = 'top_right', // 第一象限
  TL = 'top_left', // 第二象限
  BL = 'bottom_left', // 第三象限
  BR = 'bottom_right', // 第四象限
}

/** 笛卡尔坐标轴 */
export enum Axis {
  X_POS = 'x-positive', // 正x轴
  Y_POS = 'y-positive', // 正y轴
  X_NEG = 'x-negative', // 负x轴
  Y_NEG = 'y-negative', // 负y轴
}

/** 笛卡尔坐标系位置 */
export type DescartesLocation = Quadrant | Axis | 'center';

/** 笛卡尔坐标（对象形式） */
export type DescartesPosition = { x: number; y: number };