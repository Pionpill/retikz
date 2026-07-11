import type { Transform } from '../../../contract';
import type { IRPosition, IRStep, IRTarget } from '../../../schemas';
import type { NamespaceStack } from '../../namespace';

import { CompileWarningCode } from '../../constants';
import { nodeIdFromResolvableTarget } from '../../position';
import { refPointOfTarget } from '../host/target';

/** 具有普通目标点、可作为后续 step 前驱的 path step。 */
export type StrokeTargetStep = Exclude<
  IRStep,
  | { kind: 'cycle' }
  | { kind: 'arc' }
  | { kind: 'circlePath' }
  | { kind: 'ellipsePath' }
  | { kind: 'rectangle' }
  | { kind: 'smooth' }
  | { kind: 'generator' }
>;

/** 最近一个可用 path step 及其预解析 anchor。 */
export type StrokePreviousTarget = {
  /** 具有普通 `to` 目标的前驱 step。 */
  step: StrokeTargetStep;
  /** 前驱目标的几何参考点。 */
  anchor: IRPosition;
};

/** path stroke step 循环共享的游标状态。 */
export type StrokeCursor = {
  /** 只消费当前索引的前一个 step，推进 previous 与最近 move。 */
  advance: (index: number) => void;
  /** 读取最近一个有效目标 step，不包含当前 step。 */
  previous: () => StrokePreviousTarget | null;
  /** 读取指定 step 预解析后的目标 anchor。 */
  anchorAt: (index: number) => IRPosition | null;
  /** 读取最近 move 的原始目标，供 cycle 闭合。 */
  lastMoveTarget: () => IRTarget | null;
  /** 读取但不消费特殊形状留下的笔位覆盖。 */
  getPenOverride: () => IRPosition | null;
  /** 读取并清空特殊形状留下的笔位覆盖。 */
  takePenOverride: () => IRPosition | null;
  /** 覆盖特殊形状留给后续 step 的笔位。 */
  setPenOverride: (point: IRPosition | null) => void;
  /** 清空笔位覆盖。 */
  clearPenOverride: () => void;
};

/** 创建 stroke cursor 所需的目标解析上下文。 */
export type CreateStrokeCursorInput = {
  /** 已归一化的 path steps。 */
  steps: Array<IRStep>;
  /** id 查询栈。 */
  namespaceStack: NamespaceStack;
  /** 当前 scope 的累积变换链。 */
  scopeChain: ReadonlyArray<Transform>;
  /** path warning 收集器。 */
  warn: (code: string, message: string, subPath?: string) => void;
};

/** 判断 step 是否具有普通 `to` 目标。 */
const hasTarget = (step: IRStep): step is StrokeTargetStep =>
  step.kind !== 'cycle' &&
  step.kind !== 'arc' &&
  step.kind !== 'circlePath' &&
  step.kind !== 'ellipsePath' &&
  step.kind !== 'rectangle' &&
  step.kind !== 'smooth' &&
  step.kind !== 'generator';

/**
 * 创建 path stroke step 游标。
 * @description 初始化时按声明顺序预解析普通目标 anchor；循环推进只消费当前索引的前一个 step。
 */
export const createStrokeCursor = ({
  steps,
  namespaceStack,
  scopeChain,
  warn,
}: CreateStrokeCursorInput): StrokeCursor => {
  const anchors: Array<IRPosition | null> = steps.map((step, index) => {
    if (!hasTarget(step)) return null;
    const anchor = refPointOfTarget(step.to, namespaceStack, scopeChain);
    const targetId = nodeIdFromResolvableTarget(step.to);
    if (!anchor && targetId !== undefined) {
      warn(
        CompileWarningCode.UnresolvedNodeReference,
        `Step.to references undefined node id '${targetId}'; the entire path is skipped`,
        `children[${index}].to`,
      );
    }
    return anchor;
  });

  let lastTargetIndex = -1;
  let lastMoveTarget: IRTarget | null = null;
  let penOverride: IRPosition | null = null;

  const advance = (index: number): void => {
    if (index <= 0) return;
    const previousStep = steps[index - 1];
    if (hasTarget(previousStep)) lastTargetIndex = index - 1;
    if (previousStep.kind === 'move') lastMoveTarget = previousStep.to;
  };

  const previous = (): StrokePreviousTarget | null => {
    if (lastTargetIndex === -1) return null;
    const step = steps[lastTargetIndex];
    if (!hasTarget(step)) return null;
    const anchor = anchors[lastTargetIndex];
    if (!anchor) return null;
    return { step, anchor };
  };

  return {
    advance,
    previous,
    anchorAt: index => anchors[index] ?? null,
    lastMoveTarget: () => lastMoveTarget,
    getPenOverride: () => penOverride,
    takePenOverride: () => {
      const point = penOverride;
      penOverride = null;
      return point;
    },
    setPenOverride: point => {
      penOverride = point;
    },
    clearPenOverride: () => {
      penOverride = null;
    },
  };
};
