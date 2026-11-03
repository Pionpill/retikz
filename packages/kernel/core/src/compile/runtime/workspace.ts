import type { ClipRegistry, PaintRegistry } from '../resource';
import { createClipRegistry, createPaintRegistry } from '../resource';
import type { CompileWarning } from '../shared';
import type { SharedCompileContext } from './context';
import type { NodeBoundaryStore } from './node-boundary';
import { createNodeBoundaryStore } from './node-boundary';

/** 单次计算独占的几何、资源与诊断工作区 */
export type WorkspaceCompileState = Readonly<{
  /** 当前计算的连接面缓存与诊断去重状态 */
  nodeBoundaryStore: NodeBoundaryStore;
  /** 当前计算生成的绘制资源 */
  paintRegistry: PaintRegistry;
  /** 当前计算生成的裁剪资源 */
  clipRegistry: ClipRegistry;
  /** 当前计算的诊断收集器，失败或丢弃时不发布 */
  diagnosticCollector: CompileDiagnosticCollector;
}>;

/** 单次计算的诊断收集能力，不负责发布 */
export type CompileDiagnosticCollector = Readonly<{
  /** 已收集的诊断，只通过 collect 追加 */
  warnings: ReadonlyArray<CompileWarning>;
  /** 收集本次计算产生的诊断 */
  collect: (warning: CompileWarning) => void;
}>;

/** 为一次全量、元素或探测计算创建隔离的工作区 */
export const createWorkspaceCompileState = (shared: SharedCompileContext): WorkspaceCompileState => {
  const warnings: Array<CompileWarning> = [];
  const paintRegistry = createPaintRegistry(shared.layout.round);
  const clipRegistry = createClipRegistry(shared.layout.round, shared.limits.maxClipDepth);
  return {
    nodeBoundaryStore: createNodeBoundaryStore(),
    paintRegistry,
    clipRegistry,
    diagnosticCollector: {
      warnings,
      collect: warning => {
        warnings.push(warning);
      },
    },
  };
};
