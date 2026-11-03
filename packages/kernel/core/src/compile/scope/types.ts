import type { PropertyPath } from '@retikz/foundation';

import type { Transform } from '../../contract';
import type { PositionTargetResolveContext } from '../../resolve';
import type { CanonicalDropShadow, IRPosition, IRScope } from '../../schemas';
import type { CompiledNodeLayout } from '../node';
import type { CompileWarning } from '../shared';

/** Scope 子元素计算前的准备状态，不代表包络已就绪 */
export type ScopeGeometryPreparation = Readonly<{
  /** 已在父坐标系解析的放置目标 */
  positionTarget?: IRPosition;
  /** 不依赖包络时可提前使用的自身变换 */
  preliminaryTransforms?: Array<Transform>;
}>;

/** 子布局确定后的 Scope 几何阶段产物 */
export type CompiledScope = Readonly<{
  /** 局部内容包络，包含空内容时的退化布局 */
  envelope: CompiledNodeLayout;
  /** 子布局完成后确定的自身变换 */
  transforms: Array<Transform>;
}>;

/** Scope 自身几何声明，不包含子树 */
export type InputScopeCompile = Omit<IRScope, 'children'>;

/** Scope 单次几何计算环境 */
export type ScopeGeometryContext = Readonly<{
  /** 当前位置读取能力 */
  positionContext: PositionTargetResolveContext;
  /** 当前诊断位置 */
  irPath: PropertyPath;
  /** 当前诊断接收器 */
  onWarn: (warning: CompileWarning) => void;
}>;

/** 自动 viewBox 的当前 frame 几何贡献 */
export type LayoutBoundsContribution = {
  /** 包络装饰的可见范围，需要沿祖先裁剪收敛 */
  decoration?: true;
  /** 当前 frame 中的几何点 */
  boundsPoints: Array<IRPosition>;
  /** 与该点集关联的阴影外溢 */
  shadow?: CanonicalDropShadow;
  /** 为 true 时跳过该贡献的父布局占位汇总；省略或 false 时正常参与，不影响实际几何边界 */
  skipAllocation?: boolean;
};
