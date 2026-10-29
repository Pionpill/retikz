import type { LayoutProposal, Transform } from '../../contract';
import type { MergedScopeDefaults } from '../../resolve';
import { resolveNode } from '../../resolve';
import type { PositionTargetResolveContext } from '../../resolve/position';
import type { IRNode } from '../../schemas';
import type { CanonicalTheme } from '../../shared';
import type { CompileWarningCode } from '../constants';
import type { WorkspaceCompileContext, SharedCompileContext } from '../context';
import { filterAnimations } from '../orchestration';
import type { ComposedScopeTransform } from '../transform';
import { compileNodeResolution } from './layout';
import type { NodeCompilation } from './types';

/** 节点解析与布局所需的显式调用环境 */
type NodeLayoutCompileContext = {
  /** 共享定义与配置 */
  shared: SharedCompileContext;
  /** 当前计算的公共工作区 */
  workspace: WorkspaceCompileContext;
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
  nodeIrPath: string,
  context: NodeLayoutCompileContext,
): NodeCompilation => {
  const scopeChain = context.scopeChain;
  const warn = (code: CompileWarningCode, message: string): void =>
    context.workspace.diagnostics.collect({ code, message, path: nodeIrPath });
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
    animations: filterAnimations(resolvedNode.node.animations, {
      target: 'element',
      onWarn: context.workspace.diagnostics.collect,
      irPath: nodeIrPath,
    }),
  };

  return compileNodeResolution(
    { ...resolvedNode, node: canonicalNode },
    {
      measureText: context.shared.host.measureText,
      nodeBoundaryContext: context.workspace.nodeBoundaryContext,
      positionContext: context.positionContext,
      composedTransform: context.composedTransform,
      rootFontSize: context.shared.layout.rootFontSize,
      scopeChain,
      warn,
      ...(context.childProposal?.x === undefined ? {} : { allocationWidthProposal: context.childProposal.x }),
      texLowering: {
        lowerTex: context.shared.host.lowerTex,
        warn: (code, message) => context.workspace.diagnostics.collect({ code, message, path: nodeIrPath }),
      },
    },
  );
};
