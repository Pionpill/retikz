import type {
  CanonicalCoordinate,
  CanonicalNode,
  CanonicalScope,
  CompiledCoordinate,
  CompiledNode,
  CompiledPath,
  CompiledScope,
  CompileWarning,
  PathResolution,
  InputPathCompilation,
  SceneResource,
  ReferenceReadKind,
  PaintRegistry,
  ClipRegistry,
  ScopeCompileContext,
  prepareScopePlacement,
} from '@retikz/core';
import type { PropertyPath } from '@retikz/foundation';

import type { SubtreeCompileRuntime } from '../execution';
import type { CompileRuntime } from './runtime';
import type { NamespaceEntry } from './state';

/** 一次计算实际发生的名称读取 */
export type CompileReferenceRead = Readonly<{
  /** 实例贡献中区分准备读取与延迟输出读取 */
  readiness?: 'prepare' | 'output';
  /** 请求的名称 */
  name: string;
  /** 读取时的候选绑定，缺失时省略 */
  entry?: NamespaceEntry;
  /** 实际消费的几何粒度 */
  kind: ReferenceReadKind;
}>;

/** 本次计算使用的资源、引用和诊断，不包含跨批复用策略 */
export type CompileObservationFacts = Readonly<{
  /** 本次实际消费的名称绑定与几何粒度 */
  reads: ReadonlyArray<CompileReferenceRead>;
  /** 本次实际登记或导入的资源 */
  resources: ReadonlyArray<SceneResource>;
  /** 本轮工作区收集的计算诊断 */
  diagnostics: ReadonlyArray<CompileWarning>;
}>;

/** 首轮完整构建交付的 Core 实际产物 */
export type CompiledElement =
  | { kind: 'coordinate'; canon: CanonicalCoordinate; compiled: CompiledCoordinate }
  | { kind: 'node'; canon: CanonicalNode; compiled: CompiledNode }
  | { kind: 'path'; path: InputPathCompilation['path']; canon: PathResolution; compiled: CompiledPath }
  | {
      kind: 'scope';
      canon: CanonicalScope;
      compiled: CompiledScope;
      /** 子布局开始前的放置准备 */
      preparation: ReturnType<typeof prepareScopePlacement>;
      /** 包络计算实际消费的子布局 */
      layouts: ScopeCompileContext['layouts'];
      /** 包络计算时的子输出数量 */
      childCount: number;
      /** 调用方已确定的裁剪路径 */
      resolvedClipPath: ScopeCompileContext['resolvedClipPath'];
      /** 依赖最终可见输出的诊断 */
      outputDiagnostics: ReadonlyArray<CompileWarning>;
    };

/** 只接收已完成的编译事实，不控制计算或查询旧结果 */
export type CompileObserver = (
  path: PropertyPath,
  context: SubtreeCompileRuntime['context'],
  element: CompiledElement,
  facts: CompileObservationFacts,
) => void;

/** 捕获本次计算的资源与诊断，计算和提交由调用方负责 */
export const createCompileObservation = (runtime: CompileRuntime) => {
  const reads: Array<CompileReferenceRead> = [];
  const diagnostics: Array<CompileWarning> = [];
  const workspace = runtime.state.workspace;
  const warningCount = workspace.diagnosticCollector.warnings.length;
  const resourceIds = new Set<string>();
  const retainResource = (id: string): string => {
    resourceIds.add(id);
    return id;
  };
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
        ...workspace,
        paintRegistry,
        clipRegistry,
        diagnosticCollector: {
          warnings: diagnostics,
          collect: warning => {
            diagnostics.push(warning);
            workspace.diagnosticCollector.collect(warning);
          },
        },
      },
    },
  };
  return {
    runtime: local,
    reads,
    diagnostics,
    read: (name: string, entry: NamespaceEntry | undefined, kind: ReferenceReadKind) =>
      reads.push({ name, entry, kind }),
    facts: (): CompileObservationFacts => ({
      reads,
      resources: [...paintRegistry.getResources(), ...clipRegistry.getResources()],
      diagnostics: workspace.diagnosticCollector.warnings.slice(warningCount),
    }),
  };
};
