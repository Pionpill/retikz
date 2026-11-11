import type {
  CompiledNode,
  CompiledCoordinate,
  CanonicalCoordinate,
  CompiledPath,
  CompiledScope,
  CompileWarning,
  SceneResource,
  ScenePrimitive,
  PaintRegistry,
  ClipRegistry,
  CanonicalNode,
  resolvePath,
  CanonicalScope,
  ReferenceReadKind,
} from '@retikz/core';
import { visitSceneContent } from '@retikz/core';
import type { PropertyPath } from '@retikz/foundation';
import { compareProperties, jsonStructuralEquals } from '@retikz/foundation';

import { compareReferenceGeometry } from '../compare';
import { importSceneResources } from '../shared';
import type { CompileRuntime } from './runtime';
import type { NamespaceEntry } from './state';

/** 一次阶段计算的名称读取事实 */
export type CompileReferenceRead = Readonly<{
  name: string;
  entry?: NamespaceEntry;
  kind: ReferenceReadKind;
}>;

/** 原子阶段对应的实际产物，执行器不可交换不同阶段的缓存 */
type CompileStageProducts = {
  node: { canon: CanonicalNode; compiled: CompiledNode };
  coordinate: { canon: CanonicalCoordinate; compiled: CompiledCoordinate };
  path: { canon: ReturnType<typeof resolvePath>; compiled: CompiledPath };
  scope: { canon: CanonicalScope; compiled: CompiledScope };
};

/** 分离确定化与几何计算，由 Reconciler 比较 canonical 等价性 */
type CompileStageComputation<TPhase extends keyof CompileStageProducts> = {
  /** 子树执行前准备阶段已读取的依赖 */
  preparedReads?: ReadonlyArray<CompileReferenceRead>;
  /** 子树执行前确定化与准备阶段产生的诊断 */
  preparedDiagnostics?: ReadonlyArray<CompileWarning>;
  /** 只影响确定化的输入与上下文 */
  resolveInputs: unknown;
  /** 几何计算的额外上下文 */
  compileInputs: unknown;
  /** 不读取最终布局的确定化阶段 */
  resolve: (runtime: CompileRuntime) => CompileStageProducts[TPhase]['canon'];
  /** 确定化产物的领域比较 */
  equals: (previous: CompileStageProducts[TPhase]['canon'], current: CompileStageProducts[TPhase]['canon']) => boolean;
  /** 消费已确定的属性进行计算 */
  compile: (
    runtime: CompileRuntime,
    canon: CompileStageProducts[TPhase]['canon'],
    previous?: CompileStageProducts[TPhase],
    restoreResources?: (primitives: Array<ScenePrimitive>) => void,
  ) => CompileStageProducts[TPhase];
};

/** 阶段复用依据，不重复保存 Core 阶段产物 */
export type CompileStageMetadata = Readonly<{
  /** 产物所属的原子编译阶段 */
  phase: keyof CompileStageProducts;
  /** 整个阶段快速复用时比较的输入容器 */
  inputs: unknown;
  /** 确定化阶段的输入与上下文 */
  resolveInputs: unknown;
  /** 几何计算依赖的额外上下文 */
  compileInputs: unknown;
  /** 本阶段读取的名称绑定与几何类别 */
  reads: ReadonlyArray<CompileReferenceRead>;
  /** 复用时需要导入当前工作区的资源 */
  resources: ReadonlyArray<SceneResource>;
  /** 本阶段诊断，非空时禁止直接复用以便重新派发 */
  diagnostics: ReadonlyArray<CompileWarning>;
}>;

/** 保留阶段与 Core 产物的对应关系 */
type TypedCompileStageRecord<TPhase extends keyof CompileStageProducts> = CompileStageMetadata & {
  readonly phase: TPhase;
  readonly value: CompileStageProducts[TPhase];
};

/** 缓存存储边界使用的阶段判别联合 */
export type CompileStageRecord = {
  [TPhase in keyof CompileStageProducts]: TypedCompileStageRecord<TPhase>;
}[keyof CompileStageProducts];

/** 执行器注入的候选缓存，不参与绘图算法 */
export type CompileStageCache = {
  /** 当前作者声明路径对应的阶段缓存 */
  read: (path: PropertyPath, phase: keyof CompileStageProducts) => CompileStageRecord | undefined;
  /** 保存当前阶段及依赖，提交由外层候选事务管理 */
  write: (path: PropertyPath, record: CompileStageRecord, reused: boolean) => void;
};

/** 在存储边界检查阶段后恢复泛型关联，TypeScript 不会按泛型键收窄判别联合 */
const readStageRecord = <TPhase extends keyof CompileStageProducts>(
  runtime: CompileRuntime,
  path: PropertyPath,
  phase: TPhase,
): TypedCompileStageRecord<TPhase> | undefined => {
  const record = runtime.cache?.read(path, phase);
  return record?.phase === phase ? (record as TypedCompileStageRecord<TPhase>) : undefined;
};

