/**
 * canvas 后端内部共享（`canvas/` 与 `canvas-node/` 共用）。
 * 准入：与 canvas 2D context / 位图渲染绑定、SVG 用不到的 helper；后端无关纯几何放 `render/src/shared/`。
 */
import type { Scene } from '@retikz/core';

/**
 * Scene → canvas setTransform 的 2×3 仿射矩阵：meet-fit 等比缩放 + letterbox 居中 + devicePixelRatio
 * @description scale 取宽高比中较小者（保证 scene 完整可见、四周留黑边）；offset 使 scaled scene 在 css 尺寸内居中；
 *   再整体乘 dpr 映射到位图像素。`cssWidth`/`cssHeight` 为 CSS 逻辑尺寸（浏览器端 = 位图尺寸/dpr，node 端 = 入参宽高）。
 */
export const sceneFitMatrix = (
  layout: Scene['layout'],
  cssWidth: number,
  cssHeight: number,
  devicePixelRatio: number,
): [number, number, number, number, number, number] => {
  const scale = Math.min(cssWidth / layout.width, cssHeight / layout.height);
  const offsetX = (cssWidth - layout.width * scale) / 2;
  const offsetY = (cssHeight - layout.height * scale) / 2;
  return [
    devicePixelRatio * scale,
    0,
    0,
    devicePixelRatio * scale,
    (offsetX - layout.x * scale) * devicePixelRatio,
    (offsetY - layout.y * scale) * devicePixelRatio,
  ];
};
