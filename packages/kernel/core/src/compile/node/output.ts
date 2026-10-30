import { formatPropertyPath } from '@retikz/foundation';

import type { ScenePrimitive } from '../../contract';
import type { CanonicalDropShadow, IRPosition } from '../../schemas';
import { Anchor } from '../../shared';
import { rect } from '../../shared/geometry';
import type { SharedCompileContext, WorkspaceCompileContext } from '../context';
import { outerRectOf } from './anchors';
import { emitNodePrimitives } from './emit';
import { labelExtentPoints } from './label/geometry';
import type { NodeCompilation } from './types';

/** 从已完成的节点布局生成图元及边界；资源和诊断归属显式工作区 */
export const emitNodeOutput = (
  compilation: NodeCompilation,
  shared: SharedCompileContext,
  workspace: WorkspaceCompileContext,
): {
  primitives: Array<ScenePrimitive>;
  bounds: Array<{ boundsPoints: Array<IRPosition>; shadow?: CanonicalDropShadow }>;
} => {
  const { layout, properties } = compilation;
  const primitives = emitNodePrimitives(compilation, shared.layout.round, workspace.paintRegistry.register);
  workspace.paintRegistry.collectReferences(primitives, `Node at ${formatPropertyPath(compilation.irPath)}`);
  const outer = outerRectOf(layout);
  return {
    primitives,
    bounds: [
      {
        boundsPoints: [Anchor.TopLeft, Anchor.TopRight, Anchor.BottomLeft, Anchor.BottomRight].map(anchor =>
          rect.anchor(outer, anchor),
        ),
        shadow: properties.shadow,
      },
      { boundsPoints: labelExtentPoints(layout) },
    ],
  };
};