/** 泛型阶段记录写入异构存储时转为判别联合，阶段与产物由调用签名关联 */
const writeStageRecord = <TPhase extends keyof CompileStageProducts>(
  runtime: CompileRuntime,
  path: PropertyPath,
  record: TypedCompileStageRecord<TPhase>,
  reused: boolean,
): void => {
  runtime.cache?.write(path, record as CompileStageRecord, reused);
};

/** 为必须先向子树提供继承环境的元素复用确定化结果 */
export const readCompileStageCanon = <TPhase extends keyof CompileStageProducts>(
  runtime: CompileRuntime,
  path: PropertyPath,
  phase: TPhase,
  resolveInputs: unknown,
): CompileStageProducts[TPhase]['canon'] | undefined => {
  const previous = readStageRecord(runtime, path, phase);
  return previous !== undefined &&
    previous.diagnostics.length === 0 &&
    compareProperties(previous.resolveInputs, resolveInputs, { depth: 2 })
    ? previous.value.canon
    : undefined;
};

/** 在相同执行路径中计算或复用阶段，资源与产物始终一起进入本次工作区 */
export const runCompileStage = <TPhase extends keyof CompileStageProducts>(
  runtime: CompileRuntime,
  path: PropertyPath,
  phase: TPhase,
  inputs: unknown,
  compute: CompileStageComputation<TPhase>,
): CompileStageProducts[TPhase] => {
  const namespace = runtime.state.execution.namespaceStack;
  const previous = readStageRecord(runtime, path, phase);
  const referencesMatch = () =>
    previous?.reads.every(read => {
      const current = namespace.lookupReference(read.name, read.kind);
      if (current === undefined || read.entry === undefined) return current === read.entry;
      return (
        current.state === read.entry.state &&
        current.scopeId === read.entry.scopeId &&
        jsonStructuralEquals(current.irPath, read.entry.irPath) &&
        compareReferenceGeometry(read.entry.geometry, current.geometry, read.kind)
      );
    }) === true;
  if (
    previous !== undefined &&
    previous.diagnostics.length === 0 &&
    compareProperties(previous.inputs, inputs, { depth: 2 }) &&
    referencesMatch()
  ) {
    importSceneResources(
      previous.resources,
      runtime.state.workspace.paintRegistry,
      runtime.state.workspace.clipRegistry,
    );
    writeStageRecord<TPhase>(runtime, path, previous, true);
    // 同一 phase 的计算回调在执行器中固定；缓存入口不跨阶段共享 value
    return previous.value;
  }

  const warningCount = runtime.state.workspace.diagnosticCollector.warnings.length;
  const reads: Array<CompileReferenceRead> = [...(compute.preparedReads ?? [])];
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
  const previousCanon = previous?.value.canon;
  const canon =
    previous !== undefined &&
    previous.diagnostics.length === 0 &&
    compareProperties(previous.resolveInputs, compute.resolveInputs, { depth: 2 })
      ? previous.value.canon
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
    const value = { ...previous.value, canon };
    writeStageRecord<TPhase>(
      runtime,
      path,
      {
        ...previous,
        inputs,
        value,
        resolveInputs: compute.resolveInputs,
        compileInputs: compute.compileInputs,
      },
      true,
    );
    return value;
  }
  const reusablePrevious =
    previous !== undefined &&
    previous.diagnostics.length === 0 &&
    jsonStructuralEquals(previous.compileInputs, compute.compileInputs) &&
    referencesMatch()
      ? previous.value
      : undefined;
  const value = namespace.observeReferences(
    (name, entry, kind) => reads.push({ name, entry, kind }),
    () =>
      compute.compile(local, canon, reusablePrevious, primitives => {
        if (reusablePrevious === undefined || previous === undefined) return;
        const retained = new Set<string>();
        visitSceneContent({ primitives, resources: [...previous.resources] }, primitive => {
          if (primitive.type === 'group') {
            if (primitive.clipRef !== undefined) retained.add(primitive.clipRef);
          } else if (primitive.type !== 'text') {
            for (const paint of [primitive.fill, primitive.stroke])
              if (typeof paint === 'object' && paint.kind === 'resourceRef') retained.add(paint.id);
          }
        });
        importSceneResources(
          previous.resources.filter(resource => retained.has(resource.id)),
          paintRegistry,
          clipRegistry,
        );
      }),
  );
  // 部分复用 targets/geometry 时不再触发 lookup，仍需保留已验证的引用依赖
  if (reusablePrevious !== undefined && previous !== undefined)
    for (const read of previous.reads)
      if (!reads.some(current => current.name === read.name && current.kind === read.kind)) reads.push(read);
  const resources = [...paintRegistry.getResources(), ...clipRegistry.getResources()];
  writeStageRecord<TPhase>(
    runtime,
    path,
    {
      phase,
      inputs,
      resolveInputs: compute.resolveInputs,
      compileInputs: compute.compileInputs,
      value,
      reads,
      resources,
      diagnostics: [
        ...(compute.preparedDiagnostics ?? []),
        ...runtime.state.workspace.diagnosticCollector.warnings.slice(warningCount),
      ],
    },
    false,
  );
  return value;
};
