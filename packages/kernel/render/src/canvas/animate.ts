/**
 * Canvas 逐帧动画应用：给时刻 t，把一个 prim 的 tracks 求值并落到 ctx / 返回带覆盖值的 prim
 * @description 内置通道：opacity/fill/stroke/strokeWidth → 覆盖 prim 字段（绝对展示值）；transform → 绕
 *   origin 支点 ctx.translate/rotate/scale；pathDraw → stroke-dashoffset 揭示（dashPattern 覆盖 + lineDashOffset）；
 *   viewBox 是 scene 根镜头，不在元素级处理
 */
import type { ScenePrimitive } from '@retikz/core';
import { AnimationProperty } from '@retikz/core';

import { animationSkipReason, evaluateTrack, isAutoplayTrigger, resolveTransformOrigin } from '../animation';
import { commandEndpoint } from '../shared';
import { DEG_TO_RAD } from './path-geometry';

/** 应用动画所需的子集选项 */
export type AnimateContext = {
  /** 报告跳过或无法完整执行的动画能力 */
  warn: (message: string) => void;
  /** 是否施加非自动播（manual / visible / onEvent）track（per-id 激活时为 true；缺省仅自动播） */
  includeNonAutoplay?: boolean;
};

const dist = (a: [number, number], b: [number, number]): number => Math.hypot(a[0] - b[0], a[1] - b[1]);

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
      prev = commandEndpoint(cmd);
      continue;
    }

    const end = commandEndpoint(cmd);
    if (end === null) continue;
    if (prev && cmd.kind !== 'move') len += dist(prev, end);
    prev = end;
  }

  return len;
};

/**
 * 给时刻 time 把 prim 的 tracks 应用到 ctx，返回带覆盖值的 prim（无覆盖则原样返回）
 * @description ctx 变更（transform / lineDashOffset）须在 caller 的 ctx.save/restore 作用域内调用
 */
export const applyPrimAnimations = (
  ctx: CanvasRenderingContext2D,
  prim: ScenePrimitive,
  time: number,
  context: AnimateContext,
): ScenePrimitive => {
  const overrides: Record<string, unknown> = {};
  let groupOpacity: number | undefined;

  for (const track of prim.animations ?? []) {
    // 按 trigger 过滤：默认只施加 auto（load/缺省）track；manual / onEvent / visible 仅在该 id 被 per-id 激活时播
    if (!isAutoplayTrigger(track) && !context.includeNonAutoplay) continue;

    const reason = animationSkipReason(prim, track);
    if (reason !== undefined) {
      context.warn(`Canvas animation: ${reason}; skipping (rendering base).`);
      continue;
    }

    const result = evaluateTrack(track, time);
    if (!result) continue;

    const value = result.value;

    switch (track.property) {
      case AnimationProperty.Opacity:
        if (prim.type === 'group') groupOpacity = Number(value);
        else overrides.opacity = Number(value);
        break;
      case AnimationProperty.Fill:
        overrides.fill = value;
        break;
      case AnimationProperty.Stroke:
        overrides.stroke = value;
        break;
      case AnimationProperty.FillOpacity:
        overrides.fillOpacity = Number(value);
        break;
      case AnimationProperty.StrokeOpacity:
        overrides.strokeOpacity = Number(value);
        break;
      case AnimationProperty.DashOffset:
        overrides.dashOffset = Number(value);
        break;
      case AnimationProperty.StrokeWidth:
        overrides.strokeWidth = Number(value);
        break;
      case AnimationProperty.TranslateX:
        ctx.translate(Number(value), 0);
        break;
      case AnimationProperty.TranslateY:
        ctx.translate(0, Number(value));
        break;
      case AnimationProperty.Rotate:
      case AnimationProperty.Scale:
      case AnimationProperty.ScaleX:
      case AnimationProperty.ScaleY: {
        const [ox, oy] = resolveTransformOrigin(prim, track.origin) ?? [0, 0];
        ctx.translate(ox, oy);
        if (track.property === AnimationProperty.Rotate) ctx.rotate(Number(value) * DEG_TO_RAD);
        else if (track.property === AnimationProperty.ScaleX) ctx.scale(Number(value), 1);
        else if (track.property === AnimationProperty.ScaleY) ctx.scale(1, Number(value));
        else ctx.scale(Number(value), Number(value));

        ctx.translate(-ox, -oy);
        break;
      }
      case AnimationProperty.PathDraw: {
        const v = Number(value);

        // 完全揭示（settled）时不加 dash override，渲染完整 base 描边——approxLength 对曲线低估时，
        // dashPattern=[len] 会让真实弧长尾部 (len, trueLen] 落进 gap、留永久缺口；v≥1 直接走 base 即可。
        if (v >= 1) break;
        const len = approxLength(prim);
        overrides.dashPattern = [len];
        overrides.dashOffset = len * (1 - v);
        ctx.lineDashOffset = len * (1 - v);
        break;
      }
    }
  }

  if (groupOpacity !== undefined) ctx.globalAlpha *= groupOpacity;
  return Object.keys(overrides).length > 0 ? { ...prim, ...overrides } : prim;
};
