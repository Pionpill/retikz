import type {
  BlendModeValue,
  IRDropShadow,
  IRPaintSpec,
  MarkerFill,
  MarkerPrimitive,
  PaintValue,
  PathCommand,
  ResolvedArrowEndSpec,
  ResolvedPatternTile,
  Scene,
  ScenePrimitive,
  SceneResource,
  TextPrim,
} from '@retikz/core';

import type { CanvasWarning, DrawOptions, UnsupportedCanvasFeature } from './types';

import {
  commandArcStart,
  commandEndpoint,
  commandEndTangent,
  commandStartTangent,
  firstLineDy,
  parseHexColor,
  pathBounds,
} from '../shared';
import { applyPrimAnimations } from './animate';
import { applySceneCamera } from './camera';
import { buildGradientStrokeStyle, fillObjectGradient } from './gradient-paint';
import { applyClip, applyTransform, buildPath, DEG_TO_RAD, roundedRectPath } from './path-geometry';

const warnUnsupported = (options: DrawOptions, feature: UnsupportedCanvasFeature, message: string): void => {
  const warning: CanvasWarning = { feature, message };
  if (options.warnUnsupported) {
    options.warnUnsupported(warning);
    return;
  }
  console.warn(`[retikz/canvas] ${message}`);
};

/**
 * 解析颜色串：`currentColor` → `DrawOptions.currentColor`（缺省保持原串）
 * @description canvas 不继承 CSS `color`，故主题色 `currentColor` 需显式解析；其余颜色原样返回。
 */
const resolveColor = (color: string | undefined, options: DrawOptions): string | undefined => {
  if (color === 'currentColor' && options.currentColor !== undefined) return options.currentColor;
  return color;
};

const withOpacity = (ctx: CanvasRenderingContext2D, opacity: number | undefined, draw: () => void): void => {
  if (opacity === undefined) {
    draw();
    return;
  }

  ctx.save();
  ctx.globalAlpha *= opacity;
  draw();
  ctx.restore();
};

const applyDash = (
  ctx: CanvasRenderingContext2D,
  dashPattern: Array<number> | undefined,
  dashOffset: number | undefined,
): void => {
  ctx.setLineDash(dashPattern ?? []);
  ctx.lineDashOffset = dashOffset ?? 0;
};

const applyStrokeStyle = (
  ctx: CanvasRenderingContext2D,
  strokeWidth: number | undefined,
  strokeOpacity: number | undefined,
  dashPattern: Array<number> | undefined,
  dashOffset: number | undefined,
): void => {
  if (strokeWidth !== undefined) ctx.lineWidth = strokeWidth;
  if (strokeOpacity !== undefined) ctx.globalAlpha *= strokeOpacity;
  applyDash(ctx, dashPattern, dashOffset);
};

/** 被填充图元的包围盒（user units）；gradient/image 的 objectBoundingBox(0..1) 据此映射为绝对坐标 */
type BBox = { x: number; y: number; w: number; h: number };

/** Scene 资源按 id 索引（fill resourceRef 查表） */
type ResourceMap = ReadonlyMap<string, SceneResource>;

type DrawState = {
  gradientPatterns: Map<string, CanvasPattern>;
};

/**
 * 把 hex / rgb(a) 颜色乘上 alpha 转成 rgba 串；无法正则解析则返回 undefined
 * @description 纯字符串解析（不依赖 ctx），命名色 / hsl 等返回 undefined 交由上层归一后重试。
 */
const bakeAlpha = (color: string, opacity: number): string | undefined => {
  const bytes = parseHexColor(color);
  if (bytes) {
    return `rgba(${bytes.r}, ${bytes.g}, ${bytes.b}, ${opacity})`;
  }
  const rgb = /^rgba?\(([^)]+)\)$/.exec(color);
  if (rgb) {
    const parts = rgb[1].split(',').map(s => s.trim());
    const a = parts.length > 3 ? parseFloat(parts[3]) : 1;
    return `rgba(${parts[0]}, ${parts[1]}, ${parts[2]}, ${a * opacity})`;
  }
  return undefined;
};

/** shadow color 缺省（半透明黑）；compile 通常已补，渲染端再兜一层 */
const DEFAULT_SHADOW_COLOR = 'rgba(0,0,0,0.5)';

type CanvasShadowStyle = { offsetX: number; offsetY: number; blur: number };

