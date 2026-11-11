import { compileNode, evaluatePosition, evaluatePositionTargetWorld } from '@retikz/core';
import type { CanonicalNode, NodeCompileContext } from '@retikz/core';
import { jsonStructuralEquals } from '@retikz/foundation';

import type { CompileStageProducts } from '../../compile/runtime';
import { compareNodeLayoutInputs, compareNodeMeasurementInputs } from './compare';

/** 编译变化的 Node，并保留仍有效的局部布局 */
export const compileWeaveNode = (
  canon: CanonicalNode,
  context: NodeCompileContext,
  previous?: CompileStageProducts['node'],
  referencesValid = true,
) => {
  if (previous === undefined) return compileNode(canon, context);
  if (!referencesValid || !compareNodeLayoutInputs(previous.canon, canon)) {
    const measured = compareNodeMeasurementInputs(previous.canon, canon);
    return compileNode(canon, context, {
      layout: {
        ...(measured ? { content: previous.compiled.layout.content, shape: previous.compiled.layout.shape } : {}),
        labels: canon.labels.map((label, index) => ({
          measurement: jsonStructuralEquals(previous.canon.labels[index]?.text, label.text)
            ? previous.compiled.layout.labels?.[index]?.measurement
            : undefined,
        })),
      },
    });
  }
  const position = canon.layout.position;
  if (!Array.isArray(position) && 'kind' in position)
    evaluatePositionTargetWorld(position.target, context.positionContext);
  else evaluatePosition(position, context.positionContext);
  return compileNode(canon, context, { layout: previous.compiled.layout });
};
