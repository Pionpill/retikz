import type {
  CompileOccurrenceLocator,
  IRPathBase,
  InputPathCompilation,
  LayoutBoundsContribution,
  ScenePrimitive,
} from '@retikz/core';
import { compilePath, createPathTargetResolver, resolvePathAnimations, resolvePath } from '@retikz/core';

import { comparePathResolutions } from '../../compare';
import type { CompileOwnerKey } from '../../provenance';
import { createExecutionInvariantError, runCompileStage } from '../../runtime';
import type { CompileRuntime } from '../../runtime';
import { createCompileChildPath } from '../../shared';
import { createTreePositionContext } from '../reference';
import type { SubtreeCompileRuntime } from '../runtime';
import type { TreeOutputState, InternalScenePrimitive } from '../shared';
import { PATH_PLACEHOLDER } from '../shared/constants';

/** 等待命名引用完成注册后再 emit 的 path 任务 */
export type PendingPathEmission = InputPathCompilation & {
  /** 只有作者声明可写入跨次缓存 */
  cacheable: boolean;
  /** 入队时的编译出现位置，仅供驱动绑定诊断 */
  occurrence: CompileOccurrenceLocator;
  /** path 几何完成后写入的当前 frame bbox 贡献 */
  bounds: Array<LayoutBoundsContribution>;
  /** path allocation 几何贡献 */
  allocations: Array<LayoutBoundsContribution>;
  /** 延续入队时的占位跳过标记，路径完成后不单独参与父布局占位汇总 */
  skipAllocation?: boolean;
  /** path 在所属图元数组中的原位回填槽 */
  placeholderSlot: {
    /** 持有占位项、等待原位回填的图元数组 */
    primitives: Array<InternalScenePrimitive>;
    /** 需要被最终路径图元替换的对象引用 */
    placeholder: { type: typeof PATH_PLACEHOLDER };
  };
  /** 产生 path primitive 的语义 owner */
  semanticOwner?: CompileOwnerKey;
  /** 编译期排序用 zIndex，不写入 Scene primitive */
  zIndex?: number;
};

/** 合并 path 样式并加入延迟 emit 队列，保留顶层绘制顺序占位 */
export const queuePathChild = (
  runtime: CompileRuntime,
  output: TreeOutputState,
  child: IRPathBase,
  index: number,
  frame: SubtreeCompileRuntime,
  occurrence: CompileOccurrenceLocator,
  semanticOwner?: CompileOwnerKey,
): void => {
  const {
    context: { transformChains: scopeChain, pathPrefix: locatorPrefix, inheritance: style, layout },
    state: { primitives, paths, bounds, allocations },
  } = frame;
  const { defaults: scopeDefaults, theme } = style;
  const pathIrPath = createCompileChildPath(locatorPrefix, index);
  const placeholder = { type: PATH_PLACEHOLDER } as const;
  primitives.push(placeholder);
  const pending: PendingPathEmission = {
    cacheable: runtime.cache !== undefined,
    path: resolvePathAnimations(child, pathIrPath, runtime.state.workspace.diagnosticCollector.collect),
    irPath: pathIrPath,
    scopeChain,
    bounds,
    allocations,
    ...(layout?.skipAllocation === undefined ? {} : { skipAllocation: layout.skipAllocation }),
    placeholderSlot: { primitives, placeholder },
    occurrence,
    theme,
    scopeDefaults,
    ...(semanticOwner === undefined ? {} : { semanticOwner }),
    zIndex: child.zIndex,
  };
  output.pendingPathCount++;
  paths.push(pending);
};

