import { isFinitePoint } from '@retikz/math';

import type { ScenePrimitive } from '../../../contract';
import type { CanonicalStep, PathTargetView, StrokePathResolution } from '../../../resolve';
import type { IRPosition, IRTarget } from '../../../schemas';
import type { PaintResolver } from '../../resource';
import type { TextMeasurer } from '../../text';
import type { PathEmitOptions, PathPrimitiveEmitResult } from '../types';
import type { StrokeInterruptionProtectedRange } from './interruption';

import { RetikzCoreError, RetikzCoreErrorCode } from '../../../error';
import { isRelativeAccumulateTargetLike, isRelativeTargetLike } from '../../../shared';
import { cloneAndFreezeJson } from '../../../shared/json';
import { CompileWarningCode } from '../../constants';
import { fallbackMeasurer } from '../../text';
import { emitLabelPrimitive, pointOfTarget } from '../host';
import { createPathCommandEmitter } from './commands';
import { createStrokeCursor, isStrokeTargetStep } from './cursor';
import { emitInlineMarkPrimitives, emitPathEndpointDecorations, pathEndpointArrows } from './decorations';
import {
  createStrokeInterruptionIntervals,
  createStrokePathGeometry,
  splitStrokePathAtInterruptions,
} from './interruption';
import { assertArrowCanInheritStroke } from './marks';
import { emitPathBaseProps, wrapPathPrimitiveOutput } from './output';
import { applyRoundedCorners } from './rounded-corners';
import { createStrokeSamplingCollector } from './sampling';
import { isStrokeSegmentStep, lowerSegmentStep } from './segments';
import { isStrokeShapeStep, lowerShapeStep } from './shapes';
import { applyArrowShrinks } from './shrink';
import { emitInterruptedPathFragments, splitSubPathsForEndpointArrows } from './split';
import { bboxCenter, buildPathOwnerOutputTransforms } from './transform';

/** 普通 path emit 所需的编译上下文 */
export type EmitPathPrimitiveContext = {
  /** 节点 id 与 target 几何解析视图 */
  targetView: PathTargetView;
  /** 坐标取整函数 */
  round: (n: number) => number;
  /** 文本测量函数 */
  measureText?: TextMeasurer;
  /** path emit 选项与 warning 钩子 */
  options?: PathEmitOptions;
};

/**
 * 将 IR Path 输出为 PathPrim
 * @description 解析失败返回 null，并通过 `PathEmitOptions.onWarn` 报告 warning
 */