/**
 * 把 shadow 的 user-unit 口径映射到 Canvas shadow* 属性。
 * @description Canvas shadowOffset / shadowBlur 不会稳定跟随当前变换；这里显式读取 CTM，让预览缩放 / camera
 *   下的投影尺寸继续贴近 SVG 的 user-space filter 口径。无 getTransform 的宿主保持旧行为。
 */
const resolveCanvasShadowStyle = (ctx: CanvasRenderingContext2D, shadow: IRDropShadow): CanvasShadowStyle => {
  const offsetX = shadow.offsetX ?? 0;
  const offsetY = shadow.offsetY ?? 0;
  const blur = shadow.blur ?? 0;
  const getTransform = (ctx as { getTransform?: () => DOMMatrix | undefined }).getTransform;
  if (typeof getTransform !== 'function') {
    return { offsetX, offsetY, blur };
  }

  const transform = getTransform.call(ctx);
  if (transform === undefined) {
    return { offsetX, offsetY, blur };
  }

  const scaleX = Math.hypot(transform.a, transform.b);
  const scaleY = Math.hypot(transform.c, transform.d);
  const blurScale = Math.sqrt(scaleX * scaleY);
  const calibratedBlurScale = Number.isFinite(blurScale) && blurScale > 0 ? blurScale : 1;

  return {
    offsetX: transform.a * offsetX + transform.c * offsetY,
    offsetY: transform.b * offsetX + transform.d * offsetY,
    blur: blur * calibratedBlurScale,
  };
};

/**
 * 用已解析 IRDropShadow 包裹一段绘制：set `ctx.shadow*`、draw、restore
 * @description `blur` / offset 按当前 Canvas transform 校准到 shadow*；`opacity`（若给）经 bakeAlpha 相乘到 color 有效 alpha。
 *   无 shadow → 直接 draw（逐字不变）。
 */
const withShadow = (ctx: CanvasRenderingContext2D, shadow: IRDropShadow | undefined, draw: () => void): void => {
  if (shadow === undefined) {
    draw();
    return;
  }
  ctx.save();
  const canvasShadow = resolveCanvasShadowStyle(ctx, shadow);
  ctx.shadowOffsetX = canvasShadow.offsetX;
  ctx.shadowOffsetY = canvasShadow.offsetY;
  ctx.shadowBlur = canvasShadow.blur;
  const color = shadow.color ?? DEFAULT_SHADOW_COLOR;
  ctx.shadowColor = shadow.opacity !== undefined ? (bakeAlpha(color, shadow.opacity) ?? color) : color;
  draw();
  ctx.restore();
};

/**
 * 用 blendMode 包裹一段绘制：set `globalCompositeOperation`、draw、restore（回 `source-over`）
 * @description `normal` / 省略 → 直接 draw（逐字不变）；其余 W3C 分离模式名直接是 canvas GCO 值。
 */
const withBlend = (ctx: CanvasRenderingContext2D, blendMode: BlendModeValue | undefined, draw: () => void): void => {
  if (blendMode === undefined || blendMode === 'normal') {
    draw();
    return;
  }
  ctx.save();
  ctx.globalCompositeOperation = blendMode;
  draw();
  ctx.restore();
};

/**
 * 把 stop 的 opacity 烘焙进颜色（canvas addColorStop 无 stop-opacity）
 * @description 先直接正则烘焙 hex / rgb；命名色 / hsl 等用宿主 `resolveCssColor` 归一成 hex / rgb 后再烘焙。
 *   归一器缺省（无宿主）时按 best-effort 忽略 opacity（渐变退化纯色，与历史一致）。
 */
const applyStopAlpha = (
  color: string,
  opacity: number | undefined,
  resolveCssColor: ((color: string) => string) | undefined,
): string => {
  if (opacity === undefined || opacity >= 1) return color;
  const direct = bakeAlpha(color, opacity);
  if (direct !== undefined) return direct;
  const normalized = resolveCssColor?.(color);
  if (normalized !== undefined && normalized !== color) {
    const baked = bakeAlpha(normalized, opacity);
    if (baked !== undefined) return baked;
  }
  return color;
};

