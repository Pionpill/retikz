import type {
  ArrowEndSpec,
  ClipShape,
  IRPaintSpec,
  MarkerFill,
  MarkerPrimitive,
  PaintValue,
  PathCommand,
  Scene,
  ScenePrimitive,
  SceneResource,
  TextPrim,
  Transform,
} from '@retikz/core';
import type { CanvasWarning, DrawOptions, UnsupportedCanvasFeature } from './types';

const DEG_TO_RAD = Math.PI / 180;

const warnUnsupported = (
  options: DrawOptions,
  feature: UnsupportedCanvasFeature,
  message: string,
): void => {
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

const withOpacity = (
  ctx: CanvasRenderingContext2D,
  opacity: number | undefined,
  draw: () => void,
): void => {
  if (opacity === undefined) {
    draw();
    return;
  }

  ctx.save();
  ctx.globalAlpha *= opacity;
  draw();
  ctx.restore();
};

const applyDash = (ctx: CanvasRenderingContext2D, dashPattern: Array<number> | undefined): void => {
  ctx.setLineDash(dashPattern ?? []);
};

const applyStrokeStyle = (
  ctx: CanvasRenderingContext2D,
  stroke: string | undefined,
  strokeWidth: number | undefined,
  strokeOpacity: number | undefined,
  dashPattern: Array<number> | undefined,
  options: DrawOptions,
): void => {
  if (stroke !== undefined) ctx.strokeStyle = resolveColor(stroke, options) ?? stroke;
  if (strokeWidth !== undefined) ctx.lineWidth = strokeWidth;
  if (strokeOpacity !== undefined) ctx.globalAlpha *= strokeOpacity;
  applyDash(ctx, dashPattern);
};

/** 被填充图元的包围盒（user units）；gradient/image 的 objectBoundingBox(0..1) 据此映射为绝对坐标 */
type BBox = { x: number; y: number; w: number; h: number };

/** Scene 资源按 id 索引（fill resourceRef 查表） */
type ResourceMap = ReadonlyMap<string, SceneResource>;

type GradientSpec = Extract<IRPaintSpec, { type: 'linearGradient' | 'radialGradient' }>;

/**
 * 把 stop 的 opacity 烘焙进颜色（canvas addColorStop 无 stop-opacity）
 * @description hex / rgb(a) 可解析者转 rgba 并乘 alpha；命名色 / hsl 等无法解析则按 best-effort 忽略 opacity。
 */
const applyStopAlpha = (color: string, opacity: number | undefined): string => {
  if (opacity === undefined || opacity >= 1) return color;
  const hex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.exec(color);
  if (hex) {
    let h = hex[1];
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }
  const rgb = /^rgba?\(([^)]+)\)$/.exec(color);
  if (rgb) {
    const parts = rgb[1].split(',').map(s => s.trim());
    const a = parts.length > 3 ? parseFloat(parts[3]) : 1;
    return `rgba(${parts[0]}, ${parts[1]}, ${parts[2]}, ${a * opacity})`;
  }
  return color;
};

/**
 * 据 gradient spec + 被填充图元 bbox 构建 CanvasGradient
 * @description objectBoundingBox(0..1) → 绝对坐标：linear 过中心沿 angle（polar，0=+x / 90=+y 屏幕下）取长度 1；
 *   radial 圆形近似（canvas 不支持椭圆渐变）半径 = radius × max(w,h)（cover 观感）。stop 颜色解析 currentColor + 烘焙 opacity。
 */
