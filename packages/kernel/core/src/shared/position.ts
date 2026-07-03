import type { Position } from '@retikz/math';

/**
 * 极坐标点：相对 origin 的角度 + 半径偏移。
 * @description IR 保留 polar 形态，Scene 编译时统一解析为笛卡尔；origin 可嵌套节点 id、坐标或极坐标。
 */
export type SharedPolarPosition = {
  /**
   * 极坐标原点：节点 id / 笛卡尔坐标 / 嵌套极坐标；省略表示 [0,0]。
   * @default [0, 0]
   */
  origin?: string | Position | SharedPolarPosition;
  /** 角度（度数）：从 +x 轴量起，90 度朝 +y（屏幕下方）。 */
  angle: number;
  /** 半径。 */
  radius: number;
};
