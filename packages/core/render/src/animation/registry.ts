/**
 * 自定义 property 插值器注册表（兑现 ADR-01 预留口）
 * @description 内置通道（opacity/fill/stroke/strokeWidth/transform/pathDraw/viewBox）由各后端内建处理；
 *   自定义通道（如 blur）由用户经 `RenderOptions.animationProperties` 注册：`interpolate` 喂 evaluateTrack 求值、
 *   `applyCanvas` 把值落到 ctx。未注册的自定义 property → 后端 warn + skip（渲染 base）。
 */
import type { ScenePrimitive } from '@retikz/core';

/** 单个自定义 property 的插值 + Canvas 应用定义 */
export type AnimationPropertyDefinition = {
  /** 两关键帧值 + 段进度 → 当下值（喂给 evaluateTrack 的 interpolateCustom） */
  interpolate: (from: unknown, to: unknown, t: number) => unknown;
  /** 把当下值应用到 Canvas context（绘制该 prim 前调用；在 ctx.save/restore 作用域内） */
  applyCanvas: (ctx: CanvasRenderingContext2D, prim: ScenePrimitive, value: unknown) => void;
};

/** 自定义 property 注册表：property 名 → 定义 */
export type AnimationPropertyRegistry = Record<string, AnimationPropertyDefinition>;