const buildGradient = (
  ctx: CanvasRenderingContext2D,
  spec: GradientSpec,
  bbox: BBox,
  options: DrawOptions,
): CanvasGradient => {
  let gradient: CanvasGradient;
  if (spec.type === 'linearGradient') {
    const rad = (spec.angle ?? 0) * DEG_TO_RAD;
    const dx = Math.cos(rad);
    const dy = Math.sin(rad);
    gradient = ctx.createLinearGradient(
      bbox.x + (0.5 - dx * 0.5) * bbox.w,
      bbox.y + (0.5 - dy * 0.5) * bbox.h,
      bbox.x + (0.5 + dx * 0.5) * bbox.w,
      bbox.y + (0.5 + dy * 0.5) * bbox.h,
    );
  } else {
    const [cx, cy] = spec.center ?? [0.5, 0.5];
    const acx = bbox.x + cx * bbox.w;
    const acy = bbox.y + cy * bbox.h;
    gradient = ctx.createRadialGradient(acx, acy, 0, acx, acy, (spec.radius ?? 0.5) * Math.max(bbox.w, bbox.h));
  }
  for (const stop of spec.stops) {
    gradient.addColorStop(stop.offset, applyStopAlpha(resolveColor(stop.color, options) ?? stop.color, stop.opacity));
  }
  return gradient;
};

const resolveFillStyle = (
  ctx: CanvasRenderingContext2D,
  fill: PaintValue | undefined,
  stroke: string | undefined,
  options: DrawOptions,
  resources: ResourceMap,
  bbox: BBox,
): string | CanvasGradient | CanvasPattern | undefined => {
  if (fill === undefined) return undefined;
  if (typeof fill === 'string') return resolveColor(fill, options);
  if (fill.kind === 'contextStroke') return resolveColor(stroke, options) ?? String(ctx.strokeStyle);
  const resource = resources.get(fill.id);
  if (resource !== undefined && resource.kind === 'paint') {
    const spec = resource.spec;
    if (spec.type === 'linearGradient' || spec.type === 'radialGradient') {
      return buildGradient(ctx, spec, bbox, options);
    }
  }
  warnUnsupported(options, 'paint', `Canvas renderer does not support paint resource "${fill.id}" yet; fill is skipped.`);
  return undefined;
};

type ImageSpec = Extract<IRPaintSpec, { type: 'image' }>;

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
      warnUnsupported(options, 'paint', `Canvas renderer requires a getImage loader to render image paint "${spec.href}"; fill is skipped.`);
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
  stroke: string | undefined,
  fillOpacity: number | undefined,
  fillRule: CanvasFillRule | undefined,
  options: DrawOptions,
  resources: ResourceMap,
  bbox: BBox,
): void => {
  if (fill !== undefined && typeof fill !== 'string' && fill.kind === 'resourceRef') {
    const resource = resources.get(fill.id);
    if (resource !== undefined && resource.kind === 'paint' && resource.spec.type === 'image') {
      fillImage(ctx, resource.spec, bbox, fillOpacity, options);
      return;
    }
  }
  const fillStyle = resolveFillStyle(ctx, fill, stroke, options, resources, bbox);
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
  stroke: string | undefined,
  strokeOpacity: number | undefined,
  strokeWidth: number | undefined,
  dashPattern: Array<number> | undefined,
  options: DrawOptions,
): void => {
  if (stroke === undefined) return;
  if (strokeOpacity !== undefined) ctx.save();
  applyStrokeStyle(ctx, stroke, strokeWidth, strokeOpacity, dashPattern, options);
  ctx.stroke();
  if (strokeOpacity !== undefined) ctx.restore();
};

