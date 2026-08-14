import { isFinitePoint } from '@retikz/math';

import type { ScenePrimitive } from '../../../contract';
import type { CanonicalPath, CanonicalStep } from '../../../normalize/path';
import type { IRPathBase, IRPosition, IRTarget } from '../../../schemas';
import type { NamespaceStack } from '../../namespace';
import type { PaintResolver } from '../../resource';
import type { TextMeasurer } from '../../text';
import type { PathEmitOptions, PathPrimitiveEmitResult } from '../types';

import { normalizePath } from '../../../normalize/path';
import { resolveArrowRegistry } from '../../../providers';
import { isRelativeAccumulateTargetLike, isRelativeTargetLike } from '../../../shared';
import { cloneAndFreezeJson } from '../../../shared/json';
import { CompileWarningCode } from '../../constants';
import { fallbackMeasurer } from '../../text';
import { localPointOfTarget, normalizePathSteps, resolvePathBaseProps } from '../host';
import { createPathCommandEmitter } from './commands';
import { createStrokeCursor, isStrokeTargetStep } from './cursor';
import { emitInlineMarkPrimitives, pathEndpointArrowSpecs, resolvePathEndpointDecorations } from './decorations';
import { assertArrowCanInheritStroke } from './marks';
import { wrapPathPrimitiveOutput } from './output';
import { applyRoundedCorners } from './rounded-corners';
import { createStrokeSamplingCollector } from './sampling';
import { isStrokeSegmentStep, lowerSegmentStep } from './segments';
import { isStrokeShapeStep, lowerShapeStep } from './shapes';
import { applyArrowShrinks } from './shrink';
import { splitSubPathsForEndpointArrows } from './split';
import { bboxCenter, buildPathOwnerOutputTransforms } from './transform';

/** 普通 path emit 所需的编译上下文 */
export type EmitPathPrimitiveContext = {
  /** id 查询栈 */
  namespaceStack: NamespaceStack;
  /** 坐标取整函数 */
  round: (n: number) => number;
  /** 文本测量函数 */
  measureText?: TextMeasurer;
  /** path emit 选项与 warning 钩子 */
  options?: PathEmitOptions;
};

/**
 * IR Path → PathPrim
 * @description 解析失败返回 null，并通过 `PathEmitOptions.onWarn` 报告 warning
 */
