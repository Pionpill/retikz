import type { IRNode } from '../../schemas';
import { Anchor } from '../../shared';
import { rect } from '../../shared/geometry';
import { compileNodeState, emitNodePrimitives, labelExtentPoints, outerRectOf } from '../node';
import { runElementCompilation } from './context';
import type { CompiledNode, ElementCompileOptions, ElementCompileResult } from './types';

/** 节点单元素编译上下文 */
export type NodeCompileContext = ElementCompileOptions;

/** 独立编译节点，不登记名称、不递归编译其它元素 */
export const compileNode = (input: IRNode, context: NodeCompileContext): ElementCompileResult<CompiledNode> =>
  runElementCompilation(context, workspace => {
    const compilation = compileNodeState(input, context.irPath, {
      ...context.environment,
      ...workspace,
      scopeDefaults: context.context.defaults,
      mode: context.context.theme.mode,
      childProposal: context.proposal,
    });
    const { layout, properties } = compilation;
    const primitives = emitNodePrimitives(compilation, context.environment.round, workspace.paint.register);
    const outer = outerRectOf(layout);
    return Object.freeze({
      irPath: compilation.irPath,
      layout,
      properties,
      output: Object.freeze({
        zIndex: input.zIndex,
        primitives,
        resources: workspace.paint.resources(),
        bounds: [
          {
            boundsPoints: [Anchor.TopLeft, Anchor.TopRight, Anchor.BottomLeft, Anchor.BottomRight].map(anchor =>
              rect.anchor(outer, anchor),
            ),
            shadow: properties.shadow,
          },
          { boundsPoints: labelExtentPoints(layout) },
        ],
      }),
    });
  });
