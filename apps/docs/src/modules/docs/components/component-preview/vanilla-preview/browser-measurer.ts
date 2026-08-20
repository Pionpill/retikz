import type { TextMeasurer } from '@retikz/core';

import { fallbackMeasurer } from '@retikz/core';

let canvas: HTMLCanvasElement | null = null;
let context: CanvasRenderingContext2D | null = null;

/** 旧浏览器可能缺少实际字形边界度量 */
type BrowserTextMetrics = Pick<TextMetrics, 'width'> &
  Partial<Pick<TextMetrics, 'actualBoundingBoxAscent' | 'actualBoundingBoxDescent'>>;

/** 懒加载浏览器 Canvas 度量上下文；无 DOM 时返回 null */
const getContext = (): CanvasRenderingContext2D | null => {
  if (typeof document === 'undefined') return null;
  if (canvas === null) {
    canvas = document.createElement('canvas');
    context = canvas.getContext('2d');
  }
  return context;
};

/** 读取文档页面默认字体族，保持 SVG 与 Canvas 的字体路径一致 */
const defaultFontFamily = (): string | undefined => {
  if (typeof document === 'undefined' || typeof getComputedStyle === 'undefined') return undefined;
  const family = getComputedStyle(document.body).fontFamily.trim();
  return family.length > 0 ? family : undefined;
};

/** ComponentPreview 使用的浏览器文字度量器；SSR 下自动回退 Core 估算器 */
export const browserMeasurer: TextMeasurer = (text, font) => {
  const currentContext = getContext();
  if (currentContext === null) return fallbackMeasurer(text, font);

  const family = font.family ?? defaultFontFamily() ?? 'sans-serif';
  const weight = font.weight ?? 'normal';
  const style = font.style ?? 'normal';
  currentContext.font = `${style} ${weight} ${font.size}px ${family}`;
  const metrics: BrowserTextMetrics = currentContext.measureText(text);
  const ascent = Math.max(0, metrics.actualBoundingBoxAscent ?? font.size * 0.8);
  const descent = Math.max(0, metrics.actualBoundingBoxDescent ?? font.size * 0.2);
  return {
    width: metrics.width,
    height: ascent + descent || font.size * 1.2,
    ascent,
    descent,
  };
};