const emitCanonicalPathPrimitive = (
  canonicalPath: CanonicalPath,
  context: EmitPathPrimitiveContext,
): PathPrimitiveEmitResult | null => {
  const { namespaceStack, round, measureText = fallbackMeasurer, options: pathEmitOptions = {} } = context;
  const path = canonicalPath;
  const irPath = pathEmitOptions.irPath ?? 'path';
  const warn = (code: string, message: string, subPath = ''): void => {
    pathEmitOptions.onWarn?.({ code, message, path: subPath ? `${irPath}.${subPath}` : irPath });
  };
  const scopeChain = pathEmitOptions.scopeChain ?? [];
  // paint 解析：有 registry 走去重派 id；无（直调）时纯色透传、PaintSpec 退化为 undefined
  const resolvePaint: PaintResolver =
    pathEmitOptions.resolvePaint ?? (p => (typeof p === 'string' || p === undefined ? p : undefined));
  const canonicalChildren = canonicalPath.children;
  if (canonicalChildren === undefined) {
    throw new Error('Stroke path requires `children` steps.');
  }
  // 先把 relative/relativeAccumulate 解析为当前 scope 局部坐标，后续算法可统一按非 relative target 处理
  const canonicalSteps = canonicalChildren;
  const steps = normalizePathSteps(canonicalSteps, namespaceStack, scopeChain, pathEmitOptions.resolveExplicitBoundary);
  // 自包含 shape step（rectangle 自带 from/to 两对角、不依赖游标）单独成 path 合法；
  // 其余 step 需"起点 + 至少一段绘制"故最少 2 段
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
    namespaceStack,
    scopeChain,
    warn,
    resolveExplicitBoundary: pathEmitOptions.resolveExplicitBoundary,
  });

  /** 主循环每轮置为当前 step.kind，emit* 据此打 provenance 标 */
  let currentStepKind = '';
  const commandEmitter = createPathCommandEmitter({ round, currentStepKind: () => currentStepKind });
  const { commands, provenance, boundsPoints, endpointSource } = commandEmitter;
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
    currentStepKind = step.kind;

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
        throw new Error('Relative target produced a non-finite endpoint.');
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
        generatorTarget = localPointOfTarget(
          originalStep.to,
          namespaceStack,
          scopeChain,
          pathEmitOptions.resolveExplicitBoundary,
        );
      }
      if (generatorTarget) {
        if (!isFinitePoint(generatorTarget)) {
          throw new Error('Generator target produced a non-finite endpoint.');
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
          if (!isFinitePoint(resolved)) throw new Error('Smooth relative target produced a non-finite endpoint.');
          points.push(resolved);
          continue;
        }
        if (isRelativeAccumulateTargetLike(originalPoint)) {
          const resolved: IRPosition = [
            smoothBaseline[0] + originalPoint.relativeAccumulate[0],
            smoothBaseline[1] + originalPoint.relativeAccumulate[1],
          ];
          if (!isFinitePoint(resolved)) {
            throw new Error('Smooth relativeAccumulate target produced a non-finite endpoint.');
          }
          points.push(resolved);
          smoothBaseline = resolved;
          continue;
        }
        const resolved = localPointOfTarget(
          originalPoint,
          namespaceStack,
          scopeChain,
          pathEmitOptions.resolveExplicitBoundary,
        );
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

    // move 自身不绘制；其 to 仅供下个绘制段的 findPrev 引用。
    // 显式 move 开启新游标，必须切断 arc/circle/ellipse/rectangle/generator 留给下一绘制段的 penOverride。
    if (step.kind === 'move') {
      cursor.clearPenOverride();
      continue;
    }

    if (isStrokeShapeStep(step)) {
      const lowered = lowerShapeStep(step, i, {
        namespaceStack,
        scopeChain,
        round,
        irPath,
        generators: pathEmitOptions.effectivePathGenerators,
        warn,
        commandEmitter,
        cursor,
        sampling,
        resolveExplicitBoundary: pathEmitOptions.resolveExplicitBoundary,
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
      const targetReference = localPointOfTarget(
        originalStep.to,
        namespaceStack,
        scopeChain,
        pathEmitOptions.resolveExplicitBoundary,
      );
      if (!targetReference) return null;
      const currentReference = cursor.getPenOverride() ?? prev.anchor;
      const projected: IRPosition =
        step.axis === 'horizontal'
          ? [targetReference[0], currentReference[1]]
          : [currentReference[0], targetReference[1]];
      if (!isFinitePoint(projected)) {
        throw new Error('Axis-line produced a non-finite projected endpoint.');
      }
      const projectedStep: Extract<CanonicalStep, { kind: 'axis-line' }> = { ...step, to: projected };
      cursor.setTargetAt(i, projectedStep, projected);
      step = projectedStep;
      cursor.relativeBaseline = projected;
    }

    const currAnchor = cursor.anchorAt(i);
    if (!currAnchor) return null;

    // arc/circlePath/ellipsePath 后 penOverride 决定下段起点（弧终点/圆心）；
    // 普通段继续对 prev.step.to 做 boundary clip（节点 ref 段独立 clip）。用完即清空
    const usedOverride = cursor.takePenOverride();

    if (!isStrokeSegmentStep(step)) {
      const unhandledStep: never = step;
      return unhandledStep;
    }
    const lowered = lowerSegmentStep(step, {
      namespaceStack,
      scopeChain,
      previous: prev,
      currentAnchor: currAnchor,
      penOverride: usedOverride,
      commandEmitter,
      sampling,
      resolveExplicitBoundary: pathEmitOptions.resolveExplicitBoundary,
    });
    if (!lowered) return null;
  }

  // 折线几何圆角：编译期对 line step ↔ line step 内接缝插切圆弧。
  // 在 shrink / split / marks 之前作用于已 emit 的 commands（在未变换几何上）——故 marks 弧长、arrow shrink、
  // rotate/scale 外层 group 都自动落在倒角后几何上（顺序硬契约）。缺省 / 0 → commands 逐字不变。
  let roundedCommands = false;
  if (path.roundedCorners !== undefined && path.roundedCorners > 0) {
    const before = commands.length;
    const next = applyRoundedCorners({ commands, provenance, radius: path.roundedCorners, round });
    // 原地替换 commands 内容（下游 applyArrowShrinks / split 直接消费此数组）
    if (next.length !== before || next.some((c, k) => c !== commands[k])) {
      commands.length = 0;
      commands.push(...next);
      roundedCommands = true;
    }
  }

  const baseProps = resolvePathBaseProps(canonicalPath, { resolvePaint });
  const strokeWidth = baseProps.strokeWidth;
  const resolvedArrows = pathEmitOptions.resolvedArrows ?? resolveArrowRegistry();
  const { arrows, inlineMarks } = resolvePathEndpointDecorations(path, { resolvedArrows, round });
  assertArrowCanInheritStroke(baseProps.stroke, arrows);

  const marks = emitInlineMarkPrimitives({
    commands,
    inlineMarks,
    segmentSamplers,
    roundedCommands,
    resolvedArrows,
    baseProps,
    round,
  });
  boundsPoints.push(...marks.boundsPoints);

  // shrink 在 compile 算（端点收缩与 emit 落点无关）：按 shape + 视觉输入把首/末段端点向内缩短，
  // 让 line 端点接在 hollow arrow 尾部外缘、不贯穿 back outline；shrink=0 的实心 shape 跳过
  const shrinkStart = arrows.shrinkStart + (endpointSource.firstAutoBoundary ? arrows.boundaryOuterInsetStart : 0);
  const shrinkEnd = arrows.shrinkEnd + (endpointSource.lastAutoBoundary ? arrows.boundaryOuterInsetEnd : 0);
  applyArrowShrinks(commands, { shrinkStart, shrinkEnd, strokeWidth, round });

  if (pathEmitOptions.captureOwnerOutput !== undefined) {
    pathEmitOptions.captureOwnerOutput(
      cloneAndFreezeJson(
        {
          commands,
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

  const endpointSpecs = pathEndpointArrowSpecs(arrows);
  const { primitive } = splitSubPathsForEndpointArrows(commands, baseProps, endpointSpecs);
  const bodyPrims: Array<ScenePrimitive> = [primitive, ...labelPrims, ...marks.primitives];
  return wrapPathPrimitiveOutput({ path, primitive, bodyPrims, boundsPoints, round });
};

/**
 * 将源 IR 路径输出为路径图元
 * @description 内置输出器入口统一执行一次规范化
 */
export const emitPathPrimitive = (
  path: IRPathBase,
  context: EmitPathPrimitiveContext,
): PathPrimitiveEmitResult | null => emitCanonicalPathPrimitive(normalizePath(path), context);

/**
 * 将规范化路径输出为路径图元
 * @description 仅供流带等 Core 内部规范化消费方复用描边输出器
 */
export const emitCanonicalPath = (
  path: CanonicalPath,
  context: EmitPathPrimitiveContext,
): PathPrimitiveEmitResult | null => emitCanonicalPathPrimitive(path, context);
