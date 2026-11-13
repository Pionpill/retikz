import type { PropertyPath } from '@retikz/foundation';
import { formatPropertyPath } from '@retikz/foundation';
import { isFinitePoint } from '@retikz/math';

import { RetikzCoreError, RetikzCoreErrorCode } from '../../../../error';
import type { PathResolution, CanonicalPathStep } from '../../../../resolve';
import type { IRPosition } from '../../../../schemas';
import { BuiltinCompileWarningCode } from '../../../shared';
import { pointOfTarget } from '../../target';
import type { StrokePathCompileContext } from '../types';
import { PathCommandEmitter } from './commands';
import { StrokeCursor } from './cursor';
import { applyRoundedCorners } from './rounded-corners';
import type { StrokeCornerSpan } from './rounded-corners';
import { isStrokeSegmentStep, lowerSegmentStep } from './segments';
import { isStrokeShapeStep, lowerShapeStep } from './shapes';
import { evaluateStrokeStep } from './step';

/** 将路径步骤转换为共享的几何命令与采样数据 */
export const lowerStrokePathGeometry = (resolution: PathResolution, context: StrokePathCompileContext) => {
  const { targetView, options: pathEmitOptions = {} } = context;
  const { canon: path, irPath } = resolution;
  const canonicalSteps = path.children ?? [];

  const warn = (code: string, message: string, subPath: PropertyPath = []): void => {
    pathEmitOptions.onWarn?.({ code, message, path: [...irPath, ...subPath] });
  };

  const scopeChain = pathEmitOptions.scopeChain ?? [];

  // relative/relativeAccumulate target 已由 compile 目标绑定阶段绑定为当前 scope 的局部坐标
  const steps = [...canonicalSteps];

  // 自包含 shape step（rectangle 自带 from/to 两对角、不依赖游标）单独成 path 合法；其余 step 至少需要起点和一段绘制
  const soloSelfContained = steps.length === 1 && steps[0].kind === 'rectangle';
  if (steps.length < 2 && !soloSelfContained) {
    if (path.marks?.length)
      throw new RetikzCoreError(
        RetikzCoreErrorCode.Compile,
        `Cannot locate marks on an empty path at ${formatPropertyPath(irPath)}.marks`,
      );
    warn(
      BuiltinCompileWarningCode.PathTooShort,
      `Path requires at least 2 steps (got ${steps.length}); the entire path is skipped`,
      ['children'],
    );
    return null;
  }

  const cursor = new StrokeCursor({
    steps,
    targetView,
    scopeChain,
    warn,
  });

  const commandEmitter = new PathCommandEmitter(value => value);
  const { commands, provenance, stepIndexes, boundsPoints, endpointSource } = commandEmitter;

  for (let i = 0; i < steps.length; i++) {
    cursor.advance(i);

    let step = steps[i];
    const originalStep = canonicalSteps[i];
    commandEmitter.beginStep(i, step.kind);

    step = evaluateStrokeStep(step, originalStep, i, { cursor, targetView, scopeChain });

    // move 自身不绘制；其 to 仅供下个绘制段的 findPrev 引用
    // 显式 move 开启新游标，必须切断 arc/circle/ellipse/rectangle 留给下一绘制段的 penOverride
    if (step.kind === 'move') {
      cursor.clearPenOverride();
      continue;
    }

    if (isStrokeShapeStep(step)) {
      const lowered = lowerShapeStep(step, i, {
        targetView,
        scopeChain,
        warn,
        commandEmitter,
        cursor,
      });
      if (!lowered) return null;
      if (
        cursor.relativeBaseline &&
        step.kind === 'arc' &&
        step.center === undefined &&
        typeof step.radius === 'number'
      ) {
        cursor.relativeBaseline = cursor.getPenOverride() ?? cursor.relativeBaseline;
      }
      continue;
    }

    const prev = cursor.previous();
    if (!prev) {
      warn(
        BuiltinCompileWarningCode.PathTooShort,
        `Step '${step.kind}' requires a previous position; the entire path is skipped`,
        ['children', i],
      );
      return null;
    }

    if (step.kind === 'axis-line' && originalStep.kind === 'axis-line') {
      const targetReference = pointOfTarget(originalStep.to, targetView, scopeChain);
      if (!targetReference) return null;

      const currentReference = cursor.getPenOverride() ?? prev.anchor;
      const projected: IRPosition =
        step.axis === 'horizontal'
          ? [targetReference[0], currentReference[1]]
          : [currentReference[0], targetReference[1]];
      if (!isFinitePoint(projected)) {
        throw new RetikzCoreError(RetikzCoreErrorCode.Compile, 'Axis-line produced a non-finite projected endpoint.');
      }

      const projectedStep: Extract<CanonicalPathStep, { kind: 'axis-line' }> = { ...step, to: projected };
      cursor.setTargetAt(i, projectedStep, projected);
      step = projectedStep;
      cursor.relativeBaseline = projected;
    }

    const currAnchor = cursor.anchorAt(i);
    if (!currAnchor) return null;

    // arc/circlePath/ellipsePath 后 penOverride 决定下段起点（弧终点或圆心）
    // 普通段继续对 prev.step.to 做 boundary clip；用完即清空
    const usedOverride = cursor.takePenOverride();

    if (!isStrokeSegmentStep(step)) {
      const unhandledStep: never = step;
      return unhandledStep;
    }

    const lowered = lowerSegmentStep(step, {
      targetView,
      scopeChain,
      previous: prev,
      currentAnchor: currAnchor,
      penOverride: usedOverride,
      commandEmitter,
    });
    if (!lowered) return null;
  }

  // 折线几何圆角：对 line step ↔ line step 的内接缝插入圆弧
  // 在 shrink / split / marks 之前作用于未变换的 commands；缺省或 0 时逐字不变
  let roundedCommands = false;
  const originalCommands = [...commands];
  const originalStepIndexes = [...stepIndexes];
  let spans: Array<Array<StrokeCornerSpan>> = commands.map((_, sourceCommandIndex) => [
    { sourceCommandIndex, sourceRange: [0, 1], commandRange: [0, 1] },
  ]);
  if (path.cornerRadius !== undefined && path.cornerRadius > 0) {
    const before = commands.length;
    const next = applyRoundedCorners({
      commands,
      provenance,
      sourceStepIndexes: stepIndexes,
      radius: path.cornerRadius,
      round: value => value,
    });
    spans = next.spans;

    // 原地替换 commands 内容，下游 applyArrowShrinks / split 直接消费此数组
    if (next.commands.length !== before || next.commands.some((command, index) => command !== commands[index])) {
      commands.length = 0;
      commands.push(...next.commands);
      stepIndexes.length = 0;
      stepIndexes.push(...next.sourceStepIndexes);
      roundedCommands = true;
    }
  }

  return {
    commands,
    originalCommands,
    originalStepIndexes,
    spans,
    stepIndexes,
    boundsPoints,
    endpointSource,
    roundedCommands,
  };
};
