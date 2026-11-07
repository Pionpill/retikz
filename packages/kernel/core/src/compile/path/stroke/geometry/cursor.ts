import type { PropertyPath } from '@retikz/foundation';

import type { Transform } from '../../../../contract';
import type { CanonicalPathStep } from '../../../../resolve';
import type { IRPosition, IRTarget } from '../../../../schemas';
import { BuiltinCompileWarningCode } from '../../../shared';
import { pointOfTarget } from '../../target';
import type { PathTargetView } from '../../types';
import type { StrokeTargetStep } from './helpers';
import { isStrokeTargetStep, nodeIdFromResolvableTarget } from './helpers';

/** 最近一个可用 path step 及其预解析 anchor */
export type StrokePreviousTarget = {
  /** 具有普通 `to` 目标的前驱 step */
  step: StrokeTargetStep;
  /** 前驱目标的几何参考点 */
  anchor: IRPosition;
};

/** 创建 stroke cursor 所需的目标解析上下文 */
type InputStrokeCursor = {
  /** 已归一化的 path steps */
  steps: Array<CanonicalPathStep>;
  /** compile 目标绑定阶段绑定的 target view */
  targetView: PathTargetView;
  /** 当前 scope 的累积变换链 */
  scopeChain: ReadonlyArray<Transform>;
  /** path warning 收集器 */
  warn: (code: string, message: string, subPath?: PropertyPath) => void;
};

/**
 * path stroke step 循环共享的游标
 * @description 初始化时按声明顺序预解析普通目标 anchor；循环推进只消费当前索引的前一个 step
 */
export class StrokeCursor {
  /** axis-line 激活后的相对坐标基线；null 表示继续使用预归一化结果 */
  relativeBaseline: IRPosition | null = null;
  /** 当前编译持有的步骤数组，运行时目标求值会更新其中的步骤 */
  private readonly steps: Array<CanonicalPathStep>;
  /** 与步骤同下标的预解析目标 anchor */
  private readonly anchors: Array<IRPosition | null>;
  /** 最近一个具有普通目标的前驱步骤下标 */
  private lastTargetIndex = -1;
  /** 最近 move 的原始目标，供 cycle 闭合 */
  private moveTarget: IRTarget | null = null;
  /** 特殊形状留给后续步骤的笔位覆盖 */
  private penOverride: IRPosition | null = null;

  /** 使用已绑定的目标预解析 anchor，不再访问 namespace 或 provider */
  constructor({ steps, targetView, scopeChain, warn }: InputStrokeCursor) {
    this.steps = steps;
    this.anchors = steps.map((step, index) => {
      if (!isStrokeTargetStep(step)) return null;

      const anchor = pointOfTarget(step.to, targetView, scopeChain);
      const targetId = nodeIdFromResolvableTarget(step.to);
      if (!anchor && targetId !== undefined) {
        warn(
          BuiltinCompileWarningCode.UnresolvedNodeReference,
          `Step.to references undefined node id '${targetId}'; the entire path is skipped`,
          ['children', index, 'to'],
        );
      }

      return anchor;
    });
  }

  /** 只消费当前索引的前一个 step，推进 previous 与最近 move */
  advance(index: number): void {
    if (index <= 0) return;

    const previousStep = this.steps[index - 1];
    if (isStrokeTargetStep(previousStep)) this.lastTargetIndex = index - 1;
    if (previousStep.kind === 'move') this.moveTarget = previousStep.to;
  }

  /** 读取最近一个有效目标 step，不包含当前 step */
  previous(): StrokePreviousTarget | null {
    if (this.lastTargetIndex === -1) return null;

    const step = this.steps[this.lastTargetIndex];
    if (!isStrokeTargetStep(step)) return null;

    const anchor = this.anchors[this.lastTargetIndex];
    if (!anchor) return null;

    return { step, anchor };
  }

  /** 读取指定 step 预解析后的目标 anchor */
  anchorAt(index: number): IRPosition | null {
    return this.anchors[index] ?? null;
  }

  /** 用运行时解析结果替换指定 target step 与 anchor */
  setTargetAt(index: number, step: StrokeTargetStep, anchor: IRPosition): void {
    this.steps[index] = step;
    this.anchors[index] = anchor;
  }

  /** 读取最近 move 的原始目标，供 cycle 闭合 */
  lastMoveTarget(): IRTarget | null {
    return this.moveTarget;
  }

  /** 读取但不消费特殊形状留下的笔位覆盖 */
  getPenOverride(): IRPosition | null {
    return this.penOverride;
  }

  /** 读取并清空特殊形状留下的笔位覆盖 */
  takePenOverride(): IRPosition | null {
    const point = this.penOverride;
    this.penOverride = null;
    return point;
  }

  /** 覆盖特殊形状留给后续 step 的笔位 */
  setPenOverride(point: IRPosition | null): void {
    this.penOverride = point;
  }

  /** 清空笔位覆盖 */
  clearPenOverride(): void {
    this.penOverride = null;
  }
}
