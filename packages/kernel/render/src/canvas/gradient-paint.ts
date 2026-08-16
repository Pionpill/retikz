import type { IRPaint } from '@retikz/core';

import { DEFAULT_EPSILON } from '@retikz/math';

import { gradientLineFromAngle } from '../shared';

/** Canvas objectBoundingBox gradient 使用的局部几何 bbox */
export type GradientBBox = {
  /** 左上角 x 坐标 */
  x: number;
  /** 左上角 y 坐标 */
  y: number;
  /** 几何宽度 */
  w: number;
  /** 几何高度 */
  h: number;
};

/** Canvas 支持的 gradient paint */
export type GradientPaint = Extract<IRPaint, { kind: 'linearGradient' | 'radialGradient' | 'conicGradient' }>;

type GradientCommonInput = {
  /** 目标 Canvas context */
  ctx: CanvasRenderingContext2D;
  /** 渐变定义 */
  spec: GradientPaint;
  /** 渐变映射的局部几何 bbox */
  bbox: GradientBBox;
  /** 解析 stop 的 currentColor 与 opacity */
  resolveStopColor: (color: string, opacity: number | undefined) => string;
  /** 上报 paint 降级 */
  warn: (message: string) => void;
};

/** 已构建 current path 上执行 gradient fill 的输入 */
export type GradientFillInput = GradientCommonInput & {
  /** 本次填充透明度 */
  fillOpacity: number | undefined;
  /** 执行一次 current path fill */
  drawFill: () => void;
};

/** gradient stroke style 构建输入 */
export type GradientStrokeInput = GradientCommonInput & {
  /** 创建离屏 Canvas context 的宿主工厂 */
  createOffscreen: ((width: number, height: number) => CanvasRenderingContext2D | null) | undefined;
  /** 描边相对几何 bbox 的最大外扩 */
  outset: number;
  /** 单次 drawScene 内复用纹理 pattern 的缓存 */
  cache: Map<string, CanvasPattern>;
  /** paint resource 的稳定缓存前缀 */
  cacheKey: string;
};

const MAX_TEXTURE_EDGE = 2048;
const MAX_TEXTURE_PIXELS = 1_048_576;
const GUTTER_PIXELS = 2;

const validBBox = (bbox: GradientBBox): boolean =>
  Number.isFinite(bbox.x) &&
  Number.isFinite(bbox.y) &&
  Number.isFinite(bbox.w) &&
  Number.isFinite(bbox.h) &&
  bbox.w > 0 &&
  bbox.h > 0;

const warnInvalidBBox = (warn: (message: string) => void): void => {
  warn('Canvas renderer received a degenerate objectBoundingBox gradient; paint is skipped.');
};

const addStops = (
  gradient: CanvasGradient,
  spec: GradientPaint,
  resolveStopColor: GradientCommonInput['resolveStopColor'],
): CanvasGradient => {
  for (const stop of spec.stops) gradient.addColorStop(stop.offset, resolveStopColor(stop.color, stop.opacity));
  return gradient;
};

/** 在当前 context 的单位方框坐标中创建 gradient */
const buildUnitGradient = (
  ctx: CanvasRenderingContext2D,
  spec: GradientPaint,
  resolveStopColor: GradientCommonInput['resolveStopColor'],
  warn: GradientCommonInput['warn'],
): CanvasGradient | undefined => {
  let gradient: CanvasGradient;
  if (spec.kind === 'linearGradient') {
    const line = gradientLineFromAngle(spec.angle);
    gradient = ctx.createLinearGradient(line.x1, line.y1, line.x2, line.y2);
  } else if (spec.kind === 'radialGradient') {
    const [cx, cy] = spec.center ?? [0.5, 0.5];
    gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, spec.radius ?? 0.5);
  } else {
    const createConicGradient = (
      ctx as { createConicGradient?: (startAngle: number, x: number, y: number) => CanvasGradient }
    ).createConicGradient;
    if (typeof createConicGradient !== 'function') {
      warn('Canvas renderer does not support conicGradient paint on this host; paint is skipped.');
      return undefined;
    }
    const [cx, cy] = spec.center ?? [0.5, 0.5];
    gradient = createConicGradient.call(ctx, ((spec.angle ?? 0) * Math.PI) / 180, cx, cy);
  }
  return addStops(gradient, spec, resolveStopColor);
};

