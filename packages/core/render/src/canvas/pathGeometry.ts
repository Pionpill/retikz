import type { ClipShape, PathCommand } from '@retikz/core';

/** 角度转弧度系数（canvas 角度用弧度、Scene 用度） */
export const DEG_TO_RAD = Math.PI / 180;

/**
 * 在当前 context 上构建圆角矩形路径（cornerRadius 缺省或 ≤0 退化为直角 rect）
 * @description radius 上限钳到宽 / 高的一半，四角用二次贝塞尔逼近；drawScene 填充 / 描边与 hitTest 点测共用。
 */
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
  ctx.quadraticCurveTo(right, y, right, y + r);
  ctx.lineTo(right, bottom - r);
  ctx.quadraticCurveTo(right, bottom, right - r, bottom);
  ctx.lineTo(x + r, bottom);
  ctx.quadraticCurveTo(x, bottom, x, bottom - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
};

/**
 * 把单条 PathCommand 翻译成 canvas 路径调用（不含 beginPath，供 buildPath 串联）
 * @description arc/ellipseArc 的角度按度转弧度；counterClockwise 缺省时按 end<start 推断扫描方向，与 SVG sweep-flag 一致。
 */
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
        // counterClockwise 缺省时按角度顺序推断扫描方向（endAngle < startAngle = 逆时针），与 SVG sweep-flag 一致；
        // 否则 ctx.arc 对 end<start 会绕远（如 0→-30 画成 330°）
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

/** 在当前 context 上把整条 path commands 构建为路径（含 beginPath）；填充 / 描边 / 点测共用 */
export const buildPath = (ctx: CanvasRenderingContext2D, commands: ReadonlyArray<PathCommand>): void => {
  ctx.beginPath();
  for (const command of commands) pathCommand(ctx, command);
};

/** 按裁剪形状构建路径并 ctx.clip()（坐标在 group 局部帧，须在 group transform 之后调用） */
export const applyClip = (ctx: CanvasRenderingContext2D, shape: ClipShape): void => {
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
