import type { PropertyPath } from '@retikz/foundation';

import type { LayoutProposal, Transform } from '../../../contract';
import { resolveAnimations, resolveNode } from '../../../resolve';
import type { MergedScopeDefaults, PositionTargetResolveContext } from '../../../resolve';
import type { IRNode } from '../../../schemas';
import type { CanonicalTheme } from '../../../shared';
import type { SharedCompileContext, WorkspaceCompileState } from '../../runtime';
import type { CompileWarningCode, ComposedScopeTransform } from '../../shared';
import type { ElementCompileOptions, ElementCompileResult } from '../shared';
import { runElementCompilation } from '../shared';
import { compileNodeResolution } from './layout';
import { emitNodeOutput } from './output';
import type { CompiledNode, NodeCompilation } from './types';

/** 节点单元素编译上下文 */
export type NodeCompileContext = ElementCompileOptions;

/** 独立编译节点，不登记名称、不递归编译其它元素 */
export const compileNode = (input: IRNode, context: NodeCompileContext): ElementCompileResult<CompiledNode> =>
  runElementCompilation(context, runtime => {
    const { workspace } = runtime.state;
    const compilation = compileNodeState(input, context.irPath, {
      shared: context.shared,
      workspace,
      positionContext: runtime.context.positionContext,
      scopeChain: runtime.context.transformChain,
      composedTransform: runtime.context.composedTransform,
      scopeDefaults: context.style.defaults,
      mode: context.style.theme.mode,
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
        resources: workspace.paintRegistry.getResources(),
      }),
    });
  });

/** 节点解析与布局所需的显式调用环境 */
type NodeLayoutCompileContext = {
  /** 共享定义与配置 */
  shared: SharedCompileContext;
  /** 当前计算的公共工作区 */
  workspace: WorkspaceCompileState;
  /** 有效样式默认配置 */
  scopeDefaults: MergedScopeDefaults;
  /** 有效主题模式 */
  mode: CanonicalTheme['mode'];
  /** 显式位置读取能力 */
  positionContext: PositionTargetResolveContext;
  /** 当前变换 */
  composedTransform: ComposedScopeTransform;
  /** 父 Scope 的变换链 */
  scopeChain: ReadonlyArray<Transform>;
  /** 当前布局约束 */
  childProposal?: LayoutProposal;
};

/** 从自身输入完成节点解析、测量和定位；不登记名称或写入外部输出容器 */
export const compileNodeState = (
  child: IRNode,
  nodeIrPath: PropertyPath,
  context: NodeLayoutCompileContext,
): NodeCompilation => {
  const scopeChain = context.scopeChain;
  const warn = (code: CompileWarningCode, message: string): void =>
    context.workspace.diagnosticCollector.collect({ code, message, path: nodeIrPath });
  const resolvedNode = resolveNode(child, {
    scopeDefaults: context.scopeDefaults,
    mode: context.mode,
    shapeRegistry: context.shared.registries.shapeRegistry,
    boundaryRegistry: context.shared.registries.boundaryRegistry,
    patternRegistry: context.shared.registries.patternRegistry,
    round: context.shared.layout.round,
    irPath: nodeIrPath,
    warn,
    labelDistance: context.shared.layout.labelDistance,
  });
  const canonicalNode = {
    ...resolvedNode.node,
    animations: resolveAnimations(resolvedNode.node.animations, {
      target: 'element',
      onWarn: context.workspace.diagnosticCollector.collect,
      irPath: nodeIrPath,
    }),
  };

  return compileNodeResolution(
    { ...resolvedNode, node: canonicalNode },
    {
      measureText: context.shared.host.measureText,
      nodeBoundaryStore: context.workspace.nodeBoundaryStore,
      positionContext: context.positionContext,
      composedTransform: context.composedTransform,
      rootFontSize: context.shared.layout.rootFontSize,
      scopeChain,
      warn,
      ...(context.childProposal?.x === undefined ? {} : { allocationWidthProposal: context.childProposal.x }),
      texLowering: {
        lowerTex: context.shared.host.lowerTex,
        warn: (code, message) => context.workspace.diagnosticCollector.collect({ code, message, path: nodeIrPath }),
      },
    },
  );
};
