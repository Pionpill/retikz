import type {
  CompiledNode,
  CompiledCoordinate,
  CanonicalCoordinate,
  CompiledPath,
  CompiledScope,
  CompileWarning,
  SceneResource,
  PaintRegistry,
  ClipRegistry,
  CanonicalNode,
  resolvePath,
  CanonicalScope,
  ReferenceReadKind,
} from '@retikz/core';
import type { PropertyPath } from '@retikz/foundation';
import { jsonStructuralEquals } from '@retikz/foundation';

import { compareReferenceGeometry } from '../compare';
import { importSceneResources } from '../resource';
import type { NamespaceEntry } from './namespace';
import type { CompileRuntime } from './runtime';

/** 一次阶段计算的名称读取事实 */
export type CompileReferenceRead = Readonly<{
  name: string;
  entry: NamespaceEntry | undefined;
  kind: ReferenceReadKind;
}>;

/** 原子阶段对应的实际产物，执行器不可交换不同阶段的缓存 */
export type CompileStageProducts = {
  node: { canon: CanonicalNode; compiled: CompiledNode };
  coordinate: { canon: CanonicalCoordinate; compiled: CompiledCoordinate };
  path: { canon: ReturnType<typeof resolvePath>; compiled: CompiledPath };
  scope: { canon: CanonicalScope; compiled: CompiledScope };
};

/** Core 拥有的各元素确定化产物 */
export type CompileStageCanons = {
  node: CanonicalNode;
  coordinate: CanonicalCoordinate;
  path: ReturnType<typeof resolvePath>;
  scope: CanonicalScope;
};

/** 分离确定化与几何计算，由 Reconciler 比较 canonical 等价性 */
export type CompileStageComputation<TPhase extends keyof CompileStageProducts> = {
  /** 子树执行前准备阶段已读取的依赖 */
  preparedReads?: ReadonlyArray<CompileReferenceRead>;
  /** 子树执行前确定化与准备阶段产生的诊断 */
  preparedDiagnostics?: ReadonlyArray<CompileWarning>;
  /** 只影响确定化的输入与上下文 */
  resolveInputs: unknown;
  /** 几何计算的额外上下文 */
  compileInputs: unknown;
  /** 不读取最终布局的确定化阶段 */
  resolve: (runtime: CompileRuntime) => CompileStageCanons[TPhase];
  /** 确定化产物的领域比较 */
  equals: (previous: CompileStageCanons[TPhase], current: CompileStageCanons[TPhase]) => boolean;
  /** 消费已确定的属性进行计算 */
  compile: (
    runtime: CompileRuntime,
    canon: CompileStageCanons[TPhase],
    previous?: CompileStageProducts[TPhase],
  ) => CompileStageProducts[TPhase];
};

