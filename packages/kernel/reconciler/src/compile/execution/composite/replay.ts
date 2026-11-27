import type {
  CompileOccurrenceLocator,
  CompiledReferenceGeometry,
  CompositeReplay,
  CompositeReplayWrapper,
  ScenePrimitive,
  Transform,
} from '@retikz/core';
import {
  CompileExpansionKind,
  allocationPointsOf,
  calculateBoundsOfPrimitives,
  projectReferenceGeometry,
  projectPublishedReference,
} from '@retikz/core';
import { jsonStructuralEquals } from '@retikz/foundation';

import type { CompileOwnerKey } from '../../provenance';
import { createExecutionInvariantError } from '../../runtime';
import {
  compileWarningOccurrenceOf,
  freezeCompileArtifact,
  importSceneResources,
  replaceCompileWarningOccurrence,
} from '../../shared';
import type { SubtreeCompileRuntime, SubtreeOutputContribution } from '../subtree';
import type { CompositeExecutionContext, PreparedReplay } from './types';

/**
 * 将选中试编译的全部贡献提交到当前输出帧
 * @description 消费已通过输出预检的重放事务，应用放置变换与裁剪，同步提交图元、引用几何、边界、资源、诊断及领域产物。继承默认值或主题变化时重新生成事务
 */