const resolvePaintStyle = (
  ctx: CanvasRenderingContext2D,
  paint: PaintValue | undefined,
  contextStroke: string | undefined,
  options: DrawOptions,
  resources: ResourceMap,
): string | CanvasGradient | CanvasPattern | undefined => {
  if (paint === undefined) return undefined;
  if (typeof paint === 'string') return paint === 'none' ? undefined : resolveColor(paint, options);
  if (paint.kind === 'contextStroke') return resolveColor(contextStroke, options) ?? String(ctx.strokeStyle);
  const resource = resources.get(paint.id);
  if (resource !== undefined && resource.kind === 'paint') {
    const spec = resource.spec;
    if (spec.kind === 'pattern' && resource.tile !== undefined) {
      const pattern = buildPattern(ctx, resource.tile, options);
      if (pattern !== undefined) return pattern;
    }
  }
  warnUnsupported(
    options,
    'paint',
    `Canvas renderer does not support paint resource "${paint.id}" yet; paint is skipped.`,
  );
  return undefined;
};

type ImageSpec = Extract<IRPaintSpec, { kind: 'image' }>;

/** 取图片源的固有尺寸（HTMLImageElement 用 naturalWidth，其余回退 width/height） */
const imageNaturalSize = (img: CanvasImageSource): { w: number; h: number } => {
  const any = img as { naturalWidth?: number; naturalHeight?: number; width?: number; height?: number };
  return { w: any.naturalWidth || any.width || 0, h: any.naturalHeight || any.height || 0 };
};

/**
 * image paint server 填充：clip 到当前形状路径，按 fit 把图片放进 bbox 后 drawImage
 * @description fill 拉伸铺满、contain 等比装入、cover（默认）等比覆盖；均居中。未提供 getImage → 降级告警；
 *   已提供但未就绪（返回 null）→ 本帧静默跳过（加载完由调用方重绘）。
 */
const fillImage = (
  ctx: CanvasRenderingContext2D,
  spec: ImageSpec,
  bbox: BBox,
  fillOpacity: number | undefined,
  options: DrawOptions,
): void => {
  const img = options.getImage?.(spec.href) ?? null;
  if (img === null) {
    if (options.getImage === undefined) {
      warnUnsupported(
        options,
        'paint',
        `Canvas renderer requires a getImage loader to render image paint "${spec.href}"; fill is skipped.`,
      );
    }
    return;
  }
  ctx.save();
  if (fillOpacity !== undefined) ctx.globalAlpha *= fillOpacity;
  ctx.clip();
  const { w: iw, h: ih } = imageNaturalSize(img);
  const fit = spec.fit ?? 'cover';
  if (fit === 'fill' || iw <= 0 || ih <= 0) {
    ctx.drawImage(img, bbox.x, bbox.y, bbox.w, bbox.h);
  } else {
    const scale = fit === 'contain' ? Math.min(bbox.w / iw, bbox.h / ih) : Math.max(bbox.w / iw, bbox.h / ih);
    const dw = iw * scale;
    const dh = ih * scale;
    ctx.drawImage(img, bbox.x + (bbox.w - dw) / 2, bbox.y + (bbox.h - dh) / 2, dw, dh);
  }
  ctx.restore();
};

const fillCurrentPath = (
  ctx: CanvasRenderingContext2D,
  fill: PaintValue | undefined,
  stroke: PaintValue | undefined,
  fillOpacity: number | undefined,
  fillRule: CanvasFillRule | undefined,
  options: DrawOptions,
  resources: ResourceMap,
  bbox: BBox,
): void => {
  if (fill !== undefined && typeof fill !== 'string' && fill.kind === 'resourceRef') {
    const resource = resources.get(fill.id);
    if (resource !== undefined && resource.kind === 'paint') {
      if (resource.spec.kind === 'image') {
        fillImage(ctx, resource.spec, bbox, fillOpacity, options);
        return;
      }
      if (
        resource.spec.kind === 'linearGradient' ||
        resource.spec.kind === 'radialGradient' ||
        resource.spec.kind === 'conicGradient'
      ) {
        fillObjectGradient({
          ctx,
          spec: resource.spec,
          bbox,
          fillOpacity,
          drawFill: () => ctx.fill(fillRule),
          resolveStopColor: (color, opacity) =>
            applyStopAlpha(resolveColor(color, options) ?? color, opacity, options.resolveCssColor),
          warn: message => warnUnsupported(options, 'paint', message),
        });
        return;
      }
    }
  }
  const fillStyle = resolvePaintStyle(ctx, fill, typeof stroke === 'string' ? stroke : undefined, options, resources);
  if (fillStyle === undefined) return;
  if (fillOpacity !== undefined) {
    ctx.save();
    ctx.globalAlpha *= fillOpacity;
  }
  ctx.fillStyle = fillStyle;
  ctx.fill(fillRule);
  if (fillOpacity !== undefined) ctx.restore();
};

