import type { PathCommand, SceneClipPath, Transform } from '@retikz/core';

import { commandArcStart } from '../shared';

/** 将角度值换算为 Canvas 弧度值的倍率 */
export const DEG_TO_RAD = Math.PI / 180;

/**
 * 重建当前 Canvas 路径为矩形或圆角矩形，不执行填充和描边
 * @param radius 圆角半径；省略时为 0，最大取宽高绝对值的一半
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
  ctx.arc(right - r, y + r, r, -Math.PI / 2, 0);
  ctx.lineTo(right, bottom - r);
  ctx.arc(right - r, bottom - r, r, 0, Math.PI / 2);
  ctx.lineTo(x + r, bottom);
  ctx.arc(x + r, bottom - r, r, Math.PI / 2, Math.PI);
  ctx.lineTo(x, y + r);
  ctx.arc(x + r, y + r, r, Math.PI, (Math.PI * 3) / 2);
  ctx.closePath();
};

/** 把一条场景路径命令追加到当前 Canvas 路径，角度统一换算为弧度 */
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

/** 重放结构化路径，并让 inactive subpath 上的弧从其声明起点开始 */
const replayPathCommands = (ctx: CanvasRenderingContext2D, commands: ReadonlyArray<PathCommand>): void => {
  let activeSubpath = false;

  for (const command of commands) {
    if ((command.kind === 'arc' || command.kind === 'ellipseArc') && !activeSubpath) {
      const start = commandArcStart(command);
      ctx.moveTo(start[0], start[1]);
    }

    pathCommand(ctx, command);
    activeSubpath = command.kind !== 'close';
  }
};

/** 清空当前 Canvas 路径并依次重放命令；无活动子路径的弧先定位到声明起点 */
export const buildPath = (ctx: CanvasRenderingContext2D, commands: ReadonlyArray<PathCommand>): void => {
  ctx.beginPath();
  replayPathCommands(ctx, commands);
};

/** 在当前 Canvas 变换上叠加平移、旋转或缩放，不保存或恢复上下文 */
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

/** 用裁剪资源的命令重建当前 Canvas 路径，尚不改变裁剪区域 */
export const buildClipPath = (ctx: CanvasRenderingContext2D, path: SceneClipPath): void => {
  ctx.beginPath();
  replayPathCommands(ctx, path.commands);
};

/** 用指定填充规则将裁剪路径与当前 Canvas 裁剪区域相交 */
export const applyClip = (ctx: CanvasRenderingContext2D, path: SceneClipPath): void => {
  buildClipPath(ctx, path);
  ctx.clip(path.fillRule);
};
