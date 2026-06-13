/**
 * render 后端无关共享纯函数（SVG 与 Canvas 共用）。
 * 准入：零 `CanvasRenderingContext2D`、零 SVG 依赖的纯几何/数学；canvas 专属共享放 `canvas/shared.ts`。
 */
export * from './color';
export * from './gradient';
export * from './path-command';
export * from './text';