const strokeCurrentPath = (
  ctx: CanvasRenderingContext2D,
  stroke: PaintValue | undefined,
  strokeOpacity: number | undefined,
  strokeWidth: number | undefined,
  dashPattern: Array<number> | undefined,
  dashOffset: number | undefined,
  options: DrawOptions,
  resources: ResourceMap,
  bbox: BBox,
  state: DrawState,
): void => {
  let strokeStyle: string | CanvasGradient | CanvasPattern | undefined;
  let gradientHandled = false;
  if (stroke !== undefined && typeof stroke !== 'string' && stroke.kind === 'resourceRef') {
    const resource = resources.get(stroke.id);
    if (
      resource?.kind === 'paint' &&
      (resource.spec.kind === 'linearGradient' ||
        resource.spec.kind === 'radialGradient' ||
        resource.spec.kind === 'conicGradient')
    ) {
      gradientHandled = true;
      const miterLimit = Number.isFinite(ctx.miterLimit) ? ctx.miterLimit : 10;
      const effectiveStrokeWidth = strokeWidth ?? ctx.lineWidth;
      const outset = (effectiveStrokeWidth / 2) * (ctx.lineJoin === 'miter' ? miterLimit : 1);
      strokeStyle = buildGradientStrokeStyle({
        ctx,
        spec: resource.spec,
        bbox,
        createOffscreen: options.createOffscreen,
        outset,
        cache: state.gradientPatterns,
        cacheKey: stroke.id,
        resolveStopColor: (color, opacity) =>
          applyStopAlpha(resolveColor(color, options) ?? color, opacity, options.resolveCssColor),
        warn: message => warnUnsupported(options, 'paint', message),
      });
    }
  }
  if (!gradientHandled) strokeStyle = resolvePaintStyle(ctx, stroke, undefined, options, resources);
  if (strokeStyle === undefined) return;
  if (strokeOpacity !== undefined) ctx.save();
  ctx.strokeStyle = strokeStyle;
  applyStrokeStyle(ctx, strokeWidth, strokeOpacity, dashPattern, dashOffset);
  ctx.stroke();
  if (strokeOpacity !== undefined) ctx.restore();
};

const resolveFontFamily = (fontFamily: string | undefined, options: DrawOptions): string => {
  if (typeof fontFamily === 'string' && fontFamily.trim().length > 0) return fontFamily;
  if (typeof options.defaultFontFamily === 'string' && options.defaultFontFamily.trim().length > 0) {
    return options.defaultFontFamily;
  }
  return 'sans-serif';
};

const buildFont = (
  fontSize: number,
  fontFamily: string | undefined,
  fontWeight: string | number | undefined,
  fontStyle: string | undefined,
  options: DrawOptions,
): string =>
  [fontStyle, fontWeight, `${fontSize}px`, resolveFontFamily(fontFamily, options)]
    .filter(part => part !== undefined && part !== '')
    .join(' ');

const drawText = (ctx: CanvasRenderingContext2D, p: TextPrim, options: DrawOptions): void => {
  ctx.font = buildFont(p.fontSize, p.fontFamily, p.fontWeight, p.fontStyle, options);
  ctx.textAlign = p.align === 'middle' ? 'center' : p.align;
  ctx.textBaseline = p.baseline;
  // 确定 fill 基线：缺省 #000（与 SVG 文本省略 fill 时的默认黑一致），避免继承上一个 prim 残留的脏 fillStyle
  ctx.fillStyle = '#000000';
  if (p.fill !== undefined && p.fill !== 'none') ctx.fillStyle = resolveColor(p.fill, options) ?? p.fill;
  const offset = firstLineDy(p);
  p.lines.forEach((line, index) => {
    const shouldRestore =
      line.opacity !== undefined ||
      line.fontSize !== undefined ||
      line.fontFamily !== undefined ||
      line.fontWeight !== undefined ||
      line.fontStyle !== undefined ||
      line.fill !== undefined;
    if (shouldRestore) ctx.save();
    if (line.opacity !== undefined) ctx.globalAlpha *= line.opacity;
    if (
      line.fontSize !== undefined ||
      line.fontFamily !== undefined ||
      line.fontWeight !== undefined ||
      line.fontStyle !== undefined
    ) {
      ctx.font = buildFont(
        line.fontSize ?? p.fontSize,
        line.fontFamily ?? p.fontFamily,
        line.fontWeight ?? p.fontWeight,
        line.fontStyle ?? p.fontStyle,
        options,
      );
    }
    if (line.fill !== undefined && line.fill !== 'none') ctx.fillStyle = resolveColor(line.fill, options) ?? line.fill;
    if ((line.fill ?? p.fill) !== 'none') {
      ctx.fillText(line.text, p.x, p.y + (index === 0 ? offset : offset + index * p.lineHeight));
    }
    if (shouldRestore) ctx.restore();
  });
};

