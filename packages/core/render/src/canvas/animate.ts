/**
 * Canvas 逐帧动画应用：给时刻 t，把一个 prim 的 tracks 求值并落到 ctx / 返回带覆盖值的 prim
 * @description 内置通道：opacity/fill/stroke/strokeWidth → 覆盖 prim 字段（绝对展示值）；transform → 绕
 *   origin 支点 ctx.translate/rotate/scale；pathDraw → stroke-dashoffset 揭示（dashPattern 覆盖 + lineDashOffset）；
 *   自定义通道 → 注册表 interpolate + applyCanvas，未注册 warn+skip。viewBox 是 scene 根镜头、不在元素级。
 */
import { AnimationProperty, type PathCommand, type ScenePrimitive } from '@retikz/core';
import { classifyProperty, isAutoplayTrigger, primHasStroke, resolveTransformOrigin } from '../animation/channels';
import { evaluateTrack } from '../animation/evaluate';
import type { EasingRegistry } from '../animation/types';
import type { AnimationPropertyRegistry } from '../animation/registry';
import { DEG_TO_RAD } from './pathGeometry';

/** 应用动画所需的子集选项 */
export type AnimateContext = {
  easings?: EasingRegistry;
  animationProperties?: AnimationPropertyRegistry;
  warn: (message: string) => void;
  /** 是否施加非自动播（manual / visible / onEvent）track（per-id 激活时为 true；缺省仅自动播） */
  includeNonAutoplay?: boolean;
};

const dist = (a: [number, number], b: [number, number]): number => Math.hypot(a[0] - b[0], a[1] - b[1]);

/** 单条 PathCommand 末端 endpoint（弧用极坐标末点；close 无端点） */
const commandEnd = (cmd: PathCommand): [number, number] | null => {
  switch (cmd.kind) {
    case 'move':
    case 'line':
    case 'quad':
    case 'cubic':
      return [cmd.to[0], cmd.to[1]];
    case 'arc':
      return [cmd.center[0] + Math.cos(cmd.endAngle * DEG_TO_RAD) * cmd.radius, cmd.center[1] + Math.sin(cmd.endAngle * DEG_TO_RAD) * cmd.radius];
    case 'ellipseArc':
      return [cmd.center[0] + Math.cos(cmd.endAngle * DEG_TO_RAD) * cmd.radiusX, cmd.center[1] + Math.sin(cmd.endAngle * DEG_TO_RAD) * cmd.radiusY];
    case 'close':
      return null;
  }
};

/** 近似路径总弧长（pathDraw 揭示用）：path 累加弦长、arc 用弧长、rect/ellipse 用周长 */
const approxLength = (prim: ScenePrimitive): number => {
  if (prim.type === 'rect') return 2 * (Math.abs(prim.width) + Math.abs(prim.height));
  if (prim.type === 'ellipse') {
    const a = prim.rx;
    const b = prim.ry;
    return Math.PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b)));
  }
  if (prim.type !== 'path') return 0;
  let len = 0;
  let prev: [number, number] | null = null;
  for (const cmd of prim.commands) {
    if (cmd.kind === 'close') continue;
    if (cmd.kind === 'arc') {
      len += cmd.radius * Math.abs((cmd.endAngle - cmd.startAngle) * DEG_TO_RAD);
      prev = commandEnd(cmd);
      continue;
    }
    const end = commandEnd(cmd);
    if (end === null) continue;
    if (prev && cmd.kind !== 'move') len += dist(prev, end);
    prev = end;
  }
  return len;
};

const asNumber = (value: unknown): number => (typeof value === 'number' ? value : Number(value));

/**
 * 给时刻 time 把 prim 的 tracks 应用到 ctx，返回带覆盖值的 prim（无覆盖则原样返回）
 * @description ctx 变更（transform / lineDashOffset）须在 caller 的 ctx.save/restore 作用域内调用。
 */
export const applyPrimAnimations = (
  ctx: CanvasRenderingContext2D,
  prim: ScenePrimitive,
  time: number,
  context: AnimateContext,
): ScenePrimitive => {
  const overrides: Record<string, unknown> = {};
  for (const track of prim.animations ?? []) {
    // 按 trigger 过滤：默认只施加 auto（load/缺省）track；manual / onEvent / visible 仅在该 id 被 per-id 激活时播
    if (!isAutoplayTrigger(track) && !context.includeNonAutoplay) continue;
    const cls = classifyProperty(track.property);
    if (cls === 'custom') {
      const def = context.animationProperties?.[track.property];
      if (!def) {
        context.warn(`Canvas animation: custom property "${track.property}" is not registered; skipping (rendering base).`);
        continue;
      }
      const result = evaluateTrack(track, time, { easings: context.easings, interpolateCustom: def.interpolate });
      if (result) def.applyCanvas(ctx, prim, result.value);
      continue;
    }
    if (cls === 'viewBox') continue; // 元素级 viewBox 由 compile drop，这里防御性跳过
    if (cls === 'pathDraw' && !primHasStroke(prim)) {
      context.warn('Canvas animation: pathDraw requires a stroked element; skipping (rendering base).');
      continue;
    }
    const result = evaluateTrack(track, time, { easings: context.easings });
    if (!result) continue;
    const value = result.value;
    switch (track.property) {
      case AnimationProperty.Opacity:
        overrides.opacity = asNumber(value);
        break;
      case AnimationProperty.Fill:
        overrides.fill = value;
        break;
      case AnimationProperty.Stroke:
        overrides.stroke = value;
        break;
      case AnimationProperty.StrokeWidth:
        overrides.strokeWidth = asNumber(value);
        break;
      case AnimationProperty.TranslateX:
        ctx.translate(asNumber(value), 0);
        break;
      case AnimationProperty.TranslateY:
        ctx.translate(0, asNumber(value));
        break;
      case AnimationProperty.Rotate:
      case AnimationProperty.Scale:
      case AnimationProperty.ScaleX:
      case AnimationProperty.ScaleY: {
        const [ox, oy] = resolveTransformOrigin(prim, track.origin) ?? [0, 0];
        ctx.translate(ox, oy);
        if (track.property === AnimationProperty.Rotate) ctx.rotate(asNumber(value) * DEG_TO_RAD);
        else if (track.property === AnimationProperty.ScaleX) ctx.scale(asNumber(value), 1);
        else if (track.property === AnimationProperty.ScaleY) ctx.scale(1, asNumber(value));
        else ctx.scale(asNumber(value), asNumber(value));
        ctx.translate(-ox, -oy);
        break;
      }
      case AnimationProperty.PathDraw: {
        const len = approxLength(prim);
        overrides.dashPattern = [len];
        ctx.lineDashOffset = len * (1 - asNumber(value));
        break;
      }
    }
  }
  return Object.keys(overrides).length > 0 ? ({ ...prim, ...overrides }) : prim;
};