const emitCanonicalPathPrimitive = (
  resolution: StrokePathResolution,
  context: EmitPathPrimitiveContext,
): PathPrimitiveEmitResult | null => {
  const { targetView, round, measureText = fallbackMeasurer, options: pathEmitOptions = {} } = context;
  const { path } = resolution;
  const canonicalPath = path;
  const canonicalSteps = path.children ?? [];
  const irPath = pathEmitOptions.irPath ?? 'path';
  const warn = (code: string, message: string, subPath = ''): void => {
    pathEmitOptions.onWarn?.({ code, message, path: subPath ? `${irPath}.${subPath}` : irPath });
  };
  const scopeChain = pathEmitOptions.scopeChain ?? [];
  // paint 解析：有 registry 走去重派 id；无 registry 时纯色透传、IRPaint 退化为 undefined
  const resolvePaint: PaintResolver =
    pathEmitOptions.resolvePaint ?? (p => (typeof p === 'string' || p === undefined ? p : undefined));
  // relative/relativeAccumulate target 已由 resolving 阶段绑定为当前 scope 的局部坐标
  const steps = [...canonicalSteps];
  // 自包含 shape step（rectangle 自带 from/to 两对角、不依赖游标）单独成 path 合法；其余 step 至少需要起点和一段绘制
  const soloSelfContained = steps.length === 1 && steps[0].kind === 'rectangle';
  if (steps.length < 2 && !soloSelfContained) {
    warn(
      CompileWarningCode.PathTooShort,
      `Path requires at least 2 steps (got ${steps.length}); the entire path is skipped`,
      'children',
    );
    return null;
  }

  const cursor = createStrokeCursor({
    steps,
    targetView,
    scopeChain,
    warn,
  });

  /** 主循环每轮置为当前 step.kind，emit* 据此标记 provenance */
  let currentStepKind = '';
  let currentStepIndex = -1;
  const commandEmitter = createPathCommandEmitter({
    round,
    currentStepKind: () => currentStepKind,
    currentStepIndex: () => currentStepIndex,
  });
  const { commands, provenance, stepIndexes, boundsPoints, endpointSource } = commandEmitter;
  const sampling = createStrokeSamplingCollector({
    boundsPoints,
    measureText,
    round,
    hostOpacity: path.opacity,
    rootFontSize: pathEmitOptions.rootFontSize,
    lowerTex: pathEmitOptions.lowerTex,
    warn,
  });
  const { labelPrimitives: labelPrims, segmentSamplers } = sampling;
  for (let i = 0; i < steps.length; i++) {
    cursor.advance(i);

    let step = steps[i];
    const originalStep = canonicalSteps[i];
    sampling.beginStep(i, step.kind);
    currentStepKind = step.kind;
    currentStepIndex = i;

    if (
      cursor.relativeBaseline &&
      isStrokeTargetStep(step) &&
      'to' in originalStep &&
      (isRelativeTargetLike(originalStep.to) || isRelativeAccumulateTargetLike(originalStep.to))
    ) {
      const offset = isRelativeTargetLike(originalStep.to)
        ? originalStep.to.relative
        : originalStep.to.relativeAccumulate;
      const resolved: IRPosition = [cursor.relativeBaseline[0] + offset[0], cursor.relativeBaseline[1] + offset[1]];
      if (!isFinitePoint(resolved)) {
        throw new RetikzCoreError(RetikzCoreErrorCode.Compile, 'Relative target produced a non-finite endpoint.');
      }
      const resolvedStep = { ...step, to: resolved };
      cursor.setTargetAt(i, resolvedStep, resolved);
      step = resolvedStep;
      if (isRelativeAccumulateTargetLike(originalStep.to)) {
        cursor.relativeBaseline = resolved;
      }
    }
    if (
      cursor.relativeBaseline &&
      isStrokeTargetStep(step) &&
      step.kind !== 'axis-line' &&
      'to' in originalStep &&
      !isRelativeTargetLike(originalStep.to) &&
      !isRelativeAccumulateTargetLike(originalStep.to)
    ) {
      const absoluteAnchor = cursor.anchorAt(i);
      if (absoluteAnchor) cursor.relativeBaseline = absoluteAnchor;
    }
    if (
      cursor.relativeBaseline &&
      step.kind === 'generator' &&
      originalStep.kind === 'generator' &&
      originalStep.to !== undefined
    ) {
      let generatorTarget: IRPosition | null;
      let updatesBaseline = true;
      if (isRelativeTargetLike(originalStep.to)) {
        generatorTarget = [
          cursor.relativeBaseline[0] + originalStep.to.relative[0],
          cursor.relativeBaseline[1] + originalStep.to.relative[1],
        ];
        updatesBaseline = false;
      } else if (isRelativeAccumulateTargetLike(originalStep.to)) {
        generatorTarget = [
          cursor.relativeBaseline[0] + originalStep.to.relativeAccumulate[0],
          cursor.relativeBaseline[1] + originalStep.to.relativeAccumulate[1],
        ];
      } else {
        generatorTarget = pointOfTarget(originalStep.to, targetView, scopeChain);
      }
      if (generatorTarget) {
        if (!isFinitePoint(generatorTarget)) {
          throw new RetikzCoreError(RetikzCoreErrorCode.Compile, 'Generator target produced a non-finite endpoint.');
        }
        step = { ...step, to: generatorTarget };
        if (updatesBaseline) cursor.relativeBaseline = generatorTarget;
      }
    }
    if (cursor.relativeBaseline && step.kind === 'smooth' && originalStep.kind === 'smooth') {
      let smoothBaseline: IRPosition = cursor.relativeBaseline;
      const points: Array<IRTarget> = [];
      for (const originalPoint of originalStep.points) {
        if (isRelativeTargetLike(originalPoint)) {
          const resolved: IRPosition = [
            smoothBaseline[0] + originalPoint.relative[0],
            smoothBaseline[1] + originalPoint.relative[1],
          ];
          if (!isFinitePoint(resolved))
            throw new RetikzCoreError(
              RetikzCoreErrorCode.Compile,
              'Smooth relative target produced a non-finite endpoint.',
            );
          points.push(resolved);
          continue;
        }
        if (isRelativeAccumulateTargetLike(originalPoint)) {
          const resolved: IRPosition = [
            smoothBaseline[0] + originalPoint.relativeAccumulate[0],
            smoothBaseline[1] + originalPoint.relativeAccumulate[1],
          ];
          if (!isFinitePoint(resolved)) {
            throw new RetikzCoreError(
              RetikzCoreErrorCode.Compile,
              'Smooth relativeAccumulate target produced a non-finite endpoint.',
            );
          }
          points.push(resolved);
          smoothBaseline = resolved;
          continue;
        }
        const resolved = pointOfTarget(originalPoint, targetView, scopeChain);
        if (!resolved) {
          points.push(originalPoint);
          continue;
        }
        points.push(resolved);
        smoothBaseline = resolved;
      }
      step = { ...step, points };
      cursor.relativeBaseline = smoothBaseline;
    }

    // move 自身不绘制；其 to 仅供下个绘制段的 findPrev 引用
    // 显式 move 开启新游标，必须切断 arc/circle/ellipse/rectangle/generator 留给下一绘制段的 penOverride
    if (step.kind === 'move') {
      cursor.clearPenOverride();
      continue;
    }

    if (isStrokeShapeStep(step)) {
      const lowered = lowerShapeStep(step, i, {
        targetView,
        scopeChain,
        round,
        generatorResolution: originalStep.kind === 'generator' ? resolution.generators.get(originalStep) : undefined,
        warn,
        commandEmitter,
        cursor,
        sampling,
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
        CompileWarningCode.PathTooShort,
        `Step '${step.kind}' requires a previous position; the entire path is skipped`,
        `children[${i}]`,
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
      const projectedStep: Extract<CanonicalStep, { kind: 'axis-line' }> = { ...step, to: projected };
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
      sampling,
    });
    if (!lowered) return null;
  }

  // 折线几何圆角：对 line step ↔ line step 的内接缝插入圆弧
  // 在 shrink / split / marks 之前作用于未变换的 commands；缺省或 0 时逐字不变
  let roundedCommands = false;
  if (path.roundedCorners !== undefined && path.roundedCorners > 0) {
    const before = commands.length;
    const next = applyRoundedCorners({
      commands,
      provenance,
      sourceStepIndexes: stepIndexes,
      radius: path.roundedCorners,
      round,
    });
    // 原地替换 commands 内容，下游 applyArrowShrinks / split 直接消费此数组
    if (next.commands.length !== before || next.commands.some((command, index) => command !== commands[index])) {
      commands.length = 0;
      commands.push(...next.commands);
      stepIndexes.length = 0;
      stepIndexes.push(...next.sourceStepIndexes);
      roundedCommands = true;
    }
  }

  const baseProps = emitPathBaseProps(canonicalPath, {
    resolvePaint,
    paint: resolution.paint,
    style: resolution.style,
  });
  const strokeWidth = baseProps.strokeWidth;
  const logicalGeometry = createStrokePathGeometry(commands, stepIndexes);
  const stepLabels = sampling.materializeStepLabels(logicalGeometry);
  const hostLabels = (path.label ?? []).flatMap(label => {
    const labelSample = sampling.sampleHostLabel(logicalGeometry, label.position, roundedCommands);
    if (labelSample === undefined) return [];
    const result = emitLabelPrimitive(label, labelSample.visualSample, {
      measureText,
      round,
      rootFontSize: pathEmitOptions.rootFontSize,
      hostOpacity: path.opacity,
      tex: {
        lowerTex: pathEmitOptions.lowerTex,
        gatingOn: pathEmitOptions.lowerTex !== undefined,
        warn: (code, message) => warn(code, message, 'label'),
      },
    });
    boundsPoints.push(...result.boundsPoints);
    return [
      { label, primitive: result.primitive, boundsPoints: result.boundsPoints, sample: labelSample.logicalSample },
    ];
  });
  const { arrows, inlineMarks } = emitPathEndpointDecorations(path, {
    arrowResolutions: resolution.arrows,
    round,
    irPath,
  });
  assertArrowCanInheritStroke(baseProps.stroke, arrows);

  // shrink 在 compile 阶段计算，与 emit 落点无关；按视觉输入把首末段端点向内缩短
  // 让 line 端点接在 hollow arrow 尾部外缘，不贯穿 back outline；shrink=0 的实心 shape 跳过
  const shrinkStart = arrows.shrinkStart + (endpointSource.firstAutoBoundary ? arrows.boundaryOuterInsetStart : 0);
  const shrinkEnd = arrows.shrinkEnd + (endpointSource.lastAutoBoundary ? arrows.boundaryOuterInsetEnd : 0);
  const endpointProtectionLength = strokeWidth / 2;
  const endpointProtections: Array<StrokeInterruptionProtectedRange> = [];
  const firstDrawableOccurrence = logicalGeometry.occurrences.find(occurrence => occurrence.command.kind !== 'close');
  const lastDrawableOccurrence = logicalGeometry.occurrences.findLast(
    occurrence => occurrence.command.kind !== 'close',
  );
  if (arrows.arrowStart !== undefined && firstDrawableOccurrence !== undefined) {
    endpointProtections.push({
      subPathIndex: firstDrawableOccurrence.subPathIndex,
      start: firstDrawableOccurrence.logicalStart,
      end: Math.min(
        firstDrawableOccurrence.logicalEnd,
        firstDrawableOccurrence.logicalStart + shrinkStart * strokeWidth + endpointProtectionLength,
      ),
    });
  }
  if (arrows.arrowEnd !== undefined && lastDrawableOccurrence !== undefined) {
    endpointProtections.push({
      subPathIndex: lastDrawableOccurrence.subPathIndex,
      start: Math.max(
        lastDrawableOccurrence.logicalStart,
        lastDrawableOccurrence.logicalEnd - shrinkEnd * strokeWidth - endpointProtectionLength,
      ),
      end: lastDrawableOccurrence.logicalEnd,
    });
  }
  const interruptionIntervals = createStrokeInterruptionIntervals(
    [...stepLabels, ...hostLabels]
      .filter(label => label.label.interrupt)
      .map(label => ({ sample: label.sample, visualBoundsPoints: label.boundsPoints })),
    strokeWidth,
    endpointProtections,
  );

  const marks = emitInlineMarkPrimitives({
    commands,
    inlineMarks,
    segmentSamplers,
    roundedCommands,
    arrowResolutions: resolution.arrows,
    baseProps,
    round,
  });
  boundsPoints.push(...marks.boundsPoints);

  const endpointSpecs = pathEndpointArrows(arrows);
  const fragments = splitStrokePathAtInterruptions(logicalGeometry, interruptionIntervals, round, {
    separateTerminalDrawable: endpointSpecs.arrowEnd !== undefined,
  });
  let primitive: ScenePrimitive;
  if (interruptionIntervals.length === 0) {
    applyArrowShrinks(commands, { shrinkStart, shrinkEnd, strokeWidth, round });
    primitive = splitSubPathsForEndpointArrows(commands, baseProps, endpointSpecs).primitive;
  } else {
    const startFragment = fragments.find(fragment => fragment.hasPathStart);
    const endFragment = fragments.find(fragment => fragment.hasPathEnd);
    if (startFragment !== undefined && startFragment === endFragment) {
      applyArrowShrinks(startFragment.commands, { shrinkStart, shrinkEnd, strokeWidth, round });
    } else {
      if (startFragment !== undefined) {
        applyArrowShrinks(startFragment.commands, { shrinkStart, shrinkEnd: 0, strokeWidth, round });
      }
      if (endFragment !== undefined) {
        applyArrowShrinks(endFragment.commands, { shrinkStart: 0, shrinkEnd, strokeWidth, round });
      }
    }
    primitive = emitInterruptedPathFragments(fragments, baseProps, endpointSpecs);
  }

  if (pathEmitOptions.captureOwnerOutput !== undefined) {
    const ownerCommands = fragments.length === 0 ? commands : commands.map(command => ({ ...command }));
    if (fragments.length > 0) applyArrowShrinks(ownerCommands, { shrinkStart, shrinkEnd, strokeWidth, round });
    pathEmitOptions.captureOwnerOutput(
      cloneAndFreezeJson(
        {
          commands: ownerCommands,
          transforms:
            boundsPoints.length === 0
              ? []
              : buildPathOwnerOutputTransforms({
                  rotate: path.rotate,
                  scale: path.scale,
                  center: bboxCenter(boundsPoints),
                  round,
                }),
        },
        'Stroke Path owner output',
      ),
    );
  }

  const bodyPrims: Array<ScenePrimitive> = [
    primitive,
    ...labelPrims,
    ...hostLabels.map(label => label.primitive),
    ...marks.primitives,
  ];
  return wrapPathPrimitiveOutput({ path, primitive, bodyPrims, boundsPoints, round });
};

/** 将已解析的 path 输出为路径图元 */
export const emitPathPrimitive = (
  resolution: StrokePathResolution,
  context: EmitPathPrimitiveContext,
): PathPrimitiveEmitResult | null => emitCanonicalPathPrimitive(resolution, context);