/** 阶段缓存及其有效性依据 */
export type CompileStageRecord = {
  [TPhase in keyof CompileStageProducts]: Readonly<{
    phase: TPhase;
    inputs: unknown;
    canon?: CompileStageCanons[TPhase];
    resolveInputs?: unknown;
    compileInputs?: unknown;
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

/** 比较稀疏输入的直接属性，不向嵌套声明递归补全或结构遍历 */
const compareInputProperties = (previous: unknown, current: unknown): boolean => {
  if (Object.is(previous, current)) return true;
  if (previous === null || current === null || typeof previous !== 'object' || typeof current !== 'object')
    return false;
  const keys = Object.keys(previous);
  return (
    keys.length === Object.keys(current).length &&
    keys.every(key => Object.hasOwn(current, key) && Object.is(Reflect.get(previous, key), Reflect.get(current, key)))
  );
};

/** 阶段输入容器的各项分别做浅属性比较；嵌套声明变化交给 Core 确定化 */
const compareStageInputs = (previous: unknown, current: unknown): boolean => {
  if (Object.is(previous, current)) return true;
  if (previous === null || current === null || typeof previous !== 'object' || typeof current !== 'object')
    return false;
  const keys = Object.keys(previous);
  return (
    keys.length === Object.keys(current).length &&
    keys.every(
      key =>
        Object.hasOwn(current, key) && compareInputProperties(Reflect.get(previous, key), Reflect.get(current, key)),
    )
  );
};

/** 为必须先向子树提供继承环境的元素复用确定化结果 */
export const readCompileStageCanon = <TPhase extends keyof CompileStageProducts>(
  runtime: CompileRuntime,
  path: PropertyPath,
  phase: TPhase,
  resolveInputs: unknown,
): CompileStageCanons[TPhase] | undefined => {
  const previous = runtime.cache?.read(path, phase);
  return previous?.phase === phase &&
    previous.diagnostics.length === 0 &&
    compareStageInputs(previous.resolveInputs, resolveInputs)
    ? (previous.canon as CompileStageCanons[TPhase] | undefined)
    : undefined;
};

/** 在相同执行路径中计算或复用阶段，资源与产物始终一起进入本次工作区 */
export const runCompileStage = <TPhase extends keyof CompileStageProducts>(
  runtime: CompileRuntime,
  path: PropertyPath,
  phase: TPhase,
  inputs: unknown,
  compute: ((runtime: CompileRuntime) => CompileStageProducts[TPhase]) | CompileStageComputation<TPhase>,
): CompileStageProducts[TPhase] => {
  const namespace = runtime.state.execution.namespaceStack;
  const previous = runtime.cache?.read(path, phase);
  const referencesMatch = () =>
    previous?.reads.every(read => {
      const current = namespace.lookupReference(read.name, read.kind);
      if (current === undefined || read.entry === undefined) return current === read.entry;
      return (
        current.state === read.entry.state &&
        current.scopeId === read.entry.scopeId &&
        jsonStructuralEquals(current.irPath, read.entry.irPath) &&
        compareReferenceGeometry(read.entry.context, current.context, read.kind)
      );
    }) === true;
  if (
    previous !== undefined &&
    previous.phase === phase &&
    previous.diagnostics.length === 0 &&
    compareStageInputs(previous.inputs, inputs) &&
    referencesMatch()
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
  const reads: Array<CompileReferenceRead> = typeof compute === 'function' ? [] : [...(compute.preparedReads ?? [])];
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
  let canon: CompileStageCanons[TPhase] | undefined;
  if (typeof compute !== 'function') {
    // phase 与遍历器一一对应，复用只在同一阶段内发生
    const previousCanon =
      previous?.phase === phase ? (previous.canon as CompileStageCanons[TPhase] | undefined) : undefined;
    canon =
      previousCanon !== undefined &&
      previous?.diagnostics.length === 0 &&
      compareStageInputs(previous.resolveInputs, compute.resolveInputs)
        ? previousCanon
        : compute.resolve(local);
    if (
      previousCanon !== undefined &&
      previous !== undefined &&
      previous.diagnostics.length === 0 &&
      diagnostics.length === 0 &&
      compute.equals(previousCanon, canon) &&
      jsonStructuralEquals(previous.compileInputs, compute.compileInputs) &&
      referencesMatch()
    ) {
      importSceneResources(previous.resources, workspace.paintRegistry, workspace.clipRegistry);
      const value = { ...previous.value, canon } as CompileStageProducts[TPhase];
      runtime.cache?.write(
        path,
        phase,
        {
          ...previous,
          inputs,
          canon,
          value,
          resolveInputs: compute.resolveInputs,
          compileInputs: compute.compileInputs,
        } as CompileStageRecord,
        true,
      );
      return value;
    }
  }
  const reusablePrevious =
    typeof compute !== 'function' &&
    previous?.phase === phase &&
    previous.diagnostics.length === 0 &&
    jsonStructuralEquals(previous.compileInputs, compute.compileInputs) &&
    referencesMatch()
      ? (previous.value as CompileStageProducts[TPhase])
      : undefined;
  const value = namespace.observeReferences(
    (name, entry, kind) => reads.push({ name, entry, kind }),
    () => (typeof compute === 'function' ? compute(local) : compute.compile(local, canon!, reusablePrevious)),
  );
  const resources = [...paintRegistry.getResources(), ...clipRegistry.getResources()];
  runtime.cache?.write(
    path,
    phase,
    {
      phase,
      inputs,
      ...(typeof compute === 'function'
        ? {}
        : {
            canon,
            resolveInputs: compute.resolveInputs,
            compileInputs: compute.compileInputs,
          }),
      value,
      reads,
      resources,
      diagnostics: [
        ...(typeof compute === 'function' ? [] : (compute.preparedDiagnostics ?? [])),
        ...runtime.state.workspace.diagnosticCollector.warnings.slice(warningCount),
      ],
    } as CompileStageRecord,
    false,
  );
  return value;
};
