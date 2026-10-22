import type { TextMeasurer } from '@retikz/core';
import { fallbackMeasurer } from '@retikz/core';

/** 部分浏览器只提供字宽，不提供实际字形上下边界 */
type BrowserTextMetrics = Pick<TextMetrics, 'width'> &
  Partial<Pick<TextMetrics, 'actualBoundingBoxAscent' | 'actualBoundingBoxDescent'>>;

/** 为一次处理准备建立惰性测量器，只在环境能力获取失败时估算 */
export const createDefaultTextMeasurer = (): TextMeasurer => {
  let context: CanvasRenderingContext2D | null | undefined;
  return (text, font) => {
    if (context === undefined) {
      try {
        context = typeof document === 'undefined' ? null : document.createElement('canvas').getContext('2d');
      } catch {
        context = null;
      }
    }
    if (context === null) return fallbackMeasurer(text, font);

    const body = document.querySelector('body');
    const family =
      font.family ??
      (typeof getComputedStyle === 'undefined' || body === null
        ? undefined
        : getComputedStyle(body).fontFamily.trim() || undefined) ??
      'sans-serif';
    context.font = `${font.style ?? 'normal'} ${font.weight ?? 'normal'} ${font.size}px ${family}`;
    const metrics: BrowserTextMetrics = context.measureText(text);
    const ascent = Math.max(0, metrics.actualBoundingBoxAscent ?? font.size * 0.8);
    const descent = Math.max(0, metrics.actualBoundingBoxDescent ?? font.size * 0.2);
    return { width: metrics.width, height: ascent + descent || font.size * 1.2, ascent, descent };
  };
};

/** 统一显式测量器与默认测量器的宿主字体输入，不改变调用方字体对象 */
export const createTextMeasurer = (
  measureText: TextMeasurer | undefined,
  defaultFontFamily: string | undefined,
): TextMeasurer => {
  const measurer = measureText ?? createDefaultTextMeasurer();
  const family = defaultFontFamily?.trim();
  if (!family) return measurer;
  return (text, font) => measurer(text, font.family?.trim() ? font : { ...font, family });
};