type Point = [number, number];

type DrawableCommand = Exclude<PathCommand, { kind: 'move' | 'close' }>;

type DrawableSegment = {
  command: DrawableCommand;
  from: Point;
};

const drawableSegments = (commands: ReadonlyArray<PathCommand>): Array<DrawableSegment> => {
  const segments: Array<DrawableSegment> = [];
  let cursor: Point | null = null;
  let subpathStart: Point | null = null;

  for (const command of commands) {
    if (command.kind === 'move') {
      cursor = [command.to[0], command.to[1]];
      subpathStart = cursor;
      continue;
    }
    if (command.kind === 'close') {
      cursor = subpathStart;
      continue;
    }

    const from = cursor ?? (command.kind === 'arc' || command.kind === 'ellipseArc' ? commandArcStart(command) : null);
    if (from) segments.push({ command, from });
    cursor = commandEndpoint(command);
    if (subpathStart === null && from) subpathStart = from;
  }

  return segments;
};

/**
 * 末端箭头定位：终点 + 入射切线角（指向终点的方向）
 * @description 使用最后一条可绘制命令的几何终点与解析切线；无法判向则角度取 0。
 */
const endArrowPlacement = (commands: ReadonlyArray<PathCommand>): { vertex: Point; angle: number } | null => {
  const segment = drawableSegments(commands).at(-1);
  if (!segment) return null;
  const vertex = commandEndpoint(segment.command);
  if (!vertex) return null;
  const tangent = commandEndTangent(segment.command, segment.from);
  const angle = tangent ? Math.atan2(tangent[1], tangent[0]) : 0;
  return { vertex, angle };
};

/**
 * 起点箭头定位：起点 + 离开切线角的反向（对应 SVG `orient="auto-start-reverse"`）
 * @description 使用第一条可绘制命令的几何起点与解析切线；无法判向则角度取 0。
 */
const startArrowPlacement = (commands: ReadonlyArray<PathCommand>): { vertex: Point; angle: number } | null => {
  const segment = drawableSegments(commands).at(0);
  if (!segment) return null;
  const tangent = commandStartTangent(segment.command, segment.from);
  const angle = tangent ? Math.atan2(tangent[1], tangent[0]) + Math.PI : 0;
  return { vertex: segment.from, angle };
};

/** marker-local fill 取值 → canvas 颜色：contextStroke 解析为线的 stroke（缺省回退当前 strokeStyle） */
const resolveMarkerFill = (
  ctx: CanvasRenderingContext2D,
  fill: MarkerFill | undefined,
  pathStroke: string | undefined,
  options: DrawOptions,
): string | undefined => {
  if (fill === undefined) return undefined;
  if (typeof fill === 'string') return fill === 'none' ? undefined : resolveColor(fill, options);
  return pathStroke ?? String(ctx.strokeStyle);
};

/** marker-local stroke 取值 → canvas 颜色：`{ kind:'contextStroke' }`（及 legacy `context-stroke` 关键字）解析为线的 stroke（缺省回退当前 strokeStyle） */
const resolveMarkerStroke = (
  ctx: CanvasRenderingContext2D,
  stroke: MarkerFill | undefined,
  pathStroke: string | undefined,
  options: DrawOptions,
): string | undefined => {
  if (stroke === undefined) return undefined;
  if (typeof stroke === 'string') {
    if (stroke === 'none') return undefined;
    if (stroke === 'context-stroke') return pathStroke ?? String(ctx.strokeStyle); // legacy 关键字兼容
    return resolveColor(stroke, options) ?? stroke;
  }
  return pathStroke ?? String(ctx.strokeStyle); // { kind: 'contextStroke' }
};

