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

/**
 * 颜色归一器工厂：用 scratch 2D context 把任意 CSS 颜色经 `fillStyle` 往返规范成可解析串（渐变 stop 烘焙 alpha 用）
 * @description 浏览器/napi 把 `fillStyle` 规范化后读回即得可解析串；非法色保留原值不变，用黑/白双哨兵探测、
 *   不一致则退回原串。`makeScratchCtx` 懒建一次复用（浏览器端 `document.createElement('canvas')`、
 *   node 端 `createCanvas(1,1)`）；返回 null（无 canvas 环境）时原样返回颜色。差异仅在 ctx 来源，故注入而非各写一份。
 */
export const createCssColorNormalizer = (
  makeScratchCtx: () => CanvasRenderingContext2D | null,
): ((color: string) => string) => {
  let scratch: CanvasRenderingContext2D | null | undefined;
  return (color: string): string => {
    if (scratch === undefined) scratch = makeScratchCtx();
    if (!scratch) return color;
    scratch.fillStyle = '#000';
    scratch.fillStyle = color;
    const onBlack = scratch.fillStyle;
    scratch.fillStyle = '#fff';
    scratch.fillStyle = color;
    const onWhite = scratch.fillStyle;
    return onBlack === onWhite && typeof onBlack === 'string' ? onBlack : color;
  };
};
