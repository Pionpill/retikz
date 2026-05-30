import type { Scene } from '@retikz/core';
import { drawScene } from './drawScene';
import type { RenderOptions } from './types';

const getDevicePixelRatio = (options: RenderOptions): number => {
  if (options.devicePixelRatio !== undefined) {
    return Number.isFinite(options.devicePixelRatio) && options.devicePixelRatio > 0 ? options.devicePixelRatio : 1;
  }
  const ratio = globalThis.devicePixelRatio;
  return typeof ratio === 'number' && Number.isFinite(ratio) && ratio > 0 ? ratio : 1;
};

const assertPositiveFinite = (name: string, value: number): void => {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`renderToCanvas: ${name} must be a positive finite number.`);
  }
};

const getCanvasDefaultFontFamily = (canvas: HTMLCanvasElement): string | undefined => {
  if (typeof getComputedStyle === 'undefined') return undefined;
  if (typeof Element === 'undefined' || !(canvas instanceof Element)) return undefined;
  const fontFamily = getComputedStyle(canvas).fontFamily.trim();
  return fontFamily.length > 0 ? fontFamily : undefined;
};

/** 读取 canvas 元素的计算 CSS `color`，用于解析 Scene 里的 `currentColor`（主题反应 / 暗色模式） */
const getCanvasCurrentColor = (canvas: HTMLCanvasElement): string | undefined => {
  if (typeof getComputedStyle === 'undefined') return undefined;
  if (typeof Element === 'undefined' || !(canvas instanceof Element)) return undefined;
  const color = getComputedStyle(canvas).color.trim();
  return color.length > 0 ? color : undefined;
};

const computeCanvasTransform = (
  canvas: HTMLCanvasElement,
  scene: Scene,
  devicePixelRatio: number,
): [number, number, number, number, number, number] => {
  const cssWidth = canvas.width / devicePixelRatio;
  const cssHeight = canvas.height / devicePixelRatio;
  const scale = Math.min(cssWidth / scene.layout.width, cssHeight / scene.layout.height);
  const offsetX = (cssWidth - scene.layout.width * scale) / 2;
  const offsetY = (cssHeight - scene.layout.height * scale) / 2;
  return [
    devicePixelRatio * scale,
    0,
    0,
    devicePixelRatio * scale,
    (offsetX - scene.layout.x * scale) * devicePixelRatio,
    (offsetY - scene.layout.y * scale) * devicePixelRatio,
  ];
};

/** 将 Scene 渲染到 HTMLCanvasElement */
export const renderToCanvas = (
  canvas: HTMLCanvasElement,
  scene: Scene,
  options: RenderOptions = {},
): void => {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('renderToCanvas: unable to acquire 2d canvas context.');

  const devicePixelRatio = getDevicePixelRatio(options);
  if (!Number.isFinite(scene.layout.x)) {
    throw new Error('renderToCanvas: scene.layout.x must be a finite number.');
  }
  if (!Number.isFinite(scene.layout.y)) {
    throw new Error('renderToCanvas: scene.layout.y must be a finite number.');
  }
  assertPositiveFinite('canvas.width', canvas.width);
  assertPositiveFinite('canvas.height', canvas.height);
  assertPositiveFinite('scene.layout.width', scene.layout.width);
  assertPositiveFinite('scene.layout.height', scene.layout.height);

  const clear = options.clear ?? true;
  if (clear) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  ctx.setTransform(...computeCanvasTransform(canvas, scene, devicePixelRatio));
  drawScene(ctx, scene, {
    ...options,
    defaultFontFamily: options.defaultFontFamily ?? getCanvasDefaultFontFamily(canvas),
    currentColor: options.currentColor ?? getCanvasCurrentColor(canvas),
  });
};