const roundedRectPath = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number | undefined,
): void => {
  const r = Math.min(radius ?? 0, Math.abs(width) / 2, Math.abs(height) / 2);
  ctx.beginPath();
  if (r <= 0) {
    ctx.rect(x, y, width, height);
    return;
  }
  const right = x + width;
  const bottom = y + height;
  ctx.moveTo(x + r, y);
  ctx.lineTo(right - r, y);
  ctx.quadraticCurveTo(right, y, right, y + r);
  ctx.lineTo(right, bottom - r);
  ctx.quadraticCurveTo(right, bottom, right - r, bottom);
  ctx.lineTo(x + r, bottom);
  ctx.quadraticCurveTo(x, bottom, x, bottom - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
};

const pathCommand = (ctx: CanvasRenderingContext2D, command: PathCommand): void => {
  switch (command.kind) {
    case 'move':
      ctx.moveTo(command.to[0], command.to[1]);
      break;
    case 'line':
      ctx.lineTo(command.to[0], command.to[1]);
      break;
    case 'quad':
      ctx.quadraticCurveTo(command.control[0], command.control[1], command.to[0], command.to[1]);
      break;
    case 'cubic':
      ctx.bezierCurveTo(
        command.control1[0],
        command.control1[1],
        command.control2[0],
        command.control2[1],
        command.to[0],
        command.to[1],
      );
      break;
    case 'close':
      ctx.closePath();
      break;
    case 'arc':
      ctx.arc(
        command.center[0],
        command.center[1],
        command.radius,
        command.startAngle * DEG_TO_RAD,
        command.endAngle * DEG_TO_RAD,
        command.counterClockwise ?? false,
      );
      break;
    case 'ellipseArc':
      ctx.ellipse(
        command.center[0],
        command.center[1],
        command.radiusX,
        command.radiusY,
        (command.rotation ?? 0) * DEG_TO_RAD,
        command.startAngle * DEG_TO_RAD,
        command.endAngle * DEG_TO_RAD,
        command.counterClockwise ?? false,
      );
      break;
  }
};

const buildPath = (ctx: CanvasRenderingContext2D, commands: ReadonlyArray<PathCommand>): void => {
  ctx.beginPath();
  for (const command of commands) pathCommand(ctx, command);
};

const firstLineDy = (text: TextPrim): number =>
  text.baseline === 'middle'
    ? (-(text.lines.length - 1) / 2) * text.lineHeight
    : text.baseline === 'bottom'
      ? -(text.lines.length - 1) * text.lineHeight
      : 0;

const resolveFontFamily = (
  fontFamily: string | undefined,
  options: DrawOptions,
): string => {
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
  [
    fontStyle,
    fontWeight,
    `${fontSize}px`,
    resolveFontFamily(fontFamily, options),
  ].filter(part => part !== undefined && part !== '').join(' ');

const drawText = (ctx: CanvasRenderingContext2D, p: TextPrim, options: DrawOptions): void => {
  ctx.font = buildFont(p.fontSize, p.fontFamily, p.fontWeight, p.fontStyle, options);
  ctx.textAlign = p.align === 'middle' ? 'center' : p.align;
  ctx.textBaseline = p.baseline;
  if (p.fill !== undefined) ctx.fillStyle = resolveColor(p.fill, options) ?? p.fill;
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
    if (line.fontSize !== undefined || line.fontFamily !== undefined || line.fontWeight !== undefined || line.fontStyle !== undefined) {
      ctx.font = buildFont(
        line.fontSize ?? p.fontSize,
        line.fontFamily ?? p.fontFamily,
        line.fontWeight ?? p.fontWeight,
        line.fontStyle ?? p.fontStyle,
        options,
      );
    }
    if (line.fill !== undefined) ctx.fillStyle = resolveColor(line.fill, options) ?? line.fill;
    ctx.fillText(line.text, p.x, p.y + (index === 0 ? offset : offset + index * p.lineHeight));
    if (shouldRestore) ctx.restore();
  });
};

const applyTransform = (ctx: CanvasRenderingContext2D, transform: Transform): void => {
  switch (transform.kind) {
    case 'translate':
      ctx.translate(transform.x, transform.y);
      break;
    case 'rotate':
      if (transform.cx !== undefined || transform.cy !== undefined) {
        const cx = transform.cx ?? 0;
        const cy = transform.cy ?? 0;
        ctx.translate(cx, cy);
        ctx.rotate(transform.degrees * DEG_TO_RAD);
        ctx.translate(-cx, -cy);
      } else {
        ctx.rotate(transform.degrees * DEG_TO_RAD);
      }
      break;
    case 'scale':
      ctx.scale(transform.x, transform.y ?? transform.x);
      break;
  }
};

type Point = [number, number];

const vecSub = (a: Point, b: Point): Point => [a[0] - b[0], a[1] - b[1]];

const isZeroVec = (v: Point): boolean => v[0] === 0 && v[1] === 0;

