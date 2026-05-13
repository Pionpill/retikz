import { arcEndPoint } from '../../geometry/arc';
import type { IRPosition, IRStep, IRTarget } from '../../ir';
import type { NodeLayout } from '../node';
import { refPointOfTarget } from './anchor';

/**
 * relative/relativeAccumulate 目标解析为绝对 Position（step kind 不变，to 全为绝对坐标）
 * @description relative 不更新 prevEnd（TikZ `+`），relativeAccumulate 更新（TikZ `++`）。prevEnd 推进：有 to 的 kind 用 refPointOfTarget(to)；arc 用 arcEndPoint；circlePath/ellipsePath/cycle 不变。首步 relative 时 prevEnd 回退 [0,0]；解析失败保持原 step
 */
export const normalizeRelativeTargets = (
  steps: ReadonlyArray<IRStep>,
  nodeIndex: Map<string, NodeLayout>,
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
      if (prevEnd) {
        prevEnd = arcEndPoint(prevEnd, step.radius, step.endAngle);
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
      const ref = prevEnd ?? [0, 0];
      resolvedTo = [ref[0] + original.relative[0], ref[1] + original.relative[1]];
      updatePrevEnd = false;
    } else if (
      typeof original === 'object' &&
      !Array.isArray(original) &&
      'relativeAccumulate' in original
    ) {
      const ref = prevEnd ?? [0, 0];
      resolvedTo = [
        ref[0] + original.relativeAccumulate[0],
        ref[1] + original.relativeAccumulate[1],
      ];
      // updatePrevEnd 保持 true
    }

    out.push({ ...step, to: resolvedTo });

    if (updatePrevEnd) {
      const pos = refPointOfTarget(resolvedTo, nodeIndex);
      if (pos) prevEnd = pos;
    }
  }

  return out;
};
