import type {
  CompiledBoundaryGeometry,
  CompileOccurrenceLocator,
  CompileWarning,
  LayoutProposal,
  Transform,
  CanonicalScopeInheritance,
  PositionTargetEvaluateContext,
  ComposedScopeTransform,
} from '@retikz/core';
import {
  createPositionEvaluateContext,
  composeScopeTransform,
  resolveNodeBoundary,
  RetikzCoreError,
  RetikzCoreErrorCode,
  registerFatalProbeError,
} from '@retikz/core';
import type { PropertyPath } from '@retikz/foundation';
import { formatPropertyPath } from '@retikz/foundation';
import { orderCompileWarnings, withCompileWarningOccurrence } from '@retikz/reconciler';

import type { SharedCompileContext, WorkspaceCompileState } from '../../src/compile';
import { createWorkspaceCompileState } from '../../src/compile';
import { RetikzReconcilerError, RetikzReconcilerErrorCode } from '../../src/error';

/** 候选版本中的名称绑定，身份对应稳定的 Weave 节点 */
export type WeaveBinding =
  | Readonly<{ state: 'pending'; binding: object }>
  | Readonly<{ state: 'ready'; binding: object; irPath?: PropertyPath; layout: CompiledBoundaryGeometry }>;

/** 声明位置可见的名称 frame */
export type WeaveNamespace = Readonly<{
  /** 当前 frame 的声明绑定 */
  bindings: ReadonlyMap<string, WeaveBinding>;
  /** 外层可见 frame */
  parent?: WeaveNamespace;
}>;

/** 一次名称查找经过的 frame，包含未命中事实 */
export type WeaveCompileRead = Readonly<{
  /** 实际访问的 frame */
  namespace: WeaveNamespace;
  /** 查询名称 */
  name: string;
  /** 查询结果 */
  state: 'missing' | 'pending' | 'ready';
  /** 命中项对应的稳定节点 */
  binding?: object;
}>;

/** Weave 驱动独有的计算输入，不传入 Core 原子阶段 */
export type WeaveCompileOptions = Readonly<{
  /** 稳定环境 */
  shared: SharedCompileContext;
  /** 当前有效样式 */
  style: CanonicalScopeInheritance;
  /** 来源路径 */
  irPath: PropertyPath;
  /** 祖先变换 */
  transforms?: ReadonlyArray<Transform>;
  /** 布局提案 */
  proposal?: LayoutProposal;
  /** 编译出现位置 */
  occurrence?: CompileOccurrenceLocator;
  /** 声明位置可见的名称链 */
  namespace?: WeaveNamespace;
  /** 禁止引用的祖先绑定 */
  ancestorScopes?: ReadonlySet<object>;
}>;

/** 一次候选尝试的环境与独占工作区，仅供驱动组合阶段 */
export type WeaveElementRuntime = Readonly<{
  /** 驱动输入 */
  options: WeaveCompileOptions;
  /** 当前局部坐标解释能力 */
  positionContext: PositionTargetEvaluateContext;
  /** 已合成变换 */
  composedTransform: ComposedScopeTransform;
  /** 本次尝试独占资源、几何缓存与诊断 */
  workspace: WorkspaceCompileState;
}>;

/** 等待不携带半成品，读取事实由驱动保留 */
export type WeaveCompileResult<TCompiled> = (
  | Readonly<{ status: 'compiled'; compiled: TCompiled; diagnostics: ReadonlyArray<CompileWarning> }>
  | Readonly<{ status: 'pending' }>
) &
  Readonly<{
    /** 本次实际读取的名称与绑定 */
    reads: ReadonlyArray<WeaveCompileRead>;
  }>;

/** 按 inside-out 读取名称，并按需记录每个访问的 frame */
export const lookupWeaveBinding = (
  namespace: WeaveNamespace | undefined,
  name: string,
  reads?: Array<WeaveCompileRead>,
): WeaveBinding | undefined => {
  for (let frame = namespace; frame !== undefined; frame = frame.parent) {
    const entry = frame.bindings.get(name);
    reads?.push(
      Object.freeze({
        namespace: frame,
        name,
        state: entry?.state ?? 'missing',
        ...(entry === undefined ? {} : { binding: entry.binding }),
      }),
    );
    if (entry !== undefined) return entry;
  }
  return undefined;
};

/** 隔离一次候选计算，适配引用并在成功时收集产物与诊断 */
export const runWeaveCompilation = <TCompiled>(
  options: WeaveCompileOptions,
  compile: (runtime: WeaveElementRuntime) => TCompiled,
): WeaveCompileResult<TCompiled> => {
  const reads: Array<WeaveCompileRead> = [];
  const workspace = createWorkspaceCompileState(options.shared);
  const transforms = options.transforms ?? [];
  const composedTransform = composeScopeTransform(transforms);
  let pending: RetikzReconcilerError | undefined;
  const positionContext = createPositionEvaluateContext({
    nodeDistance: options.shared.layout.nodeDistance,
    transformChain: transforms,
    composedTransform,
    nodeBoundaryStore: workspace.nodeBoundaryStore,
    lookupReference: name => {
      const entry = lookupWeaveBinding(options.namespace, name, reads);
      if (entry === undefined) return undefined;
      if (options.ancestorScopes?.has(entry.binding)) {
        throw new RetikzCoreError(
          RetikzCoreErrorCode.Compile,
          `Geometry reference cannot target ancestor Scope '${name}'`,
        );
      }
      if (entry.state === 'pending') {
        if (pending === undefined) {
          pending = new RetikzReconcilerError(RetikzReconcilerErrorCode.Compile, 'Element dependency is pending');
          registerFatalProbeError(pending);
        }
        throw pending;
      }
      return { state: 'resolved', geometry: entry.layout, irPath: entry.irPath };
    },
    resolveExplicitBoundary: (boundary, reference) =>
      resolveNodeBoundary(boundary, {
        ...reference,
        shapeRegistry: options.shared.registries.shapeRegistry,
        boundaryRegistry: options.shared.registries.boundaryRegistry,
      }),
  });
  try {
    const compiled = compile({ options, workspace, positionContext, composedTransform });
    return Object.freeze({
      status: 'compiled',
      compiled,
      reads: Object.freeze(reads),
      diagnostics: Object.freeze(
        orderCompileWarnings(
          workspace.diagnosticCollector.warnings.map(warning =>
            withCompileWarningOccurrence(warning, options.occurrence),
          ),
        ),
      ),
    });
  } catch (error) {
    if (pending !== undefined && error === pending)
      return Object.freeze({ status: 'pending', reads: Object.freeze(reads) });
    if (error instanceof RetikzCoreError) throw error;
    throw new RetikzReconcilerError(
      RetikzReconcilerErrorCode.Compile,
      `Element compilation failed at ${formatPropertyPath(options.irPath)}`,
      { cause: error },
    );
  }
};
