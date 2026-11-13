import type {
  CompileOccurrenceLocator,
  CompiledPath,
  PathResolution,
  PathCompileContext,
  IRPathBase,
  InputPathCompilation,
  LayoutBoundsContribution,
  ScenePrimitive,
} from '@retikz/core';
import { compilePath, createPathTargetResolver, resolvePathAnimations, resolvePath } from '@retikz/core';

import type { CompileOwnerKey } from '../../provenance';
import { createExecutionInvariantError, createCompileObservation } from '../../runtime';
import type { CompileRuntime, CompileReferenceRead, CompileObservationFacts } from '../../runtime';
import { createCompileChildPath } from '../../shared';
import type { TreeOutputState, InternalScenePrimitive } from '../shared';
import { PATH_PLACEHOLDER, createTreePositionContext } from '../shared';
import type { SubtreeCompileRuntime } from '../subtree';

/** 等待命名引用完成注册后再 emit 的 path 任务 */
export type PendingPathEmission = InputPathCompilation & {
  /** 延迟结果的单向观察端，生成内容不提供 */
  observeResult?: (canon: PathResolution, compiled: CompiledPath, facts: CompileObservationFacts) => void;
  observeRead?: (name: string, entry: CompileReferenceRead['entry'], kind: CompileReferenceRead['kind']) => void;
  mirror?: {
    primitives: Array<InternalScenePrimitive>;
    bounds: Array<LayoutBoundsContribution>;
    allocations: Array<LayoutBoundsContribution>;
  };
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
    observeResult:
      runtime.onCompiled === undefined
        ? undefined
        : (canon, compiled, facts) =>
            runtime.onCompiled?.(
              pathIrPath,
              { ...frame.context, transformChains: pending.scopeChain },
              { kind: 'path', path: pending.path, canon, compiled },
              facts,
            ),
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

  const compiled = pendingPaths.map(pending =>
    runtime.state.execution.withWarningOccurrence(pending.occurrence, () => compilePendingPath(runtime, pending)),
  );
  assemblePathOutputs(runtime, output, pendingPaths, compiled);
};

/** 将已完成的 Path 结果原位回填到输出容器 */
export const assemblePathOutputs = (
  runtime: CompileRuntime,
  output: TreeOutputState,
  pendingPaths: ReadonlyArray<PendingPathEmission>,
  results: ReadonlyArray<CompiledPath>,
): void => {
  const replacementsBySink = new Map<
    Array<InternalScenePrimitive>,
    Map<InternalScenePrimitive, ReadonlyArray<ScenePrimitive>>
  >();
  for (const [index, pendingPath] of pendingPaths.entries()) {
    const compiled = results[index];
    const result = compiled.emit;
    const rawPrimitives = result?.primitives ?? [];
    const primitives = runtime.state.execution.provenanceTracker?.materializePrimitives(rawPrimitives) ?? rawPrimitives;
    const { primitives: sink, placeholder } = pendingPath.placeholderSlot;
    let replacements = replacementsBySink.get(sink);
    if (replacements === undefined) {
      replacements = new Map();
      replacementsBySink.set(sink, replacements);
    }
    replacements.set(placeholder, primitives);
    if (pendingPath.mirror !== undefined) {
      let mirrored = replacementsBySink.get(pendingPath.mirror.primitives);
      if (mirrored === undefined) replacementsBySink.set(pendingPath.mirror.primitives, (mirrored = new Map()));
      mirrored.set(placeholder, primitives);
    }
    if (pendingPath.semanticOwner !== undefined) {
      runtime.state.execution.provenanceTracker?.recordPrimitives(primitives, pendingPath.semanticOwner, 'path');
    }

    output.pendingPathCount--;

    if (pendingPath.zIndex !== undefined) {
      for (const prim of primitives) output.zIndexOf.set(prim, pendingPath.zIndex);
    }
    if (result !== null) {
      const bound = { boundsPoints: [...result.boundsPoints], shadow: compiled.style.shadow };
      pendingPath.mirror?.bounds.push(bound);
      pendingPath.mirror?.allocations.push({
        boundsPoints: [...result.boundsPoints],
        skipAllocation: pendingPath.skipAllocation,
      });
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
};

/** 创建全量与增量共用的 Path 确定化上下文 */
export const createPathResolveContext = (
  runtime: CompileRuntime,
  pending: InputPathCompilation,
): Parameters<typeof resolvePath>[1] => ({
  ...runtime.context.registries,
  ...runtime.context.layout,
  gatingOn: runtime.context.host.lowerTex !== undefined,
  warn: (code, message) => runtime.state.workspace.diagnosticCollector.collect({ code, message, path: pending.irPath }),
  scopeDefaults: pending.scopeDefaults,
  mode: pending.theme.mode,
  irPath: pending.irPath,
});

/** 创建 Path 计算上下文，不选择 prepared 产物 */
export const createPathCompileContext = (
  runtime: CompileRuntime,
  pending: InputPathCompilation,
): PathCompileContext => ({
  ...pending,
  targetResolver: createPathTargetResolver(chain => createTreePositionContext(runtime, chain)),
  registries: runtime.context.registries,
  ...runtime.context.layout,
  ...runtime.context.host,
  boundaryStore: runtime.state.workspace.boundaryStore,
  registerPaint: runtime.state.workspace.paintRegistry.register,
  resources: () => ({
    paints: runtime.state.workspace.paintRegistry.getResources(),
    clips: runtime.state.workspace.clipRegistry.getResources(),
  }),
  onWarn: runtime.state.workspace.diagnosticCollector.collect,
  resolveTransform: runtime.state.execution.scopeTransformComposer.resolve,
});

/** 完整计算延迟 Path，不读取跨批结果 */
const compilePendingPath = (runtime: CompileRuntime, pending: PendingPathEmission): CompiledPath => {
  const observation = createCompileObservation(runtime);
  const local = observation.runtime;
  const canon = resolvePath(pending.path, createPathResolveContext(local, pending));
  const compile = () => compilePath(canon, createPathCompileContext(local, pending));
  const namespace = runtime.state.execution.namespaceStack;
  namespace.setPhase('resolving');
  try {
    const calculate = () =>
      pending.observeResult === undefined ? compile() : namespace.observeReferences(observation.read, compile);
    const compiled =
      pending.observeRead === undefined ? calculate() : namespace.observeReferences(pending.observeRead, calculate);
    pending.observeResult?.(canon, compiled, observation.facts());
    return compiled;
  } finally {
    namespace.setPhase('registering');
  }
};
