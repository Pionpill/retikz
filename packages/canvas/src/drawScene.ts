import type { PaintValue, PathCommand, Scene, ScenePrimitive, TextPrim, Transform } from '@retikz/core';
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
): void => {
  if (stroke !== undefined) ctx.strokeStyle = stroke;
  if (strokeWidth !== undefined) ctx.lineWidth = strokeWidth;
  if (strokeOpacity !== undefined) ctx.globalAlpha *= strokeOpacity;
  applyDash(ctx, dashPattern);
};

const resolveFillStyle = (
  ctx: CanvasRenderingContext2D,
  fill: PaintValue | undefined,
  stroke: string | undefined,
  options: DrawOptions,
): string | CanvasGradient | CanvasPattern | undefined => {
  if (fill === undefined) return undefined;
  if (typeof fill === 'string') return fill;
  if (fill.kind === 'contextStroke') return stroke ?? String(ctx.strokeStyle);
  warnUnsupported(options, 'paint', `Canvas renderer does not support paint resource "${fill.id}" yet; fill is skipped.`);
  return undefined;
};

const fillCurrentPath = (
  ctx: CanvasRenderingContext2D,
  fill: PaintValue | undefined,
  stroke: string | undefined,
  fillOpacity: number | undefined,
  fillRule: CanvasFillRule | undefined,
  options: DrawOptions,
): void => {
  const fillStyle = resolveFillStyle(ctx, fill, stroke, options);
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
): void => {
  if (stroke === undefined) return;
  if (strokeOpacity !== undefined) ctx.save();
  applyStrokeStyle(ctx, stroke, strokeWidth, strokeOpacity, dashPattern);
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

const drawText = (ctx: CanvasRenderingContext2D, p: TextPrim): void => {
  ctx.font = `${p.fontStyle ? `${p.fontStyle} ` : ''}${p.fontWeight ? `${p.fontWeight} ` : ''}${p.fontSize}px ${p.fontFamily ?? 'sans-serif'}`;
  ctx.textAlign = p.align === 'middle' ? 'center' : p.align;
  ctx.textBaseline = p.baseline;
  if (p.fill !== undefined) ctx.fillStyle = p.fill;
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
      ctx.font = `${line.fontStyle ?? p.fontStyle ?? ''} ${line.fontWeight ?? p.fontWeight ?? ''} ${line.fontSize ?? p.fontSize}px ${line.fontFamily ?? p.fontFamily ?? 'sans-serif'}`.trim();
    }
    if (line.fill !== undefined) ctx.fillStyle = line.fill;
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

const drawPrim = (
  ctx: CanvasRenderingContext2D,
  p: ScenePrimitive,
  options: DrawOptions,
): void => {
  ctx.save();
  switch (p.type) {
    case 'rect':
      withOpacity(ctx, p.opacity, () => {
        roundedRectPath(ctx, p.x, p.y, p.width, p.height, p.cornerRadius);
        fillCurrentPath(ctx, p.fill, p.stroke, p.fillOpacity, undefined, options);
        strokeCurrentPath(ctx, p.stroke, p.strokeOpacity, p.strokeWidth, p.dashPattern);
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
        fillCurrentPath(ctx, p.fill, p.stroke, p.fillOpacity, undefined, options);
        strokeCurrentPath(ctx, p.stroke, p.strokeOpacity, p.strokeWidth, p.dashPattern);
        if (shouldRestore) ctx.restore();
      });
      break;
    case 'path':
      withOpacity(ctx, p.opacity, () => {
        if (p.arrowStart || p.arrowEnd) {
          warnUnsupported(options, 'marker', 'Canvas renderer does not support arrow markers yet; marker is skipped.');
        }
        buildPath(ctx, p.commands);
        if (p.strokeLinecap !== undefined) ctx.lineCap = p.strokeLinecap;
        if (p.strokeLinejoin !== undefined) ctx.lineJoin = p.strokeLinejoin;
        fillCurrentPath(ctx, p.fill, p.stroke, p.fillOpacity, p.fillRule, options);
        strokeCurrentPath(ctx, p.stroke, p.strokeOpacity, p.strokeWidth, p.dashPattern);
      });
      break;
    case 'text':
      withOpacity(ctx, p.opacity, () => drawText(ctx, p));
      break;
    case 'group':
      ctx.save();
      if (p.clipRef !== undefined) {
        warnUnsupported(options, 'clip', `Canvas renderer does not support clip resource "${p.clipRef}" yet; clip is skipped.`);
      }
      for (const transform of p.transforms ?? []) applyTransform(ctx, transform);
      for (const child of p.children) drawPrim(ctx, child, options);
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
  for (const primitive of scene.primitives) drawPrim(ctx, primitive, options);
};