const fillMarkerPath = (
  ctx: CanvasRenderingContext2D,
  fill: string | undefined,
  fillOpacity: number | undefined,
  fillRule: CanvasFillRule | undefined,
): void => {
  if (fill === undefined) return;
  if (fillOpacity !== undefined) {
    ctx.save();
    ctx.globalAlpha *= fillOpacity;
  }
  ctx.fillStyle = fill;
  ctx.fill(fillRule);
  if (fillOpacity !== undefined) ctx.restore();
};

const strokeMarkerPath = (
  ctx: CanvasRenderingContext2D,
  stroke: string | undefined,
  strokeOpacity: number | undefined,
  strokeWidth: number | undefined,
  dashPattern: Array<number> | undefined,
  dashOffset: number | undefined,
): void => {
  if (stroke === undefined) return;
  if (strokeOpacity !== undefined) ctx.save();
  ctx.strokeStyle = stroke;
  if (strokeWidth !== undefined) ctx.lineWidth = strokeWidth;
  if (strokeOpacity !== undefined) ctx.globalAlpha *= strokeOpacity;
  applyDash(ctx, dashPattern, dashOffset);
  ctx.stroke();
  if (strokeOpacity !== undefined) ctx.restore();
};

/** 绘制单个 marker-local primitive（path/ellipse/rect/group 窄子集）；fill/stroke 的 contextStroke 解析为线色 */
const drawMarkerPrim = (
  ctx: CanvasRenderingContext2D,
  prim: MarkerPrimitive,
  pathStroke: string | undefined,
  options: DrawOptions,
): void => {
  ctx.save();
  switch (prim.type) {
    case 'path':
      buildPath(ctx, prim.commands);
      if (prim.strokeLinecap !== undefined) ctx.lineCap = prim.strokeLinecap;
      if (prim.strokeLinejoin !== undefined) ctx.lineJoin = prim.strokeLinejoin;
      fillMarkerPath(ctx, resolveMarkerFill(ctx, prim.fill, pathStroke, options), prim.fillOpacity, prim.fillRule);
      strokeMarkerPath(
        ctx,
        resolveMarkerStroke(ctx, prim.stroke, pathStroke, options),
        prim.strokeOpacity,
        prim.strokeWidth,
        prim.dashPattern,
        prim.dashOffset,
      );
      break;
    case 'ellipse':
      if (prim.rotate) {
        ctx.translate(prim.cx, prim.cy);
        ctx.rotate(prim.rotate * DEG_TO_RAD);
        ctx.translate(-prim.cx, -prim.cy);
      }
      ctx.beginPath();
      ctx.ellipse(prim.cx, prim.cy, prim.rx, prim.ry, 0, 0, Math.PI * 2);
      fillMarkerPath(ctx, resolveMarkerFill(ctx, prim.fill, pathStroke, options), prim.fillOpacity, undefined);
      strokeMarkerPath(
        ctx,
        resolveMarkerStroke(ctx, prim.stroke, pathStroke, options),
        prim.strokeOpacity,
        prim.strokeWidth,
        prim.dashPattern,
        prim.dashOffset,
      );
      break;
    case 'rect':
      roundedRectPath(ctx, prim.x, prim.y, prim.width, prim.height, prim.cornerRadius);
      fillMarkerPath(ctx, resolveMarkerFill(ctx, prim.fill, pathStroke, options), prim.fillOpacity, undefined);
      strokeMarkerPath(
        ctx,
        resolveMarkerStroke(ctx, prim.stroke, pathStroke, options),
        prim.strokeOpacity,
        prim.strokeWidth,
        prim.dashPattern,
        prim.dashOffset,
      );
      break;
    case 'group':
      for (const transform of prim.transforms ?? []) applyTransform(ctx, transform);
      for (const child of prim.children) drawMarkerPrim(ctx, child, pathStroke, options);
      break;
  }
  ctx.restore();
};

/**
 * pattern paint server 填充：离屏渲染 motif tile → ctx.createPattern('repeat')
 * @description tile 已由 compile 解析（size / background / rotation / motif 几何）。motif 复用 drawMarkerPrim
 *   画进 size×size 离屏 context；contextStroke / currentColor 走 options.currentColor（缺省黑）。rotation 经
 *   pattern.setTransform 旋转。缺 createOffscreen 工厂返回 undefined（caller 据此降级告警）。
 */