/** 在 user-space bbox 中创建无需纹理的原生 gradient */
const buildNativeGradient = (
  ctx: CanvasRenderingContext2D,
  spec: GradientPaint,
  bbox: GradientBBox,
  resolveStopColor: GradientCommonInput['resolveStopColor'],
  warn: GradientCommonInput['warn'],
): CanvasGradient | undefined => {
  let gradient: CanvasGradient;
  if (spec.kind === 'linearGradient') {
    const line = gradientLineFromAngle(spec.angle);
    gradient = ctx.createLinearGradient(
      bbox.x + line.x1 * bbox.w,
      bbox.y + line.y1 * bbox.h,
      bbox.x + line.x2 * bbox.w,
      bbox.y + line.y2 * bbox.h,
    );
  } else if (spec.kind === 'radialGradient') {
    const [cx, cy] = spec.center ?? [0.5, 0.5];
    const x = bbox.x + cx * bbox.w;
    const y = bbox.y + cy * bbox.h;
    gradient = ctx.createRadialGradient(x, y, 0, x, y, (spec.radius ?? 0.5) * Math.max(bbox.w, bbox.h));
  } else {
    const createConicGradient = (
      ctx as { createConicGradient?: (startAngle: number, x: number, y: number) => CanvasGradient }
    ).createConicGradient;
    if (typeof createConicGradient !== 'function') {
      warn('Canvas renderer does not support conicGradient paint on this host; paint is skipped.');
      return undefined;
    }
    const [cx, cy] = spec.center ?? [0.5, 0.5];
    gradient = createConicGradient.call(
      ctx,
      ((spec.angle ?? 0) * Math.PI) / 180,
      bbox.x + cx * bbox.w,
      bbox.y + cy * bbox.h,
    );
  }
  return addStops(gradient, spec, resolveStopColor);
};

/** 在已构建的 current path 上按 objectBoundingBox 语义执行一次 gradient fill */
export const fillObjectGradient = (input: GradientFillInput): void => {
  const { ctx, spec, bbox, fillOpacity, drawFill, resolveStopColor, warn } = input;
  if (!validBBox(bbox)) {
    warnInvalidBBox(warn);
    return;
  }
  ctx.save();
  ctx.transform(bbox.w, 0, 0, bbox.h, bbox.x, bbox.y);
  const gradient = buildUnitGradient(ctx, spec, resolveStopColor, warn);
  if (gradient !== undefined) {
    if (fillOpacity !== undefined) ctx.globalAlpha *= fillOpacity;
    ctx.fillStyle = gradient;
    drawFill();
  }
  ctx.restore();
};

const normalizedAngle = (angle: number | undefined): number => {
  const value = (angle ?? 0) % 360;
  return value < 0 ? value + 360 : value;
};

const requiresTexture = (spec: GradientPaint, bbox: GradientBBox): boolean => {
  const bboxScale = Math.max(Math.abs(bbox.w), Math.abs(bbox.h));
  if (Math.abs(bbox.w - bbox.h) <= 1e-7 * bboxScale) return false;
  if (spec.kind !== 'linearGradient') return true;
  const angle = normalizedAngle(spec.angle);
  return ![0, 90, 180, 270, 360].some(axis => Math.abs(angle - axis) <= 1e-7);
};

const textureSize = (width: number, height: number): { width: number; height: number } | undefined => {
  const factor = Math.min(
    1,
    MAX_TEXTURE_EDGE / width,
    MAX_TEXTURE_EDGE / height,
    Math.sqrt(MAX_TEXTURE_PIXELS / (width * height)),
  );
  const resolvedWidth = Math.floor(width * factor);
  const resolvedHeight = Math.floor(height * factor);
  return resolvedWidth >= 2 && resolvedHeight >= 2 ? { width: resolvedWidth, height: resolvedHeight } : undefined;
};

