import type { PropertyPath } from '@retikz/foundation';
import type { CenteredBox } from '@retikz/math';

import type { ScenePrimitive, SceneResource, Transform } from '../../contract';
import type { CanonicalDropShadow, IRPosition, IRScope, IRAnimationTrack } from '../../schemas';
import type { PositionTargetEvaluateContext } from '../reference';
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
  geometry: CompiledScopeGeometry;
  /** 子布局完成后确定的自身变换 */
  transforms: Array<Transform>;
  /** 分组自身的最终身份与排序，不包含子树 */
  style: Pick<IRScope, 'id' | 'meta' | 'zIndex'>;
  /** 已登记的裁剪资源标识 */
  clip?: string;
  /** 分组最终动画 */
  animations: Array<IRAnimationTrack>;
}>;

/** 子元素聚合形成的最终包络，不包含节点文字或 Definition */
export type CompiledScopeGeometry = {
  /** 包络最终矩形；circle 包络的宽高相等 */
  rect: CenteredBox;
};

/** Scope 自身几何声明，不包含子树 */
export type InputScopeCompile = Omit<IRScope, 'children'>;

/** Scope 单次几何计算环境 */
export type ScopeGeometryContext = Readonly<{
  /** 当前位置读取能力 */
  positionContext: PositionTargetEvaluateContext;
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

/** 元素本地可见边界的一项贡献，独立保留阴影语义 */
export type CompileBounds = Readonly<{
  /** 本地边界点 */
  boundsPoints: ReadonlyArray<IRPosition>;
  /** 本项阴影 */
  shadow?: CanonicalDropShadow;
  /** 外框等装饰边界，祖先 clip 可裁减其可见范围 */
  decoration?: boolean;
}>;

/** 与本地资源配套的输出片段，不包含重复的子树 */
export type CompileOutput = Readonly<{
  /** 本元素绘制贡献 */
  primitives: Array<ScenePrimitive>;
  /** 同层输出排序值 */
  zIndex?: number;
  /** 图元引用的局部资源 */
  resources: Array<SceneResource>;
  /** 可见边界贡献 */
  bounds: ReadonlyArray<CompileBounds>;
}>;

/** Scope 放置目标解析只需要父空间引用查询与来源 */
export type ScopePositionResolveContext = Readonly<{
  /** 父坐标系的位置查询与转换 */
  positionContext: PositionTargetEvaluateContext;
  /** Scope 声明来源 */
  irPath: PropertyPath;
}>;
