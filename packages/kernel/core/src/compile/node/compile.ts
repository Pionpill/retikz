import type { IRNode } from '../../schemas';
import type { ElementCompileOptions, ElementCompileResult } from '../context';
import { runElementCompilation } from '../context';
import { emitNodeOutput } from './output';
import { compileNodeState } from './state';
import type { CompiledNode } from './types';

/** 节点单元素编译上下文 */
export type NodeCompileContext = ElementCompileOptions;

/** 独立编译节点，不登记名称、不递归编译其它元素 */
export const compileNode = (input: IRNode, context: NodeCompileContext): ElementCompileResult<CompiledNode> =>
  runElementCompilation(context, workspace => {
    const compilation = compileNodeState(input, context.irPath, {
      shared: context.shared,
      workspace,
      positionContext: workspace.positionContext,
      scopeChain: workspace.scopeChain,
      composedTransform: workspace.composedTransform,
      scopeDefaults: context.context.defaults,
      mode: context.context.theme.mode,
      childProposal: context.proposal,
    });
    const { layout, properties } = compilation;
    const output = emitNodeOutput(compilation, context.shared, workspace);
    return Object.freeze({
      irPath: compilation.irPath,
      layout,
      properties,
      output: Object.freeze({
        zIndex: input.zIndex,
        ...output,
        resources: workspace.paintRegistry.resources(),
      }),
    });
  });
