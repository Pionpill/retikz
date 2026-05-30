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

/** 将 Scene 渲染到 HTMLCanvasElement */
export const renderToCanvas = (
  canvas: HTMLCanvasElement,
  scene: Scene,
  options: RenderOptions = {},
): void => {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('renderToCanvas: unable to acquire 2d canvas context.');

  const devicePixelRatio = getDevicePixelRatio(options);
  assertPositiveFinite('canvas.width', canvas.width);
  assertPositiveFinite('canvas.height', canvas.height);
  assertPositiveFinite('scene.layout.width', scene.layout.width);
  assertPositiveFinite('scene.layout.height', scene.layout.height);

  const clear = options.clear ?? true;
  if (clear) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  const scaleX = canvas.width / devicePixelRatio / scene.layout.width;
  const scaleY = canvas.height / devicePixelRatio / scene.layout.height;
  ctx.setTransform(
    devicePixelRatio * scaleX,
    0,
    0,
    devicePixelRatio * scaleY,
    -scene.layout.x * devicePixelRatio * scaleX,
    -scene.layout.y * devicePixelRatio * scaleY,
  );
  drawScene(ctx, scene, options);
};
