import type { SharedCompileContext } from '../../context';
import type { ClipRegistry, CollectResourceReferences, CompileResourceReference, PaintRegistry } from '../../resource';
import {
  collectPrimitiveResourceReferences,
  createClipRegistry,
  createPaintRegistry,
  validateCompileResourceReferences,
} from '../../resource';
import type { CompileWarning } from '../../shared';
import type { NodeBoundaryContext } from '../node';
import { createNodeBoundaryContext } from '../node';

/** 单次计算独占的几何、资源与诊断工作区 */
export type WorkspaceCompileContext = {
  /** 当前计算的连接面缓存与诊断去重状态 */
  nodeBoundaryContext: NodeBoundaryContext;
  /** 当前计算生成的绘制资源 */
  paintRegistry: PaintRegistry;
  /** 当前计算生成的裁剪资源 */
  clipRegistry: ClipRegistry;
  /** 收集图元引用，保留首次输出处的诊断位置 */
  collectResourceReferences: CollectResourceReferences;
  /** 在资源齐备后检查引用及 Pattern 依赖 */
  validateResourceReferences: () => void;
  /** 当前计算的诊断收集器，失败或丢弃时不发布 */
  diagnostics: {
    /** 已收集的诊断，只通过 collect 追加 */
    readonly warnings: ReadonlyArray<CompileWarning>;
    /** 收集本次计算产生的诊断 */
    collect: (warning: CompileWarning) => void;
  };
};

/** 为一次全量、元素或探测计算创建隔离的工作区 */
export const createWorkspaceCompileContext = (shared: SharedCompileContext): WorkspaceCompileContext => {
  const warnings: Array<CompileWarning> = [];
  const paintRegistry = createPaintRegistry(shared.layout.round);
  const clipRegistry = createClipRegistry(shared.layout.round, shared.limits.maxClipDepth);
  const references = new Map<string, CompileResourceReference>();
  return {
    nodeBoundaryContext: createNodeBoundaryContext(),
    paintRegistry,
    clipRegistry,
    collectResourceReferences: (primitives, owner) => {
      for (const reference of collectPrimitiveResourceReferences(primitives, owner)) {
        const key = `${reference.kind}:${reference.id}`;
        if (!references.has(key)) references.set(key, reference);
      }
    },
    validateResourceReferences: () =>
      validateCompileResourceReferences(references.values(), [
        ...paintRegistry.getResources(),
        ...clipRegistry.getResources(),
      ]),
    diagnostics: {
      warnings,
      collect: warning => {
        warnings.push(warning);
      },
    },
  };
};