/** 构建保持 objectBoundingBox 映射且不缩放描边几何的 Canvas stroke style */
export const buildGradientStrokeStyle = (input: GradientStrokeInput): CanvasGradient | CanvasPattern | undefined => {
  const { ctx, spec, bbox, resolveStopColor, warn } = input;
  if (!validBBox(bbox)) {
    warnInvalidBBox(warn);
    return undefined;
  }
  if (!requiresTexture(spec, bbox)) return buildNativeGradient(ctx, spec, bbox, resolveStopColor, warn);

  const getTransform = (ctx as { getTransform?: () => DOMMatrix }).getTransform;
  const transform = typeof getTransform === 'function' ? getTransform.call(ctx) : undefined;
  const deviceScaleX = transform ? Math.hypot(transform.a, transform.b) : 1;
  const deviceScaleY = transform ? Math.hypot(transform.c, transform.d) : 1;
  if (!Number.isFinite(deviceScaleX) || !Number.isFinite(deviceScaleY)) {
    warn('Canvas renderer received a non-finite transform while building gradient stroke paint; paint is skipped.');
    return undefined;
  }
  if (deviceScaleX <= DEFAULT_EPSILON || deviceScaleY <= DEFAULT_EPSILON) return undefined;

  const outset = Math.max(0, Number.isFinite(input.outset) ? input.outset : 0);
  const coverageX = outset + GUTTER_PIXELS / deviceScaleX;
  const coverageY = outset + GUTTER_PIXELS / deviceScaleY;
  const domainX = -coverageX / bbox.w;
  const domainY = -coverageY / bbox.h;
  const domainWidth = 1 - 2 * domainX;
  const domainHeight = 1 - 2 * domainY;
  const rawWidth = Math.max(2, Math.ceil(bbox.w * domainWidth * deviceScaleX));
  const rawHeight = Math.max(2, Math.ceil(bbox.h * domainHeight * deviceScaleY));
  const size = textureSize(rawWidth, rawHeight);
  if (size === undefined) {
    warn('Canvas renderer cannot allocate a stable objectBoundingBox gradient texture; native approximation is used.');
    return buildNativeGradient(ctx, spec, bbox, resolveStopColor, warn);
  }

  const resolvedStops = spec.stops.map(stop => resolveStopColor(stop.color, stop.opacity));
  const patternKey = JSON.stringify([
    input.cacheKey,
    spec,
    resolvedStops,
    bbox.x,
    bbox.y,
    bbox.w,
    bbox.h,
    outset,
    size.width,
    size.height,
    domainX,
    domainY,
    domainWidth,
    domainHeight,
  ]);
  const cached = input.cache.get(patternKey);
  if (cached !== undefined) return cached;

  const offscreen = input.createOffscreen?.(size.width, size.height) ?? null;
  if (offscreen === null) {
    warn(
      'Canvas renderer cannot preserve objectBoundingBox gradient mapping without an offscreen context; native approximation is used.',
    );
    return buildNativeGradient(ctx, spec, bbox, resolveStopColor, warn);
  }

  offscreen.save();
  offscreen.setTransform(
    size.width / domainWidth,
    0,
    0,
    size.height / domainHeight,
    (-domainX * size.width) / domainWidth,
    (-domainY * size.height) / domainHeight,
  );
  const gradient = buildUnitGradient(offscreen, spec, resolveStopColor, warn);
  if (gradient === undefined) {
    offscreen.restore();
    return buildNativeGradient(ctx, spec, bbox, resolveStopColor, warn);
  }
  offscreen.fillStyle = gradient;
  offscreen.fillRect(domainX, domainY, domainWidth, domainHeight);
  offscreen.restore();

  const pattern = ctx.createPattern(offscreen.canvas, 'no-repeat');
  if (pattern === null) return undefined;
  pattern.setTransform({
    a: (bbox.w * domainWidth) / size.width,
    b: 0,
    c: 0,
    d: (bbox.h * domainHeight) / size.height,
    e: bbox.x + domainX * bbox.w,
    f: bbox.y + domainY * bbox.h,
  });
  input.cache.set(patternKey, pattern);
  return pattern;
};