/** 取一个 PathCommand 末端 endpoint（与 core 同口径：arc/ellipseArc 取极坐标末点；close 无端点） */
const commandEndpoint = (cmd: PathCommand): Point | null => {
  switch (cmd.kind) {
    case 'move':
    case 'line':
    case 'quad':
    case 'cubic':
      return [cmd.to[0], cmd.to[1]];
    case 'arc': {
      const rad = cmd.endAngle * DEG_TO_RAD;
      return [cmd.center[0] + Math.cos(rad) * cmd.radius, cmd.center[1] + Math.sin(rad) * cmd.radius];
    }
    case 'ellipseArc': {
      const rad = cmd.endAngle * DEG_TO_RAD;
      return [cmd.center[0] + Math.cos(rad) * cmd.radiusX, cmd.center[1] + Math.sin(rad) * cmd.radiusY];
    }
    case 'close':
      return null;
  }
};

/**
 * 末端箭头定位：终点 + 入射切线角（指向终点的方向）
 * @description 带箭头的 path 末段恒为 line/cubic，故 cubic 用 to−control2、line/quad 退化为弦向；
 *   arc/ellipseArc 不会作为带箭头 path 末段，统一退化为前一端点的弦向。无法判向则角度取 0。
 */
const endArrowPlacement = (
  commands: ReadonlyArray<PathCommand>,
): { vertex: Point; angle: number } | null => {
  let lastIdx = -1;
  for (let i = commands.length - 1; i >= 0; i--) {
    if (commands[i].kind !== 'close') {
      lastIdx = i;
      break;
    }
  }
  if (lastIdx < 0) return null;
  const cmd = commands[lastIdx];
  const vertex = commandEndpoint(cmd);
  if (!vertex) return null;
  let prevIdx = lastIdx - 1;
  while (prevIdx >= 0 && commands[prevIdx].kind === 'close') prevIdx--;
  const prev = prevIdx >= 0 ? commandEndpoint(commands[prevIdx]) : null;
  let dir: Point | null = null;
  if (cmd.kind === 'cubic') {
    dir = vecSub(vertex, cmd.control2);
    if (isZeroVec(dir)) dir = vecSub(vertex, cmd.control1);
  } else if (cmd.kind === 'quad') {
    dir = vecSub(vertex, cmd.control);
  }
  if ((dir === null || isZeroVec(dir)) && prev) dir = vecSub(vertex, prev);
  const angle = dir !== null && !isZeroVec(dir) ? Math.atan2(dir[1], dir[0]) : 0;
  return { vertex, angle };
};

/**
 * 起点箭头定位：起点 + 离开切线角的反向（对应 SVG `orient="auto-start-reverse"`）
 * @description 起点后首段恒为 line/cubic，cubic 用 control1−起点、line/quad 退化为弦向；无法判向则角度取 0。
 */
const startArrowPlacement = (
  commands: ReadonlyArray<PathCommand>,
): { vertex: Point; angle: number } | null => {
  if (commands.length === 0) return null;
  let baseIdx = commands.findIndex(c => c.kind === 'move');
  if (baseIdx < 0) baseIdx = 0;
  const vertex = commandEndpoint(commands[baseIdx]);
  if (!vertex) return null;
  let nextIdx = baseIdx + 1;
  while (nextIdx < commands.length && commands[nextIdx].kind === 'close') nextIdx++;
  const next = nextIdx < commands.length ? commands[nextIdx] : undefined;
  let dir: Point | null = null;
  if (next) {
    if (next.kind === 'cubic') {
      dir = vecSub(next.control1, vertex);
      if (isZeroVec(dir)) dir = vecSub(next.control2, vertex);
    } else if (next.kind === 'quad') {
      dir = vecSub(next.control, vertex);
    }
    if (dir === null || isZeroVec(dir)) {
      const nextPt = commandEndpoint(next);
      if (nextPt) dir = vecSub(nextPt, vertex);
    }
  }
  const angle = dir !== null && !isZeroVec(dir) ? Math.atan2(dir[1], dir[0]) + Math.PI : 0;
  return { vertex, angle };
};

/** marker-local fill 取值 → canvas 颜色：contextStroke 解析为线的 stroke（缺省回退当前 strokeStyle） */
const resolveMarkerFill = (
  ctx: CanvasRenderingContext2D,
  fill: MarkerFill | undefined,
  pathStroke: string | undefined,
  options: DrawOptions,
): string | undefined => {
  if (fill === undefined) return undefined;
  if (typeof fill === 'string') return resolveColor(fill, options);
  return pathStroke ?? String(ctx.strokeStyle);
};

