import { arcEndPoint } from '../../geometry/arc';
import type { IRPosition, IRStep, IRTarget } from '../../ir';
import type { Transform } from '../../primitive';
import type { NameStack } from '../name-stack';
import { inverseTransformChain } from '../scope';
import { refPointOfTarget } from './anchor';

/**
 * relative/relativeAccumulate 目标解析为绝对 Position（step kind 不变，to 为局部坐标 tuple）
 * @description relative 不更新 prevEnd（TikZ `+`），relativeAccumulate 更新（TikZ `++`）。prevEnd 推进：有 to 的 kind 用 refPointOfTarget(to)；arc 用 arcEndPoint；circlePath/ellipsePath/cycle 不变。首步 relative 时 prevEnd 回退 [0,0]；解析失败保持原 step。
 *   prevEnd 始终是全局坐标系下的 cursor；relative 形态 `[dx, dy]` 在**当前 scope 局部度量**——
 *   先反向投影 prevEnd 到 scope 局部 + 加 (dx, dy) 得局部 tuple，写回 step.to。下游
 *   `refPointOfTarget` / `clipForTarget` 把 tuple 视作 scope 局部字面量，统一 `applyTransformChain` 投回全局——
 *   relative 分支只负责"折算到局部"，不能在此处提前投影到全局，否则与下游 chain apply 形成 double-apply。
 *   `scopeChain=[]` 时 inverse 恒等，等价 v0.1 行为。
 */
export const normalizeRelativeTargets = (
  steps: ReadonlyArray<IRStep>,
  nameStack: NameStack,
  scopeChain: ReadonlyArray<Transform> = [],
): Array<IRStep> => {
  let prevEnd: IRPosition | null = null;
  const out: Array<IRStep> = [];

  for (const step of steps) {
    if (step.kind === 'cycle') {
      out.push(step);
      // prevEnd 不变
      continue;
    }
    if (step.kind === 'circlePath' || step.kind === 'ellipsePath') {
      out.push(step);
      // prevEnd 不变（笔位回圆心 = prevEnd 本身）
      continue;
    }
    if (step.kind === 'arc') {
      out.push(step);
      // 仅「正圆弧 + 圆心取游标」更新 prevEnd（原行为）；椭圆弧 / 显式 center 保守不变
      if (prevEnd && step.radius !== undefined && step.center === undefined) {
        prevEnd = arcEndPoint(prevEnd, step.radius, step.endAngle);
      }
      continue;
    }
    if (step.kind === 'rectangle') {
      out.push(step);
      // 自包含形状；prevEnd 不变（rectangle 用自身 from/to，不推进相对游标）
      continue;
    }
    if (step.kind === 'generator') {
      out.push(step);
      // generator 产段终点要等编译期 generate 才知；预处理阶段以 step.to 近似推进 prevEnd（多数曲线收于 to），
      // 供后续相对定位。无 to 的纯参数曲线保守不推进（产段末端不可预知）。
      if (step.to !== undefined) {
        const pos = refPointOfTarget(step.to, nameStack, scopeChain);
        if (pos) prevEnd = pos;
      }
      continue;
    }

    // 有 to 字段的 step：move/line/step(fold)/curve/cubic/bend
    const original = step.to;
    let resolvedTo: IRTarget = original;
    let updatePrevEnd = true;

    if (
      typeof original === 'object' &&
      !Array.isArray(original) &&
      'relative' in original
    ) {
      // prevEnd 全局 → 反向投影到当前 scope 局部 + 加 relative 部分（局部度量）= 局部 tuple；
      // 下游 refPointOfTarget / clipForTarget 把 tuple 当 scope 局部字面量再 applyTransformChain 投全局
      const refGlobal = prevEnd ?? [0, 0];
      const refLocal =
        scopeChain.length === 0
          ? refGlobal
          : inverseTransformChain(refGlobal, scopeChain);
      resolvedTo = [
        refLocal[0] + original.relative[0],
        refLocal[1] + original.relative[1],
      ];
      updatePrevEnd = false;
    } else if (
      typeof original === 'object' &&
      !Array.isArray(original) &&
      'relativeAccumulate' in original
    ) {
      const refGlobal = prevEnd ?? [0, 0];
      const refLocal =
        scopeChain.length === 0
          ? refGlobal
          : inverseTransformChain(refGlobal, scopeChain);
      resolvedTo = [
        refLocal[0] + original.relativeAccumulate[0],
        refLocal[1] + original.relativeAccumulate[1],
      ];
      // updatePrevEnd 保持 true：refPointOfTarget 把 tuple 当局部，apply chain 投全局后存为 prevEnd
    }

    out.push({ ...step, to: resolvedTo });

    if (updatePrevEnd) {
      const pos = refPointOfTarget(resolvedTo, nameStack, scopeChain);
      if (pos) prevEnd = pos;
    }
  }

  return out;
};
