import type { NodeBoundaryContext } from '../node';
import { createNodeBoundaryContext } from '../node';
import type { ClipRegistry, PaintRegistry } from '../resource';
import { createClipRegistry, createPaintRegistry } from '../resource';
import type { InputCompileWarning } from '../warning';
import type { SharedCompileContext } from './shared';

/** 单次计算独占的几何、资源与诊断工作区 */
export type WorkspaceCompileContext = {
  /** 当前计算的连接面缓存与诊断去重状态 */
  nodeBoundaryContext: NodeBoundaryContext;
  /** 当前计算生成的绘制资源 */
  paintRegistry: PaintRegistry;
  /** 当前计算生成的裁剪资源 */
  clipRegistry: ClipRegistry;
  /** 当前计算的诊断收集器，失败或丢弃时不发布 */
  diagnostics: {
    /** 已收集的诊断，只通过 collect 追加 */
    readonly warnings: ReadonlyArray<InputCompileWarning>;
    /** 收集本次计算产生的诊断 */
    collect: (warning: InputCompileWarning) => void;
  };
};

/** 为一次全量、元素或探测计算创建隔离的工作区 */
export const createWorkspaceCompileContext = (shared: SharedCompileContext): WorkspaceCompileContext => {
  const warnings: Array<InputCompileWarning> = [];
  return {
    nodeBoundaryContext: createNodeBoundaryContext(),
    paintRegistry: createPaintRegistry(shared.layout.round),
    clipRegistry: createClipRegistry(shared.layout.round, shared.limits.maxClipDepth),
    diagnostics: {
      warnings,
      collect: warning => {
        warnings.push(warning);
      },
    },
  };
};
