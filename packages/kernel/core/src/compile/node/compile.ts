import type { CanonicalNode } from '../../resolve';
import { alignmentGuidesOfNode } from './content';
import { emitNode } from './emit';
import { layoutNode } from './layout';
import type { CompiledNode, NodeCompileContext, PreparedNodeCompilation } from './types';

/** 编排当前节点的布局与绘制阶段，消费已准备的产物并补算缺项，不判断跨次复用条件 */
export const compileNode = (
  canon: CanonicalNode,
  context: NodeCompileContext,
  prepared?: PreparedNodeCompilation,
): CompiledNode => {
  const layout = layoutNode(canon, context, prepared?.layout);
  const emit = emitNode(canon, layout.overall, context, prepared?.emit);
  return {
    shape: canon.shape,
    boundary: canon.boundary,
    layout,
    emit,
    alignmentGuides: alignmentGuidesOfNode(layout.overall, context.round),
  };
};
