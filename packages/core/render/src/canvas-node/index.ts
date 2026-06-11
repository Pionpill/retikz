import type { Buffer } from 'node:buffer';
import type { Scene } from '@retikz/core';
import { drawScene } from '../canvas/drawScene';
import { createCssColorNormalizer, sceneFitMatrix } from '../canvas/shared';
import type { DrawOptions } from '../canvas/types';

export type CanvasNodeImageFormat = 'png' | 'jpeg' | 'webp';

export type RenderSceneToImageOptions = DrawOptions & {
  width: number;
  height: number;
  devicePixelRatio?: number;
  format?: CanvasNodeImageFormat;
  quality?: number;
  background?: string;
};

type NapiCanvas = {
  width: number;
  height: number;
  getContext: (contextId: '2d') => CanvasRenderingContext2D | null;
  encode?: (format: CanvasNodeImageFormat, quality?: number) => Promise<Buffer> | Buffer;
  toBuffer?: (mimeType: string, quality?: number) => Buffer;
};

type NapiCanvasModule = {
  createCanvas: (width: number, height: number) => NapiCanvas;
};

const MIME_BY_FORMAT: Record<CanvasNodeImageFormat, string> = {
  png: 'image/png',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
};

const assertPositiveFinite = (name: string, value: number): void => {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`renderSceneToImage: ${name} must be a positive finite number.`);
  }
};

const getDevicePixelRatio = (options: RenderSceneToImageOptions): number => {
  if (options.devicePixelRatio !== undefined) {
    return Number.isFinite(options.devicePixelRatio) && options.devicePixelRatio > 0 ? options.devicePixelRatio : 1;
  }
  return 1;
};

const assertSceneLayout = (scene: Scene): void => {
  if (!Number.isFinite(scene.layout.x)) throw new Error('renderSceneToImage: scene.layout.x must be a finite number.');
  if (!Number.isFinite(scene.layout.y)) throw new Error('renderSceneToImage: scene.layout.y must be a finite number.');
  assertPositiveFinite('scene.layout.width', scene.layout.width);
  assertPositiveFinite('scene.layout.height', scene.layout.height);
};

const loadCanvas = async (): Promise<NapiCanvasModule> => {
  try {
    const packageName = '@napi-rs/canvas';
    return (await import(packageName)) as NapiCanvasModule;
  } catch (error) {
    throw new Error(
      'renderSceneToImage: install optional peer dependency @napi-rs/canvas to use @retikz/render/canvas-node.',
      { cause: error },
    );
  }
};

const createOffscreenFactory =
  (createCanvas: NapiCanvasModule['createCanvas']) =>
  (width: number, height: number): CanvasRenderingContext2D | null => {
    const canvas = createCanvas(Math.max(1, Math.ceil(width)), Math.max(1, Math.ceil(height)));
    return canvas.getContext('2d');
  };

const encodeCanvas = async (
  canvas: NapiCanvas,
  format: CanvasNodeImageFormat,
  quality: number | undefined,
): Promise<Buffer> => {
  if (typeof canvas.encode === 'function') {
    return await canvas.encode(format, quality);
  }
  if (typeof canvas.toBuffer === 'function') {
    return canvas.toBuffer(MIME_BY_FORMAT[format], quality);
  }
  throw new Error('renderSceneToImage: @napi-rs/canvas canvas does not expose encode() or toBuffer().');
};

export const renderSceneToImage = async (scene: Scene, options: RenderSceneToImageOptions): Promise<Buffer> => {
  assertPositiveFinite('width', options.width);
  assertPositiveFinite('height', options.height);
  assertSceneLayout(scene);
  const devicePixelRatio = getDevicePixelRatio(options);
  const format = options.format ?? 'png';
  const canvasApi = await loadCanvas();
  const bitmapWidth = Math.max(1, Math.ceil(options.width * devicePixelRatio));
  const bitmapHeight = Math.max(1, Math.ceil(options.height * devicePixelRatio));
  const canvas = canvasApi.createCanvas(bitmapWidth, bitmapHeight);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('renderSceneToImage: unable to acquire 2d canvas context.');

  if (options.background !== undefined) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = options.background;
    ctx.fillRect(0, 0, bitmapWidth, bitmapHeight);
  }
  ctx.setTransform(...sceneFitMatrix(scene.layout, options.width, options.height, devicePixelRatio));
  drawScene(ctx, scene, {
    ...options,
    defaultFontFamily: options.defaultFontFamily ?? 'sans-serif',
    currentColor: options.currentColor ?? '#000000',
    createOffscreen: options.createOffscreen ?? createOffscreenFactory(canvasApi.createCanvas),
    resolveCssColor: options.resolveCssColor ?? createCssColorNormalizer(() => canvasApi.createCanvas(1, 1).getContext('2d')),
  });

  return encodeCanvas(canvas, format, options.quality);
};
