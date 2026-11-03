import type {
  CompiledNode,
  CompiledNodeLayout,
  CompiledPath,
  CompiledScope,
  CompileWarning,
  SceneResource,
  PaintRegistry,
  ClipRegistry,
  emitNodeOutput,
} from '@retikz/core';
import { importSceneResources } from '@retikz/core';
import type { PropertyPath } from '@retikz/foundation';
import { jsonStructuralEquals } from '@retikz/foundation';

import type { NamespaceEntry } from './namespace';
import type { CompileRuntime } from './runtime';

/** 一次阶段计算的名称读取事实 */
export type CompileReferenceRead = Readonly<{ name: string; entry: NamespaceEntry | undefined }>;

/** 原子阶段对应的实际产物，执行器不可交换不同阶段的缓存 */
export type CompileStageProducts = {
  node: { compiled: CompiledNode; output: ReturnType<typeof emitNodeOutput> };
  coordinate: CompiledNodeLayout;
  path: CompiledPath;
  scope: CompiledScope;
};

/** 阶段缓存及其有效性依据 */
export type CompileStageRecord = {
  [TPhase in keyof CompileStageProducts]: Readonly<{
    phase: TPhase;
    inputs: unknown;
    value: CompileStageProducts[TPhase];
    reads: ReadonlyArray<CompileReferenceRead>;
    resources: ReadonlyArray<SceneResource>;
    diagnostics: ReadonlyArray<CompileWarning>;
  }>;
}[keyof CompileStageProducts];

/** 执行器注入的候选缓存，不参与绘图算法 */
export type CompileStageCache = {
  /** 当前作者声明路径对应的阶段缓存 */
  read: (path: PropertyPath, phase: keyof CompileStageProducts) => CompileStageRecord | undefined;
  /** 保存当前阶段及依赖，提交由外层候选事务管理 */
  write: (path: PropertyPath, phase: keyof CompileStageProducts, record: CompileStageRecord, reused: boolean) => void;
};

/** 在相同执行路径中计算或复用阶段，资源与产物始终一起进入本次工作区 */
export const runCompileStage = <TPhase extends keyof CompileStageProducts>(
  runtime: CompileRuntime,
  path: PropertyPath,
  phase: TPhase,
  inputs: unknown,
  compute: (runtime: CompileRuntime) => CompileStageProducts[TPhase],
): CompileStageProducts[TPhase] => {
  const namespace = runtime.state.execution.namespaceStack;
  const previous = runtime.cache?.read(path, phase);
  if (
    previous !== undefined &&
    previous.phase === phase &&
    previous.diagnostics.length === 0 &&
    jsonStructuralEquals(previous.inputs, inputs) &&
    previous.reads.every(read => jsonStructuralEquals(read.entry, namespace.lookupReference(read.name)))
  ) {
    importSceneResources(
      previous.resources,
      runtime.state.workspace.paintRegistry,
      runtime.state.workspace.clipRegistry,
    );
    runtime.cache?.write(path, phase, previous, true);
    // 同一 phase 的计算回调在执行器中固定；缓存入口不跨阶段共享 value
    return previous.value as CompileStageProducts[TPhase];
  }

  const warningCount = runtime.state.workspace.diagnosticCollector.warnings.length;
  const reads: Array<CompileReferenceRead> = [];
  const diagnostics: Array<CompileWarning> = [];
  const workspace = runtime.state.workspace;
  const resourceIds = new Set<string>();
  const retainResource = (id: string): string => {
    resourceIds.add(id);
    return id;
  };
  // 本轮 registry 负责 provider 去重；阶段仅追踪自己引用的资源，避免缓存无关兄弟资源
  const paintRegistry: PaintRegistry = {
    register: paint => {
      const value = workspace.paintRegistry.register(paint);
      if (typeof value === 'object' && value.kind === 'resourceRef') retainResource(value.id);
      return value;
    },
    importResource: resource => {
      const value = workspace.paintRegistry.importResource(resource);
      retainResource(value.id);
      return value;
    },
    getResources: () => workspace.paintRegistry.getResources().filter(resource => resourceIds.has(resource.id)),
  };
  const clipRegistry: ClipRegistry = {
    lower: workspace.clipRegistry.lower,
    register: clip => retainResource(workspace.clipRegistry.register(clip)),
    registerPath: clip => retainResource(workspace.clipRegistry.registerPath(clip)),
    importResource: resource => retainResource(workspace.clipRegistry.importResource(resource)),
    getResources: () => workspace.clipRegistry.getResources().filter(resource => resourceIds.has(resource.id)),
  };
  const local: CompileRuntime = {
    ...runtime,
    state: {
      ...runtime.state,
      workspace: {
        ...runtime.state.workspace,
        paintRegistry,
        clipRegistry,
        diagnosticCollector: {
          warnings: diagnostics,
          collect: warning => {
            diagnostics.push(warning);
            runtime.state.workspace.diagnosticCollector.collect(warning);
          },
        },
      },
    },
  };
  const value = namespace.observeReferences(
    (name, entry) => reads.push({ name, entry }),
    () => compute(local),
  );
  const resources = [...paintRegistry.getResources(), ...clipRegistry.getResources()];
  runtime.cache?.write(
    path,
    phase,
    {
      phase,
      inputs,
      value,
      reads,
      resources,
      diagnostics: runtime.state.workspace.diagnosticCollector.warnings.slice(warningCount),
    } as CompileStageRecord,
    false,
  );
  return value;
};