const buildPattern = (
  ctx: CanvasRenderingContext2D,
  tile: ResolvedPatternTile,
  options: DrawOptions,
): CanvasPattern | undefined => {
  const off = options.createOffscreen?.(tile.size, tile.size) ?? null;
  if (off === null) return undefined;
  if (tile.background !== undefined) {
    off.fillStyle = tile.background;
    off.fillRect(0, 0, tile.size, tile.size);
  }
  const motifColor = options.currentColor ?? '#000';
  for (const prim of tile.motif) drawMarkerPrim(off, prim, motifColor, options);
  const pattern = ctx.createPattern(off.canvas, 'repeat');
  if (pattern === null) return undefined;
  if (tile.rotation) {
    const rad = tile.rotation * DEG_TO_RAD;
    pattern.setTransform({ a: Math.cos(rad), b: Math.sin(rad), c: -Math.sin(rad), d: Math.cos(rad), e: 0, f: 0 });
  }
  return pattern;
};

/**
 * 绘制端点箭头 marker：参考点 (refX, baseSize/2) 贴端点 V、沿切线旋转、按 markerUnits=strokeWidth 缩放
 * @description 复刻 SVG `<marker>` 物化：viewBox `0 0 baseSize baseSize` 经 preserveAspectRatio=none 拉伸到
 *   markerWidth×markerHeight，再乘 strokeWidth（markerUnits）。spec.opacity 叠加到 path opacity 上。
 */
const drawArrowMarker = (
  ctx: CanvasRenderingContext2D,
  spec: ResolvedArrowEndSpec,
  vertex: Point,
  angle: number,
  strokeWidth: number,
  pathStroke: string | undefined,
  options: DrawOptions,
): void => {
  ctx.save();
  if (spec.opacity !== undefined) ctx.globalAlpha *= spec.opacity;
  // marker 在独立坐标系渲染（如 SVG defs marker），描边样式不继承 path 的 lineCap / lineJoin
  ctx.lineCap = 'butt';
  ctx.lineJoin = 'miter';
  ctx.translate(vertex[0], vertex[1]);
  ctx.rotate(angle);
  ctx.scale((spec.markerWidth * strokeWidth) / spec.baseSize, (spec.markerHeight * strokeWidth) / spec.baseSize);
  ctx.translate(-spec.refX, -spec.baseSize / 2);
  for (const prim of spec.marker) drawMarkerPrim(ctx, prim, pathStroke, options);
  ctx.restore();
};

