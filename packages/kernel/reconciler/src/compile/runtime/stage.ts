import type {
  CompiledNode,
  prepareScopePlacement,
  NodeCompileContext,
  PreparedPathCompilation,
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
import type { PropertyPath } from '@retikz/foundation';

import type { CompileRuntime } from './runtime';
import type { NamespaceEntry } from './state';

/** 一次阶段计算的名称读取事实 */
export type CompileReferenceRead = Readonly<{
  /** 实例贡献区分生成名称准备与延迟输出；原子阶段记录不需要此标记 */
  readiness?: 'prepare' | 'output';
  /** 实际请求的名称 */
  name: string;
  /** 读取时的候选绑定，未命中时省略 */
  entry?: NamespaceEntry;
  /** 消费的几何粒度 */
  kind: ReferenceReadKind;
}>;

/** 原子阶段对应的实际产物，执行器不可交换不同阶段的缓存 */
export type CompileStageProducts = {
  node: { canon: CanonicalNode; compiled: CompiledNode };
  coordinate: { canon: CanonicalCoordinate; compiled: CompiledCoordinate };
  path: { canon: ReturnType<typeof resolvePath>; compiled: CompiledPath };
  scope: { canon: CanonicalScope; compiled: CompiledScope };
};

/** 分离确定化与几何计算，由 Reconciler 比较 canonical 等价性 */
export type CompileStageComputation<TPhase extends keyof CompileStageProducts> = {
  /** 子布局开始前已完成的 Scope 放置准备 */
  scopePreparation?: ReturnType<typeof prepareScopePlacement>;
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
  /** 消费已确定的属性进行计算 */
  compile: (
    runtime: CompileRuntime,
    canon: CompileStageProducts[TPhase]['canon'],
    previous?: CompileStageProducts[TPhase],
    restoreResources?: (primitives: Array<ScenePrimitive>) => void,
    /** 旧引用结果是否仍有效；无效时仅可复用不消费引用的局部产物 */
    referencesValid?: boolean,
  ) => CompileStageProducts[TPhase];
};

/** 阶段复用依据，不重复保存 Core 阶段产物 */
export type CompileStageMetadata = Readonly<{
  /** 与当前阶段记录一起生效的 Scope 放置准备 */
  scopePreparation?: ReturnType<typeof prepareScopePlacement>;
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
  /** 依赖最终可见输出的诊断，独立于几何阶段更新 */
  outputDiagnostics?: ReadonlyArray<CompileWarning>;
}>;

/** 保留阶段与 Core 产物的对应关系 */
export type TypedCompileStageRecord<TPhase extends keyof CompileStageProducts> = CompileStageMetadata & {
  readonly phase: TPhase;
  readonly value: CompileStageProducts[TPhase];
};

/** 缓存存储边界使用的阶段判别联合 */
export type CompileStageRecord = {
  [TPhase in keyof CompileStageProducts]: TypedCompileStageRecord<TPhase>;
}[keyof CompileStageProducts];

/** 为一个原子阶段收集实际使用的资源与诊断 */
export const createCompileStageWorkspace = (runtime: CompileRuntime) => {
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
  return { local, diagnostics, paintRegistry, clipRegistry };
};

/** 完整执行一个阶段并收集其产物、读取和副作用 */
export const executeCompileStage = <TPhase extends keyof CompileStageProducts>(
  runtime: CompileRuntime,
  path: PropertyPath,
  phase: TPhase,
  inputs: unknown,
  compute: CompileStageComputation<TPhase>,
): CompileStageProducts[TPhase] => {
  const namespace = runtime.state.execution.namespaceStack;
  const warningCount = runtime.state.workspace.diagnosticCollector.warnings.length;
  const reads: Array<CompileReferenceRead> = [...(compute.preparedReads ?? [])];
  const { local, paintRegistry, clipRegistry } = createCompileStageWorkspace(runtime);
  const canon = compute.resolve(local);
  const value = namespace.observeReferences(
    (name, entry, kind) => reads.push({ name, entry, kind }),
    () => compute.compile(local, canon),
  );
  const resources = [...paintRegistry.getResources(), ...clipRegistry.getResources()];
  runtime.stages?.write(
    path,
    {
      phase,
      inputs,
      scopePreparation: compute.scopePreparation,
      resolveInputs: compute.resolveInputs,
      compileInputs: compute.compileInputs,
      value,
      reads,
      resources,
      diagnostics: [
        ...(compute.preparedDiagnostics ?? []),
        ...runtime.state.workspace.diagnosticCollector.warnings.slice(warningCount),
      ],
    } as CompileStageRecord,
    false,
  );
  return value;
};

/** 驱动提供的阶段执行与记录能力；完整构建只提供写入端 */
export type CompileStageController = {
  /** Node 局部布局复用策略 */
  compileNode?: (
    canon: CanonicalNode,
    context: NodeCompileContext,
    previous?: CompileStageProducts['node'],
    referencesValid?: boolean,
  ) => CompiledNode;
  /** Path 的目标、度量与绘制复用策略 */
  preparePath?: (
    previous: CompileStageProducts['path'],
    current: CompileStageProducts['path']['canon'],
    referencesValid?: boolean,
  ) => { prepared: PreparedPathCompilation; primitives: Array<ScenePrimitive> };
  /** 将阶段记录写入候选事务 */
  write: (path: PropertyPath, record: CompileStageRecord, reused: boolean) => void;
  /** 增量阶段执行策略，未提供时完整执行 */
  execute?: typeof executeCompileStage;
  /** 为先行准备选择仍有效的 canonical */
  readCanon?: <TPhase extends keyof CompileStageProducts>(
    runtime: CompileRuntime,
    path: PropertyPath,
    phase: TPhase,
    inputs: unknown,
  ) => CompileStageProducts[TPhase]['canon'] | undefined;
};

/** 按当前驱动执行阶段，完整构建不检查旧缓存 */
export const runCompileStage: typeof executeCompileStage = (runtime, ...args) =>
  (runtime.stages?.execute ?? executeCompileStage)(runtime, ...args);

/** 读取增量驱动选定的确定化结果 */
export const readCompileStageCanon = <TPhase extends keyof CompileStageProducts>(
  runtime: CompileRuntime,
  path: PropertyPath,
  phase: TPhase,
  inputs: unknown,
): CompileStageProducts[TPhase]['canon'] | undefined => runtime.stages?.readCanon?.(runtime, path, phase, inputs);
