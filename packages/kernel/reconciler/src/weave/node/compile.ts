import { compileNode, evaluatePosition, evaluatePositionTargetWorld } from '@retikz/core';
import type { CanonicalNode, NodeCompileContext } from '@retikz/core';

import type { CompileStageProducts } from '../../compile/runtime';
import { compareNodeLayoutInputs } from './compare';

/** 编译变化的 Node，并保留仍有效的局部布局 */
export const compileWeaveNode = (
  canon: CanonicalNode,
  context: NodeCompileContext,
  previous?: CompileStageProducts['node'],
) => {
  if (previous === undefined || !compareNodeLayoutInputs(previous.canon, canon)) return compileNode(canon, context);
  const position = canon.layout.position;
  if (!Array.isArray(position) && 'kind' in position)
    evaluatePositionTargetWorld(position.target, context.positionContext);
  else evaluatePosition(position, context.positionContext);
  return compileNode(canon, context, { layout: previous.compiled.layout });
};