const drawPrim = (
  ctx: CanvasRenderingContext2D,
  p: ScenePrimitive,
  options: DrawOptions,
  resources: ResourceMap,
  state: DrawState,
): void => {
  ctx.save();
  // 动画：把该 prim 的 tracks 在「有效时刻」应用到 ctx（transform / dash）并取覆盖后的 prim（opacity / 色 / 线宽）。
  // per-id 虚拟时钟经 resolvePrimAnimation 折算各 id 的有效时刻 / 模式（skip=渲染 base）；缺省退回全局 time + 仅自动播。
  if (p.animations !== undefined && p.animations.length > 0) {
    const resolution = options.resolvePrimAnimation?.(p.id);
    const primTime = resolution?.mode === 'at' ? resolution.time : options.time;
    if (resolution?.mode !== 'skip' && primTime !== undefined) {
      p = applyPrimAnimations(ctx, p, primTime, {
        easings: options.easings,
        animationProperties: options.animationProperties,
        warn: message => warnUnsupported(options, 'animation', message),
        includeNonAutoplay: resolution?.mode === 'at' ? resolution.includeNonAutoplay : false,
      });
    }
  }
  switch (p.type) {
    case 'rect':
      withBlend(ctx, p.blendMode, () =>
        withShadow(ctx, p.shadow, () =>
          withOpacity(ctx, p.opacity, () => {
            roundedRectPath(ctx, p.x, p.y, p.width, p.height, p.cornerRadius);
            fillCurrentPath(ctx, p.fill, p.stroke, p.fillOpacity, undefined, options, resources, {
              x: p.x,
              y: p.y,
              w: p.width,
              h: p.height,
            });
            strokeCurrentPath(
              ctx,
              p.stroke,
              p.strokeOpacity,
              p.strokeWidth,
              p.dashPattern,
              p.dashOffset,
              options,
              resources,
              {
                x: p.x,
                y: p.y,
                w: p.width,
                h: p.height,
              },
              state,
            );
          }),
        ),
      );
      break;
    case 'ellipse':
      withBlend(ctx, p.blendMode, () =>
        withShadow(ctx, p.shadow, () =>
          withOpacity(ctx, p.opacity, () => {
            const shouldRestore = p.rotate !== undefined;
            if (shouldRestore) ctx.save();
            if (p.rotate) {
              ctx.translate(p.cx, p.cy);
              ctx.rotate(p.rotate * DEG_TO_RAD);
              ctx.translate(-p.cx, -p.cy);
            }
            ctx.beginPath();
            ctx.ellipse(p.cx, p.cy, p.rx, p.ry, 0, 0, Math.PI * 2);
            fillCurrentPath(ctx, p.fill, p.stroke, p.fillOpacity, undefined, options, resources, {
              x: p.cx - p.rx,
              y: p.cy - p.ry,
              w: 2 * p.rx,
              h: 2 * p.ry,
            });
            strokeCurrentPath(
              ctx,
              p.stroke,
              p.strokeOpacity,
              p.strokeWidth,
              p.dashPattern,
              p.dashOffset,
              options,
              resources,
              {
                x: p.cx - p.rx,
                y: p.cy - p.ry,
                w: 2 * p.rx,
                h: 2 * p.ry,
              },
              state,
            );
            if (shouldRestore) ctx.restore();
          }),
        ),
      );
      break;
    case 'path':
      withBlend(ctx, p.blendMode, () =>
        withShadow(ctx, p.shadow, () =>
          withOpacity(ctx, p.opacity, () => {
            buildPath(ctx, p.commands);
            if (p.strokeLinecap !== undefined) ctx.lineCap = p.strokeLinecap;
            if (p.strokeLinejoin !== undefined) ctx.lineJoin = p.strokeLinejoin;
            const bbox = pathBounds(p.commands);
            fillCurrentPath(ctx, p.fill, p.stroke, p.fillOpacity, p.fillRule, options, resources, bbox);
            strokeCurrentPath(
              ctx,
              p.stroke,
              p.strokeOpacity,
              p.strokeWidth,
              p.dashPattern,
              p.dashOffset,
              options,
              resources,
              bbox,
              state,
            );
            if (p.arrowStart || p.arrowEnd) {
              const strokeWidth = p.strokeWidth ?? 1;
              const pathStroke = typeof p.stroke === 'string' ? resolveColor(p.stroke, options) : undefined;
              if (p.arrowStart) {
                const placement = startArrowPlacement(p.commands);
                if (placement)
                  drawArrowMarker(
                    ctx,
                    p.arrowStart,
                    placement.vertex,
                    placement.angle,
                    strokeWidth,
                    pathStroke,
                    options,
                  );
              }
              if (p.arrowEnd) {
                const placement = endArrowPlacement(p.commands);
                if (placement)
                  drawArrowMarker(ctx, p.arrowEnd, placement.vertex, placement.angle, strokeWidth, pathStroke, options);
              }
            }
          }),
        ),
      );
      break;
    case 'text':
      withOpacity(ctx, p.opacity, () => drawText(ctx, p, options));
      break;
    case 'group': {
      ctx.save();
      for (const transform of p.transforms ?? []) applyTransform(ctx, transform);
      if (p.clipRef !== undefined) {
        const clip = resources.get(p.clipRef);
        if (clip !== undefined && clip.kind === 'clip') {
          applyClip(ctx, clip.shape);
        } else {
          warnUnsupported(options, 'clip', `Canvas renderer: clip resource "${p.clipRef}" not found; clip is skipped.`);
        }
      }
      const groupOpacity = 'opacity' in p && typeof p.opacity === 'number' ? p.opacity : undefined;
      withOpacity(ctx, groupOpacity, () => {
        for (const child of p.children) drawPrim(ctx, child, options, resources, state);
      });
      ctx.restore();
      break;
    }
  }
  ctx.restore();
};

/** 绘制已编译 Scene 到 Canvas 2D context */
export const drawScene = (ctx: CanvasRenderingContext2D, scene: Scene, options: DrawOptions = {}): void => {
  const resources: ResourceMap = new Map((scene.resources ?? []).map(r => [r.id, r]));
  const state: DrawState = { gradientPatterns: new Map() };
  // 镜头：给定 time 且 scene 根有 viewBox track 时，先叠一层取景变换（包住全部 prim）
  const hasCamera = options.time !== undefined && (scene.animations ?? []).some(t => t.property === 'viewBox');
  if (hasCamera) {
    ctx.save();
    applySceneCamera(ctx, scene, options.time as number, options.easings);
  }
  for (const primitive of scene.primitives) drawPrim(ctx, primitive, options, resources, state);
  if (hasCamera) ctx.restore();
};
