import type { PropertyPath, WithRequiredProperties } from '@retikz/foundation';
import type { BoundsInsets, CenteredBox } from '@retikz/math';

import type { GroupPrimitive, SceneClipPath, Transform } from '../../contract';
import type { IRPosition, IRScope, IRAnimationTrack } from '../../schemas';
import type { CompiledBoundaryGeometry } from '../boundary';
import type { CompiledReferenceGeometry, PositionTargetEvaluateContext } from '../reference';
import type { ClipRegistry } from '../resource';
import type { CompileWarning } from '../shared';

/** Scope 子元素计算前的准备状态，不代表包络已就绪 */
export type ScopePlacementPreparation = Readonly<{
  /** 已在父坐标系解析的放置目标 */
  positionTarget?: IRPosition;
  /** 不依赖包络时可提前使用的自身变换 */
  preliminaryTransforms?: Array<Transform>;
}>;

/** Scope 编译结果，不持有子树图元或跨次失效状态 */
export type CompiledScope = Pick<CompiledBoundaryGeometry, 'shape' | 'boundary'> &
  Readonly<{
    /** 完整布局与本次已知的局部产物 */
    layout: WithRequiredProperties<PreparedScopeLayout, 'overall'>;
    /** 分组自身绘制属性与已知裁剪产物 */
    emit: WithRequiredProperties<PreparedScopeEmit, 'overall'>;
    /** 父级输出排序所需的当前声明 */
    zIndex?: IRScope['zIndex'];
  }>;

/** Scope 完整布局计算结果，不含能力绑定 */
export type CompiledScopeLayout = {
  /** 子元素形成的局部包络 */
  geometry: CompiledScopeGeometry;
  /** 包络确定后的最终自身变换 */
  transforms: Array<Transform>;
};

/** 调用方确认有效的 Scope 布局产物 */
export type PreparedScopeLayout = {
  /** 整体命中跳过布局计算，不反推局部产物 */
  overall?: CompiledScopeLayout;
  /** 子布局聚合得到的包络 */
  envelope?: CompiledScopeGeometry;
  /** 子树执行前冻结的引用与初步变换；对象内缺省字段仍代表已计算 */
  preparation?: ScopePlacementPreparation;
  /** 包络确定后的最终自身变换 */
  placement?: CompiledScopeLayout['transforms'];
};

/** 调用方保证当前外观、动画与资源环境有效的 Scope 绘制产物 */
export type PreparedScopeEmit = {
  /** 完整分组属性，不包含 children；整体命中不反推局部结果 */
  overall?: Omit<GroupPrimitive, 'children'>;
  /** 已完成裁剪登记；空对象代表无裁剪，复用前由调用方恢复资源 */
  clip?: Pick<GroupPrimitive, 'clipRef'>;
};

/** Scope 可复用阶段产物，Core 不判断跨次有效性 */
export type PreparedScopeCompilation = {
  /** 完整或局部布局 */
  layout?: PreparedScopeLayout;
  /** 完整或局部绘制 */
  emit?: PreparedScopeEmit;
};

/** 子元素聚合形成的最终包络，不包含节点文字 */
export type CompiledScopeGeometry = {
  /** 包络最终矩形；circle 包络的宽高相等 */
  rect: CenteredBox;
  /** 包络连接外扩距离，默认四边均为零 */
  margin: BoundsInsets;
};

/** Scope 自身几何声明，不包含子树 */
export type InputScopeCompile = Omit<IRScope, 'children'>;

/** 分组编译使用的子布局、定位、裁剪与诊断能力 */
export type ScopeCompileContext = Readonly<{
  /** 当前位置读取能力 */
  positionContext: PositionTargetEvaluateContext;
  /** 当前子元素的布局贡献 */
  layouts: ReadonlyArray<CompiledReferenceGeometry>;
  /** 已由调用方解析的裁剪路径 */
  resolvedClipPath?: SceneClipPath;
  /** 登记已绑定的裁剪 */
  registerClip: ClipRegistry['register'];
  /** 登记已生成的裁剪路径 */
  registerClipPath: ClipRegistry['registerPath'];
  /** 调用方在真实子输出收尾后解析的动画；省略表示尚无动画 */
  animations?: Array<IRAnimationTrack>;
  /** 当前诊断位置 */
  irPath: PropertyPath;
  /** 当前诊断接收器 */
  onWarn: (warning: CompileWarning) => void;
}>;