/** marker-local stroke 取值 → canvas 颜色：`context-stroke` 解析为线的 stroke（缺省回退当前 strokeStyle） */
const resolveMarkerStroke = (
  ctx: CanvasRenderingContext2D,
  stroke: string | undefined,
  pathStroke: string | undefined,
  options: DrawOptions,
): string | undefined => {
  if (stroke === undefined) return undefined;
  if (stroke === 'context-stroke') return pathStroke ?? String(ctx.strokeStyle);
  return resolveColor(stroke, options) ?? stroke;
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
): void => {
  if (stroke === undefined) return;
  if (strokeOpacity !== undefined) ctx.save();
  ctx.strokeStyle = stroke;
  if (strokeWidth !== undefined) ctx.lineWidth = strokeWidth;
  if (strokeOpacity !== undefined) ctx.globalAlpha *= strokeOpacity;
  applyDash(ctx, dashPattern);
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
      strokeMarkerPath(ctx, resolveMarkerStroke(ctx, prim.stroke, pathStroke, options), prim.strokeOpacity, prim.strokeWidth, prim.dashPattern);
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
      strokeMarkerPath(ctx, resolveMarkerStroke(ctx, prim.stroke, pathStroke, options), prim.strokeOpacity, prim.strokeWidth, prim.dashPattern);
      break;
    case 'rect':
      roundedRectPath(ctx, prim.x, prim.y, prim.width, prim.height, prim.cornerRadius);
      fillMarkerPath(ctx, resolveMarkerFill(ctx, prim.fill, pathStroke, options), prim.fillOpacity, undefined);
      strokeMarkerPath(ctx, resolveMarkerStroke(ctx, prim.stroke, pathStroke, options), prim.strokeOpacity, prim.strokeWidth, prim.dashPattern);
      break;
    case 'group':
      for (const transform of prim.transforms ?? []) applyTransform(ctx, transform);
      for (const child of prim.children) drawMarkerPrim(ctx, child, pathStroke, options);
      break;
  }
  ctx.restore();
};

/**
 * 绘制端点箭头 marker：参考点 (refX, baseSize/2) 贴端点 V、沿切线旋转、按 markerUnits=strokeWidth 缩放
 * @description 复刻 SVG `<marker>` 物化：viewBox `0 0 baseSize baseSize` 经 preserveAspectRatio=none 拉伸到
 *   markerWidth×markerHeight，再乘 strokeWidth（markerUnits）。spec.opacity 叠加到 path opacity 上。
 */
const drawArrowMarker = (
  ctx: CanvasRenderingContext2D,
  spec: ArrowEndSpec,
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
  ctx.scale(
    (spec.markerWidth * strokeWidth) / spec.baseSize,
    (spec.markerHeight * strokeWidth) / spec.baseSize,
  );
  ctx.translate(-spec.refX, -spec.baseSize / 2);
  for (const prim of spec.marker) drawMarkerPrim(ctx, prim, pathStroke, options);
  ctx.restore();
};

/** path commands 的轴对齐包围盒（曲线用控制点 / 弧用半径外接，gradient 映射够用） */
const pathBBox = (commands: ReadonlyArray<PathCommand>): BBox => {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const add = (x: number, y: number): void => {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  };
  for (const c of commands) {
    switch (c.kind) {
      case 'move':
      case 'line':
        add(c.to[0], c.to[1]);
        break;
      case 'quad':
        add(c.control[0], c.control[1]);
        add(c.to[0], c.to[1]);
        break;
      case 'cubic':
        add(c.control1[0], c.control1[1]);
        add(c.control2[0], c.control2[1]);
        add(c.to[0], c.to[1]);
        break;
      case 'arc':
        add(c.center[0] - c.radius, c.center[1] - c.radius);
        add(c.center[0] + c.radius, c.center[1] + c.radius);
        break;
      case 'ellipseArc':
        add(c.center[0] - c.radiusX, c.center[1] - c.radiusY);
        add(c.center[0] + c.radiusX, c.center[1] + c.radiusY);
        break;
      case 'close':
        break;
    }
  }
  if (minX > maxX) return { x: 0, y: 0, w: 0, h: 0 };
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
};

