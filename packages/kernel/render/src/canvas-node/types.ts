import type { DrawOptions } from '../canvas';

/** Node Canvas 支持的图片编码格式 */
export type CanvasNodeImageFormat = 'png' | 'jpeg' | 'webp';

/** 将 Scene 渲染为 Node 图片缓冲区时使用的选项 */
export type RenderSceneToImageOptions = DrawOptions & {
  /** 输出图片的 CSS 像素宽度，必须是正有限数 */
  width: number;
  /** 输出图片的 CSS 像素高度，必须是正有限数 */
  height: number;
  /** 位图像素与 CSS 像素的缩放比。无效值回退为 1。 @default 1 */
  devicePixelRatio?: number;
  /** 输出图片的编码格式。 @default 'png' */
  format?: CanvasNodeImageFormat;
  /** JPEG / WebP 编码质量；具体取值语义由 `@napi-rs/canvas` 决定 */
  quality?: number;
  /** 绘制 Scene 前填充整张位图的背景色；省略时保持透明 */
  background?: string;
};
