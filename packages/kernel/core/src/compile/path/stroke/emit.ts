import type { ScenePrimitive } from '../../../contract';
import type { IRPathBase } from '../../../schemas';
import type { NamespaceStack } from '../../namespace';
import type { PaintResolver } from '../../resource';
import type { TextMeasurer } from '../../text';
import type { PathEmitOptions, PathPrimitiveEmitResult } from '../types';

import { resolveArrowRegistry } from '../../../providers';
import { CompileWarningCode } from '../../constants';
import { fallbackMeasurer } from '../../text';
import { normalizePathSteps } from '../host/relative';
import { resolvePathBaseProps } from '../host/resolve';
import { createPathCommandEmitter } from './commands';
import { createStrokeCursor } from './cursor';
import { emitInlineMarkPrimitives, pathEndpointArrowSpecs, resolvePathEndpointDecorations } from './decorations';
import { assertArrowCanInheritStroke } from './marks';
import { wrapPathPrimitiveOutput } from './output';
import { applyRoundedCorners } from './rounded-corners';
import { createStrokeSamplingCollector } from './sampling';
import { isStrokeSegmentStep, lowerSegmentStep } from './segments';
import { isStrokeShapeStep, lowerShapeStep } from './shapes';
import { applyArrowShrinks } from './shrink';
import { splitSubPathsForEndpointArrows } from './split';

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
export const emitPathPrimitive = (
  path: IRPathBase,
  context: EmitPathPrimitiveContext,
): PathPrimitiveEmitResult | null => {
  const { namespaceStack, round, measureText = fallbackMeasurer, options: pathEmitOptions = {} } = context;
  const irPath = pathEmitOptions.irPath ?? 'path';
  const warn = (code: string, message: string, subPath = ''): void => {
    pathEmitOptions.onWarn?.({ code, message, path: subPath ? `${irPath}.${subPath}` : irPath });
  };
  const scopeChain = pathEmitOptions.scopeChain ?? [];
  // paint 解析：有 registry 走去重派 id；无（直调）时纯色透传、PaintSpec 退化为 undefined
  const resolvePaint: PaintResolver =
    pathEmitOptions.resolvePaint ?? (p => (typeof p === 'string' || p === undefined ? p : undefined));
  if (path.children === undefined) {
    throw new Error('Stroke path requires `children` steps.');
  }
  // 先把 relative/relativeAccumulate 解析为当前 scope 局部坐标，后续算法可统一按非 relative target 处理
  const steps = normalizePathSteps(path.children, namespaceStack, scopeChain);
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

  const cursor = createStrokeCursor({ steps, namespaceStack, scopeChain, warn });

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

    const step = steps[i];
    currentStepKind = step.kind;

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
      });
      if (!lowered) return null;
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

  const baseProps = resolvePathBaseProps(path, { resolvePaint });
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

  const endpointSpecs = pathEndpointArrowSpecs(arrows);
  const { primitive } = splitSubPathsForEndpointArrows(commands, baseProps, endpointSpecs);
  const bodyPrims: Array<ScenePrimitive> = [primitive, ...labelPrims, ...marks.primitives];
  return wrapPathPrimitiveOutput({ path, primitive, bodyPrims, boundsPoints, round });
};
