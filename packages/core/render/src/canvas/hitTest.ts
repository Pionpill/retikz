import type { Scene } from '@retikz/core';

/** hitTest 命中点（Scene user units 坐标系） */
export type HitPoint = {
  /** Scene user units 横坐标 */
  x: number;
  /** Scene user units 纵坐标 */
  y: number;
};

/** hitTest 选项 */
export type HitTestOptions = {
  /**
   * 描边命中容差（user units）
   * @description fill='none' / 透明填充的图元只有描边线可命中；判定时按 strokeTolerance 加宽描边宽度。
   *   缺省按图元自身 strokeWidth/2。
   */
  strokeTolerance?: number;
  /**
   * hitTest 复用的 2D context（路径构建 + isPointInPath / isPointInStroke）
   * @description 即时模式无逐图元 DOM，命中靠把每个图元的几何重建进一个 2D context 后调原生点测。
   *   生产环境由挂载方（vanilla mountCanvas / react CanvasHost）传入已有 `<canvas>` 的 context；
   *   缺省时实现自建离屏 context（无 canvas 环境则无法点测）。
   */
  context2d?: CanvasRenderingContext2D;
};

/**
 * Canvas 命中测试：把 Scene 坐标点定位到最上层 id-bearing 图元
 * @description 逆 z-order（后画的在上）重走 Scene，复用 drawScene 几何 + 原生 isPointInPath（填充区）/
 *   isPointInStroke（描边线，按 strokeTolerance 加宽）判定；命中即返回该图元或其最近 id-bearing 祖先（group）
 *   的 id，空白处返回 null。函数不进 IR、纯 runtime 定位层。
 *
 * 当前为 stub（占位 return null）；几何遍历逻辑由后续实现补齐。
 */
export const hitTest = (
  scene: Scene,
  point: HitPoint,
  options?: HitTestOptions,
): string | null => {
  void scene;
  void point;
  void options;
  return null;
};
