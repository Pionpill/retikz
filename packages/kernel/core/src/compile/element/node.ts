import { NodeOwnerOutputSchema } from '../../contract';
import type { IRNode } from '../../schemas';
import { Anchor } from '../../shared';
import { rect } from '../../shared/geometry';
import { compileNodeLayout, emitNodePrimitives, labelExtentPoints, outerRectOf, projectNodeOwnerOutput } from '../node';
import { runElementCompilation } from './context';
import { collectElementObservation } from './observation';
import type { CompiledNode, ElementCompileOptions, ElementCompileResult } from './types';

/** 节点单元素编译上下文 */
export type NodeCompileContext = ElementCompileOptions;

/** 独立编译节点，不登记名称、不递归编译其它元素 */
export const compileNode = (input: IRNode, context: NodeCompileContext): ElementCompileResult<CompiledNode> =>
  runElementCompilation(context, workspace => {
    const layout = compileNodeLayout(input, context.irPath, {
      ...context.environment,
      ...workspace,
      scopeDefaults: context.scope.defaults,
      mode: context.scope.theme.mode,
      childProposal: context.proposal,
    });
    const primitives = emitNodePrimitives(layout, context.environment.round, workspace.paint.register);
    const outer = outerRectOf(layout);
    return Object.freeze({
      layout,
      output: Object.freeze({
        zIndex: input.zIndex,
        primitives,
        resources: workspace.paint.resources(),
        nodeLayouts: context.environment.artifacts?.nodeLayouts
          ? [
              {
                layout,
                scopeChain: [],
                occurrence: context.occurrence ?? { sourcePath: context.irPath, expansionPath: [] },
              },
            ]
          : [],
        observations: collectElementObservation(context, { kind: 'node' }, NodeOwnerOutputSchema, () =>
          projectNodeOwnerOutput(layout, context.environment.round, workspace.nodeGeometry),
        ),
        bounds: [
          {
            points: [Anchor.TopLeft, Anchor.TopRight, Anchor.BottomLeft, Anchor.BottomRight].map(anchor =>
              rect.anchor(outer, anchor),
            ),
            shadow: layout.node.shadow,
          },
          { points: labelExtentPoints(layout) },
        ],
      }),
    });
  });