export const commitCompositeReplay = (
  execution: CompositeExecutionContext,
  token: CompositeReplay,
  wrapper: CompositeReplayWrapper | undefined,
  frame: SubtreeCompileRuntime,
  occurrence: CompileOccurrenceLocator,
  outputIndex: number,
  preparedReplays: ReadonlyMap<CompositeReplay, PreparedReplay>,
  semanticOwner?: CompileOwnerKey,
  authoredPreliminaryTransforms?: ReadonlyArray<Transform>,
): void => {
  /** 读取输出预检已准备的事务与裁剪路径，缺失表示内部调用顺序错误 */
  const prepared = preparedReplays.get(token);
  if (prepared === undefined) throw createExecutionInvariantError('internal: replay was not preflighted before commit');

  /** 优先复用试算产物；继承默认值或主题改变时，在当前环境中重新编译子树 */
  const { wrapperClipPath, transaction: preparedTransaction } = prepared;
  const transaction =
    preparedTransaction.materialize !== undefined &&
    (!jsonStructuralEquals(preparedTransaction.defaults, frame.context.inheritance.defaults) ||
      !jsonStructuralEquals(preparedTransaction.theme, frame.context.inheritance.theme))
      ? preparedTransaction.materialize({
          scopeChain: frame.context.transformChains,
          scopeDefaults: frame.context.inheritance.defaults,
          theme: frame.context.inheritance.theme,
        })
      : preparedTransaction;

  /** 导入试算资源并登记放置裁剪；重新生成事务时已应用的 Scope 变换不再重复计入 */
  const transforms = wrapper?.transforms;
  const authoredPreliminary = transaction.scopeChainApplied ? undefined : authoredPreliminaryTransforms;
  importSceneResources(
    transaction.resources,
    execution.runtime.state.workspace.paintRegistry,
    execution.runtime.state.workspace.clipRegistry,
  );

  const wrapperClipRef =
    wrapperClipPath === undefined
      ? undefined
      : execution.runtime.state.workspace.clipRegistry.registerPath(wrapperClipPath);

  /** 启用来源追踪时，为重放图元建立当前输出位置的来源关联 */
  const replayedPrimitives =
    execution.runtime.state.execution.provenanceTracker?.materializePrimitives(transaction.primitives) ??
    transaction.primitives;
  if (semanticOwner !== undefined && execution.runtime.state.execution.provenanceTracker !== undefined) {
    if (transaction.provenance === undefined) throw createExecutionInvariantError('Missing replay provenance');
    execution.runtime.state.execution.provenanceTracker.importProvenance(
      transaction.provenance,
      replayedPrimitives,
      semanticOwner,
      outputIndex,
      execution.runtime.state.execution.namespaceStack.identity,
    );
  }

  /** 用 group 外壳应用放置变换和裁剪，复用内部图元并准备本次输出贡献 */
  const committedPrimitives = replayedPrimitives.map((primitive): ScenePrimitive => {
    const placed: ScenePrimitive =
      transforms === undefined || transforms.length === 0
        ? primitive
        : { type: 'group', transforms: [...transforms], children: [primitive] };
    return wrapperClipRef === undefined ? placed : { type: 'group', clipRef: wrapperClipRef, children: [placed] };
  });
  const contribution: SubtreeOutputContribution = {
    primitives: committedPrimitives,
    primitiveZIndices: transaction.primitiveZIndices,
    publications: [],
    geometries: [],
    bounds: [],
    allocations: [],
    artifacts: [],
  };

  if (semanticOwner !== undefined) {
    execution.runtime.state.execution.provenanceTracker?.recordPrimitives(
      committedPrimitives,
      semanticOwner,
      'composite-replay',
    );
  }

  /** 将试算注册的名称投影到最终引用坐标系并提交，同一几何的多个名称共享投影结果 */
  const namespaceParentChain =
    authoredPreliminary === undefined
      ? frame.context.transformChains
      : frame.context.transformChains.slice(0, frame.context.transformChains.length - authoredPreliminary.length);
  const namespaceTransforms = [...(authoredPreliminary ?? []), ...(transforms ?? [])];
  const publishedLayouts = new Map<CompiledReferenceGeometry, CompiledReferenceGeometry>();

  for (const [changeIndex, change] of transaction.namespaceChanges.entries()) {
    const previousLayout = change.entry.geometry;
    const alreadyPublished = publishedLayouts.get(previousLayout);
    const projectedLayout =
      alreadyPublished ?? projectPublishedReference(previousLayout, namespaceParentChain, namespaceTransforms);
    const projectedChange = { ...change, entry: { ...change.entry, geometry: projectedLayout } };

    const changeOccurrence = transaction.namespaceChangeOccurrences[changeIndex] ?? occurrence;
    execution.runtime.state.execution.withWarningOccurrence(
      replayOccurrence(occurrence, outputIndex, transaction.originOccurrence, changeOccurrence),
      () => execution.runtime.state.execution.namespaceStack.commitForkChange(projectedChange),
    );

    if (alreadyPublished === undefined) contribution.publications.push(projectedLayout);
    publishedLayouts.set(previousLayout, projectedLayout);
  }

  /** 将内部引用几何同步到放置后的位置，保持几何查询与图元呈现一致 */
  for (const layout of transaction.geometries) {
    contribution.geometries.push(
      transforms === undefined || transforms.length === 0
        ? layout
        : projectReferenceGeometry(
            layout,
            execution.runtime.state.execution.scopeTransformComposer.resolve(transforms),
          ),
    );
  }

  /** 无放置裁剪时直接变换已有视觉边界；有裁剪时从最终图元重新计算可见包络 */
  if (wrapperClipRef === undefined) {
    for (const bounds of transaction.bounds) {
      contribution.bounds.push({
        boundsPoints:
          transforms === undefined || transforms.length === 0
            ? bounds.boundsPoints
            : bounds.boundsPoints.map(point =>
                execution.runtime.state.execution.scopeTransformComposer.apply(point, transforms),
              ),
        shadow: bounds.shadow,
        ...(bounds.decoration === undefined ? {} : { decoration: bounds.decoration }),
      });
    }
  } else {
    const visualBounds = calculateBoundsOfPrimitives(committedPrimitives, {
      paints: execution.runtime.state.workspace.paintRegistry.getResources(),
      clips: execution.runtime.state.workspace.clipRegistry.getResources(),
    });
    if (visualBounds !== undefined)
      contribution.bounds.push({
        boundsPoints: allocationPointsOf(visualBounds),
        ...(transaction.bounds.some(bounds => bounds.decoration === true) ? { decoration: true } : {}),
      });
  }

  /** 布局占用只应用放置变换，不随视觉裁剪缩减，并跳过无需向父级传播的贡献 */
  for (const allocation of transaction.allocations) {
    if (allocation.skipAllocation === true) continue;
    contribution.allocations.push({
      boundsPoints:
        transforms === undefined || transforms.length === 0
          ? allocation.boundsPoints
          : allocation.boundsPoints.map(point =>
              execution.runtime.state.execution.scopeTransformComposer.apply(point, transforms),
            ),
    });
  }

  /** 将警告与领域产物重定位到最终重放位置，保留试算子树内部的展开后缀 */
  for (const warning of transaction.warnings) {
    execution.runtime.state.workspace.diagnosticCollector.collect(
      replaceCompileWarningOccurrence(
        warning,
        replayOccurrence(occurrence, outputIndex, transaction.originOccurrence, compileWarningOccurrenceOf(warning)),
      ),
    );
  }

  for (const artifact of transaction.artifacts) {
    contribution.artifacts.push(
      freezeCompileArtifact({
        ...artifact,
        occurrence: replayOccurrence(occurrence, outputIndex, transaction.originOccurrence, artifact.occurrence),
      }),
    );
  }

  /** 将整理后的图元、几何、边界和领域产物汇入当前输出帧 */
  execution.host.acceptContribution(frame, contribution);
};

/** 将试编译内的出现位置重定位到最终重放位置，保留内部展开后缀 */
const replayOccurrence = (
  parent: CompileOccurrenceLocator,
  index: number,
  origin: CompileOccurrenceLocator,
  child: CompileOccurrenceLocator,
): CompileOccurrenceLocator => {
  return {
    sourcePath: parent.sourcePath,
    expansionPath: [
      ...parent.expansionPath,
      { kind: CompileExpansionKind.Replay, index },
      ...child.expansionPath.slice(origin.expansionPath.length),
    ],
  };
};