/** 在命名引用可查阶段 emit 延迟 path，并把结果回填到对应输出容器 */
export const flushPendingPathEmissions = (
  runtime: CompileRuntime,
  output: TreeOutputState,
  pendingPaths: ReadonlyArray<PendingPathEmission>,
): void => {
  if (pendingPaths.length === 0) return;

  // ⚡同一输出容器集中回填，避免每条 Path 从头查找并移动后续图元
  const replacementsBySink = new Map<
    Array<InternalScenePrimitive>,
    Map<InternalScenePrimitive, ReadonlyArray<ScenePrimitive>>
  >();
  runtime.state.execution.namespaceStack.setPhase('resolving');

  try {
    for (const pendingPath of pendingPaths) {
      const { compiled } = runtime.state.execution.withWarningOccurrence(pendingPath.occurrence, () =>
        runCompileStage(
          pendingPath.cacheable ? runtime : { ...runtime, cache: undefined },
          pendingPath.irPath,
          'path',
          {
            path: pendingPath.path,
            scopeChain: pendingPath.scopeChain,
            scopeDefaults: pendingPath.scopeDefaults,
            theme: pendingPath.theme,
          },
          {
            resolveInputs: { path: pendingPath.path, defaults: pendingPath.scopeDefaults, theme: pendingPath.theme },
            compileInputs: { scopeChain: pendingPath.scopeChain },
            resolve: stageRuntime =>
              resolvePath(pendingPath.path, {
                ...stageRuntime.context.registries,
                ...stageRuntime.context.layout,
                gatingOn: stageRuntime.context.host.lowerTex !== undefined,
                warn: (code, message) =>
                  stageRuntime.state.workspace.diagnosticCollector.collect({ code, message, path: pendingPath.irPath }),
                scopeDefaults: pendingPath.scopeDefaults,
                mode: pendingPath.theme.mode,
                irPath: pendingPath.irPath,
              }),
            equals: comparePathResolutions,
            compile: (stageRuntime, resolution) => ({
              canon: resolution,
              compiled: compilePath(resolution, {
                ...pendingPath,
                // ⚡只有阶段实际执行时才创建解析器，整条缓存命中不承担准备成本
                targetResolver: createPathTargetResolver(chain => createTreePositionContext(runtime, chain)),
                registries: stageRuntime.context.registries,
                ...stageRuntime.context.layout,
                ...stageRuntime.context.host,
                boundaryStore: stageRuntime.state.workspace.boundaryStore,
                registerPaint: stageRuntime.state.workspace.paintRegistry.register,
                resources: () => [
                  ...stageRuntime.state.workspace.paintRegistry.getResources(),
                  ...stageRuntime.state.workspace.clipRegistry.getResources(),
                ],
                onWarn: stageRuntime.state.workspace.diagnosticCollector.collect,
                resolveTransform: stageRuntime.state.execution.scopeTransformComposer.resolve,
              }),
            }),
          },
        ),
      );
      const result = compiled.emit;
      const rawPrimitives = result?.primitives ?? [];
      const primitives =
        runtime.state.execution.provenanceTracker?.materializePrimitives(rawPrimitives) ?? rawPrimitives;
      const { primitives: sink, placeholder } = pendingPath.placeholderSlot;
      let replacements = replacementsBySink.get(sink);
      if (replacements === undefined) {
        replacements = new Map();
        replacementsBySink.set(sink, replacements);
      }
      replacements.set(placeholder, primitives);
      if (pendingPath.semanticOwner !== undefined) {
        runtime.state.execution.provenanceTracker?.recordPrimitives(primitives, pendingPath.semanticOwner, 'path');
      }

      output.pendingPathCount--;

      if (pendingPath.zIndex !== undefined) {
        for (const prim of primitives) output.zIndexOf.set(prim, pendingPath.zIndex);
      }
      if (result !== null) {
        pendingPath.bounds.push({
          boundsPoints: [...result.boundsPoints],
          shadow: compiled.style.shadow,
        });
        pendingPath.allocations.push({
          boundsPoints: [...result.boundsPoints],
          skipAllocation: pendingPath.skipAllocation,
        });
      }
    }
    for (const [sink, replacements] of replacementsBySink) {
      const materialized: Array<InternalScenePrimitive> = [];
      for (const primitive of sink) {
        const replacement = replacements.get(primitive);
        if (replacement === undefined) materialized.push(primitive);
        else {
          for (const emitted of replacement) materialized.push(emitted);
          replacements.delete(primitive);
        }
      }
      if (replacements.size !== 0)
        throw createExecutionInvariantError('internal: path placeholder missing from its sink');
      for (let index = 0; index < materialized.length; index++) sink[index] = materialized[index];
      sink.length = materialized.length;
    }
  } finally {
    runtime.state.execution.namespaceStack.setPhase('registering');
  }
};
