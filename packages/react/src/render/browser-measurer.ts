import type { TextMeasurer } from '@retikz/core';
import { fallbackMeasurer } from '@retikz/core';

let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;

/** 懒加载模块级 canvas 2d context；SSR 环境（无 document）下返回 null，由 measurer 走 fallback */
const getCtx = (): CanvasRenderingContext2D | null => {
  if (typeof document === 'undefined') return null;
  if (!canvas) {
    canvas = document.createElement('canvas');
    ctx = canvas.getContext('2d');
  }
  return ctx;
};

/**
 * 浏览器端 text measurer：基于 canvas measureText。
 * 在 SSR 路径下走不到这里，会自动降级 fallback。
 */
export const browserMeasurer: TextMeasurer = (text, font) => {
  const c = getCtx();
  if (!c) return fallbackMeasurer(text, font);
  const family = font.family ?? 'sans-serif';
  const weight = font.weight ?? 'normal';
  const style = font.style ?? 'normal';
  c.font = `${style} ${weight} ${font.size}px ${family}`;
  const m = c.measureText(text);
  const ascent = m.actualBoundingBoxAscent ?? font.size * 0.8;
  const descent = m.actualBoundingBoxDescent ?? font.size * 0.2;
  return {
    width: m.width,
    height: ascent + descent || font.size * 1.2,
    ascent,
    descent,
  };
};
