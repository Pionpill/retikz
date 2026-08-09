import type { ClipShape, PathCommand, Transform } from '@retikz/core';

export const DEG_TO_RAD = Math.PI / 180;

export const roundedRectPath = (
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
  ctx.arc(right - r, y + r, r, -Math.PI / 2, 0);
  ctx.lineTo(right, bottom - r);
  ctx.arc(right - r, bottom - r, r, 0, Math.PI / 2);
  ctx.lineTo(x + r, bottom);
  ctx.arc(x + r, bottom - r, r, Math.PI / 2, Math.PI);
  ctx.lineTo(x, y + r);
  ctx.arc(x + r, y + r, r, Math.PI, (Math.PI * 3) / 2);
  ctx.closePath();
};

export const pathCommand = (ctx: CanvasRenderingContext2D, command: PathCommand): void => {
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
        command.counterClockwise ?? command.endAngle < command.startAngle,
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
        command.counterClockwise ?? command.endAngle < command.startAngle,
      );
      break;
  }
};

export const buildPath = (ctx: CanvasRenderingContext2D, commands: ReadonlyArray<PathCommand>): void => {
  ctx.beginPath();
  for (const command of commands) pathCommand(ctx, command);
};

export const applyTransform = (ctx: CanvasRenderingContext2D, transform: Transform): void => {
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

export const buildClipPath = (ctx: CanvasRenderingContext2D, shape: ClipShape): void => {
  ctx.beginPath();
  const append = (s: ClipShape): void => {
    switch (s.kind) {
      case 'rect':
        ctx.rect(s.x, s.y, s.width, s.height);
        break;
      case 'circle':
        ctx.arc(s.cx, s.cy, s.r, 0, Math.PI * 2);
        break;
      case 'ellipse':
        ctx.ellipse(s.cx, s.cy, s.rx, s.ry, 0, 0, Math.PI * 2);
        break;
      case 'polygon':
        s.points.forEach((pt, i) => (i === 0 ? ctx.moveTo(pt[0], pt[1]) : ctx.lineTo(pt[0], pt[1])));
        ctx.closePath();
        break;
      case 'path':
        for (const command of s.commands) pathCommand(ctx, command);
        break;
      case 'compound':
        for (const child of s.children) append(child);
        break;
    }
  };
  append(shape);
};

const clipFillRule = (shape: ClipShape): CanvasFillRule | undefined =>
  shape.kind === 'path' || shape.kind === 'compound' ? shape.fillRule : undefined;

export const applyClip = (ctx: CanvasRenderingContext2D, shape: ClipShape): void => {
  buildClipPath(ctx, shape);
  const fillRule = clipFillRule(shape);
  if (fillRule === undefined) ctx.clip();
  else ctx.clip(fillRule);
};
