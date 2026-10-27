import type { LayoutProposal, Transform } from '../../contract';
import type { MergedScopeDefaults } from '../../resolve';
import { resolveNode } from '../../resolve';
import type { PositionTargetResolveContext } from '../../resolve/position';
import type { IRNode } from '../../schemas';
import type { CanonicalTheme } from '../../shared';
import type { CompileWarningCode } from '../constants';
import type { CompileEnvironment } from '../environment';
import { filterAnimations } from '../orchestration';
import type { ComposedScopeTransform } from '../transform';
import type { InputCompileWarning } from '../warning';
import type { NodeGeometryContext } from './geometry-context';
import { compileNodeResolution } from './layout';
import type { NodeCompilation } from './types';

/** 节点解析与布局所需的显式调用环境 */
type NodeLayoutCompileContext = Pick<
  CompileEnvironment,
  'shapes' | 'boundaries' | 'patterns' | 'round' | 'labelDistance' | 'measureText' | 'rootFontSize' | 'lowerTex'
> & {
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
  /** 本次独占的几何缓存 */
  nodeGeometry: NodeGeometryContext;
  /** 当前布局约束 */
  childProposal?: LayoutProposal;
  /** 本次诊断接收器 */
  onWarn: (warning: InputCompileWarning) => void;
};

/** 从自身输入完成节点解析、测量和定位；不登记名称或写入外部输出容器 */
export const compileNodeState = (
  child: IRNode,
  nodeIrPath: string,
  context: NodeLayoutCompileContext,
): NodeCompilation => {
  const scopeChain = context.scopeChain;
  const warn = (code: CompileWarningCode, message: string): void => context.onWarn({ code, message, path: nodeIrPath });
  const resolvedNode = resolveNode(child, {
    scopeDefaults: context.scopeDefaults,
    mode: context.mode,
    shapes: context.shapes,
    boundaries: context.boundaries,
    patterns: context.patterns,
    round: context.round,
    irPath: nodeIrPath,
    warn,
    labelDistance: context.labelDistance,
  });
  const canonicalNode = {
    ...resolvedNode.node,
    animations: filterAnimations(resolvedNode.node.animations, {
      target: 'element',
      onWarn: context.onWarn,
      irPath: nodeIrPath,
    }),
  };

  return compileNodeResolution(
    { ...resolvedNode, node: canonicalNode },
    {
      measureText: context.measureText,
      geometryContext: context.nodeGeometry,
      positionContext: context.positionContext,
      composedTransform: context.composedTransform,
      rootFontSize: context.rootFontSize,
      scopeChain,
      warn,
      ...(context.childProposal?.x === undefined ? {} : { allocationWidthProposal: context.childProposal.x }),
      texLowering: {
        lowerTex: context.lowerTex,
        warn: (code, message) => context.onWarn({ code, message, path: nodeIrPath }),
      },
    },
  );
};
