import { arcEndPoint } from '@retikz/math';

import type { Transform } from '../../../contract';
import type { IRPosition, IRStep, IRTarget } from '../../../schemas';
import type { NamespaceStack } from '../../namespace';

import { isRelativeAccumulateTargetLike, isRelativeTargetLike } from '../../../shared';
import { localPointOfTarget } from './target';

export const normalizePathSteps = (
  steps: ReadonlyArray<IRStep>,
  namespaceStack: NamespaceStack,
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
      if (prevEnd && typeof step.radius === 'number' && step.center === undefined) {
        prevEnd = arcEndPoint(prevEnd, step.radius, step.endAngle);
      }
      continue;
    }
    if (step.kind === 'rectangle') {
      out.push(step);
      // 自包含形状；prevEnd 不变（rectangle 用自身 from/to，不推进相对游标）
      continue;
    }
    if (step.kind === 'smooth') {
      // smooth 用 `points`（非 `to`，min(1) 保证非空）。逐点归一化 relative/relativeAccumulate：
      // 与 to 字段同款——relative（`+`）不推进 prevEnd、relativeAccumulate（`++`）推进；绝对点直接推进。
      const normalizedPoints: Array<IRTarget> = [];
      for (const original of step.points) {
        let resolvedPt: IRTarget = original;
        let updatePrevEnd = true;
        if (isRelativeTargetLike(original)) {
          const refLocal = prevEnd ?? [0, 0];
          resolvedPt = [refLocal[0] + original.relative[0], refLocal[1] + original.relative[1]];
          updatePrevEnd = false;
        } else if (isRelativeAccumulateTargetLike(original)) {
          const refLocal = prevEnd ?? [0, 0];
          resolvedPt = [refLocal[0] + original.relativeAccumulate[0], refLocal[1] + original.relativeAccumulate[1]];
        }
        normalizedPoints.push(resolvedPt);
        if (updatePrevEnd) {
          const pos = localPointOfTarget(resolvedPt, namespaceStack, scopeChain);
          if (pos) prevEnd = pos;
        }
      }
      out.push({ ...step, points: normalizedPoints });
      continue;
    }
    if (step.kind === 'generator') {
      out.push(step);
      // generator 产段终点要等编译期 generate 才知；预处理阶段以 step.to 近似推进 prevEnd（多数曲线收于 to），
      // 供后续相对定位。无 to 的纯参数曲线保守不推进（产段末端不可预知）。
      if (step.to !== undefined) {
        const pos = localPointOfTarget(step.to, namespaceStack, scopeChain);
        if (pos) prevEnd = pos;
      }
      continue;
    }

    if (step.kind === 'axis-line') {
      // 单轴投影依赖真实运行时笔位，必须留到 stroke emit 按声明顺序解析。
      out.push(step);
      continue;
    }

    // 有 to 字段的 step：move/line/step(fold)/curve/cubic/bend
    const original = step.to;
    let resolvedTo: IRTarget = original;
    let updatePrevEnd = true;

    if (isRelativeTargetLike(original)) {
      const refLocal = prevEnd ?? [0, 0];
      resolvedTo = [refLocal[0] + original.relative[0], refLocal[1] + original.relative[1]];
      updatePrevEnd = false;
    } else if (isRelativeAccumulateTargetLike(original)) {
      const refLocal = prevEnd ?? [0, 0];
      resolvedTo = [refLocal[0] + original.relativeAccumulate[0], refLocal[1] + original.relativeAccumulate[1]];
    }

    out.push({ ...step, to: resolvedTo });

    if (updatePrevEnd) {
      const pos = localPointOfTarget(resolvedTo, namespaceStack, scopeChain);
      if (pos) prevEnd = pos;
    }
  }

  return out;
};