/** 按裁剪形状构建路径并 ctx.clip()（坐标在 group 局部帧，须在 group transform 之后调用） */
const applyClip = (ctx: CanvasRenderingContext2D, shape: ClipShape): void => {
  ctx.beginPath();
  switch (shape.kind) {
    case 'rect':
      ctx.rect(shape.x, shape.y, shape.width, shape.height);
      break;
    case 'circle':
      ctx.arc(shape.cx, shape.cy, shape.r, 0, Math.PI * 2);
      break;
    case 'ellipse':
      ctx.ellipse(shape.cx, shape.cy, shape.rx, shape.ry, 0, 0, Math.PI * 2);
      break;
    case 'polygon':
      shape.points.forEach((pt, i) => (i === 0 ? ctx.moveTo(pt[0], pt[1]) : ctx.lineTo(pt[0], pt[1])));
      ctx.closePath();
      break;
  }
  ctx.clip();
};

const drawPrim = (
  ctx: CanvasRenderingContext2D,
  p: ScenePrimitive,
  options: DrawOptions,
  resources: ResourceMap,
): void => {
  ctx.save();
  switch (p.type) {
    case 'rect':
      withOpacity(ctx, p.opacity, () => {
        roundedRectPath(ctx, p.x, p.y, p.width, p.height, p.cornerRadius);
        fillCurrentPath(ctx, p.fill, p.stroke, p.fillOpacity, undefined, options, resources, {
          x: p.x,
          y: p.y,
          w: p.width,
          h: p.height,
        });
        strokeCurrentPath(ctx, p.stroke, p.strokeOpacity, p.strokeWidth, p.dashPattern, options);
      });
      break;
    case 'ellipse':
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
        strokeCurrentPath(ctx, p.stroke, p.strokeOpacity, p.strokeWidth, p.dashPattern, options);
        if (shouldRestore) ctx.restore();
      });
      break;
    case 'path':
      withOpacity(ctx, p.opacity, () => {
        buildPath(ctx, p.commands);
        if (p.strokeLinecap !== undefined) ctx.lineCap = p.strokeLinecap;
        if (p.strokeLinejoin !== undefined) ctx.lineJoin = p.strokeLinejoin;
        fillCurrentPath(ctx, p.fill, p.stroke, p.fillOpacity, p.fillRule, options, resources, pathBBox(p.commands));
        strokeCurrentPath(ctx, p.stroke, p.strokeOpacity, p.strokeWidth, p.dashPattern, options);
        if (p.arrowStart || p.arrowEnd) {
          const strokeWidth = p.strokeWidth ?? 1;
          const pathStroke = resolveColor(p.stroke, options);
          if (p.arrowStart) {
            const placement = startArrowPlacement(p.commands);
            if (placement) drawArrowMarker(ctx, p.arrowStart, placement.vertex, placement.angle, strokeWidth, pathStroke, options);
          }
          if (p.arrowEnd) {
            const placement = endArrowPlacement(p.commands);
            if (placement) drawArrowMarker(ctx, p.arrowEnd, placement.vertex, placement.angle, strokeWidth, pathStroke, options);
          }
        }
      });
      break;
    case 'text':
      withOpacity(ctx, p.opacity, () => drawText(ctx, p, options));
      break;
    case 'group':
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
      for (const child of p.children) drawPrim(ctx, child, options, resources);
      ctx.restore();
      break;
  }
  ctx.restore();
};

/** 绘制已编译 Scene 到 Canvas 2D context */
export const drawScene = (
  ctx: CanvasRenderingContext2D,
  scene: Scene,
  options: DrawOptions = {},
): void => {
  const resources: ResourceMap = new Map((scene.resources ?? []).map(r => [r.id, r]));
  for (const primitive of scene.primitives) drawPrim(ctx, primitive, options, resources);
};
