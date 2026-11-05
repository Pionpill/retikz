import type { PropertyPath } from '@retikz/foundation';
import type { BoundsInsets, CenteredBox } from '@retikz/math';

import type { SceneClipPath, Transform } from '../../contract';
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

/** 子布局确定后的 Scope 几何阶段产物 */
export type CompiledScope = Pick<CompiledBoundaryGeometry, 'shape' | 'boundary'> &
  Readonly<{
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
  /** 当前诊断位置 */
  irPath: PropertyPath;
  /** 当前诊断接收器 */
  onWarn: (warning: CompileWarning) => void;
}>;
