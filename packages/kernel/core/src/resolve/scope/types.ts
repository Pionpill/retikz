import type { PropertyPath } from '@retikz/foundation';

import type { ThemeDefinition, ShapeDefinition, ClipDefinition } from '../../contract';
import type { ProviderRegistry } from '../../providers';
import type { IRScope, IRScopePosition, IRTransform, ScopeBoundingShape, IRAnimationTrack } from '../../schemas';
import type { CanonicalTheme } from '../../shared';
import type { CanonicalNodeShape } from '../node';
import type { CanonicalPolarPosition, CanonicalBetweenPosition, CanonicalOffsetPosition } from '../position';
import type { ClipResolution } from '../resource';
import type { MergedScopeDefaults } from '../style';

/** Scope 向下传递的已确定默认配置与主题 */
export type CanonicalScopeInheritance = Readonly<{
  /** 合并后的子元素默认配置 */
  defaults: MergedScopeDefaults;
  /** 当前作用域生效的主题 */
  theme: CanonicalTheme;
}>;

/** 静态默认值及嵌套位置均已补全的作用域变换步骤 */
export type CanonicalScopeTransformStep =
  | Required<Extract<IRTransform, { kind: 'rotate' | 'scale' | 'translate' | 'at-translate' }>>
  | ({ kind: 'polar-translate' } & CanonicalPolarPosition)
  | ({ kind: 'offset-translate' } & CanonicalOffsetPosition)
  | ({ kind: 'between-translate' } & CanonicalBetweenPosition);

/** Scope 自身放置与变换意图 */
export type CanonicalScopeTransform = {
  /** 父空间放置目标 */
  position: Extract<IRScopePosition, Array<number>> | Required<Exclude<IRScopePosition, Array<number>>>;
  /** 按声明顺序确定化的变换 */
  transforms: Array<CanonicalScopeTransformStep>;
};

/** Scope 自身分组身份与绘制排序 */
export type CanonicalScopeStyle = Pick<IRScope, 'id' | 'meta' | 'zIndex'>;

/** 已确定的作用域包络配置 */
export type CanonicalScopeEnvelope = {
  /** 子元素包络的计算方式 */
  kind: ScopeBoundingShape;
  /** 包络的锚点与边界查询能力 */
  shape: CanonicalNodeShape;
};

/** 子树执行前已确定的作用域属性，不保存 children */
export type CanonicalScope = {
  /** 向下继承的有效环境 */
  inheritance: CanonicalScopeInheritance;
  /** 是否隔离子树名称 */
  localNamespace: boolean;
  /** 包络形状及其连接查询能力 */
  envelope: CanonicalScopeEnvelope;
  /** 自身放置和变换 */
  transform: CanonicalScopeTransform;
  /** 分组自身属性 */
  style: CanonicalScopeStyle;
  /** 已绑定的裁剪能力，省略表示不裁剪 */
  clip?: ClipResolution;
  /** 已确定的分组动画 */
  animations: Array<IRAnimationTrack>;
};

/** Scope 确定化所需的能力与继承环境 */
export type ScopeResolveContext = {
  /** 方向平移的缺省距离 */
  nodeDistance: number;
  /** 父作用域环境 */
  parent: CanonicalScopeInheritance;
  /** 主题能力 */
  themeRegistry: ProviderRegistry<ThemeDefinition>;
  /** 包络查询能力 */
  shapeRegistry: ProviderRegistry<ShapeDefinition>;
  /** 裁剪能力 */
  clipRegistry: ProviderRegistry<ClipDefinition>;
  /** 声明来源 */
  irPath: PropertyPath;
  /** 主题错误定位 */
  themePath?: string;
};
