import type { z } from 'zod';

import type { ValueOf } from '../../shared';
import type { IRComposite } from '../composite';
import type { IRCoordinate } from '../coordinate';
import type { ScopeBoundingShape, ScopeStyleChannel } from './constants';
import type { ArrowDefaultSchema, LabelDefaultSchema, NodeDefaultSchema, PathDefaultSchema } from './schema';
import type { ScopePlacementSchema, ScopePlacementTargetSchema } from './schema';

import { type IRAnimationTrack } from '../animation';
import { type IRClipSpec } from '../clip';
import { type IRJsonObject } from '../json';
import { type IRNode } from '../node';
import { type IRPaintSpec } from '../paint';
import { type IRPathBase } from '../path';
import { type IRTheme } from '../theme';
import { type IRTransform } from '../transform';

/** every node 默认样式（排除 type / id / position / text / label 的全部 node 样式字段） */
export type IRNodeDefault = z.infer<typeof NodeDefaultSchema>;

/** every path 默认样式（排除 type / children / arrow / arrowDetail） */
export type IRPathDefault = z.infer<typeof PathDefaultSchema>;

/** every label 默认样式（color / textColor / opacity / font） */
export type IRLabelDefault = z.infer<typeof LabelDefaultSchema>;

/** every arrow 默认样式（= ArrowDetail） */
export type IRArrowDefault = z.infer<typeof ArrowDefaultSchema>;

/** Scope placement 允许的闭合 target */
export type IRScopePlacementTarget = z.infer<typeof ScopePlacementTargetSchema>;

/** Scope 最终锚点对齐放置 */
export type IRScopePlacement = z.infer<typeof ScopePlacementSchema>;

/** 样式继承通道标识——resetStyle 按通道切外层继承 */
export type StyleChannel = ValueOf<typeof ScopeStyleChannel>;

/**
 * Scope IR 类型——手写而非 z.infer 派生
 * @description ChildSchema 通过 z.lazy 延迟回灌，z.infer 推断 children 元素时拿不到精确的 IRNode | IRPath | IRCoordinate | IRScope union；手写让 children 类型显式表达递归 union。
 *   Scope 兼作样式默认值挂点：级联 graphic state（color + 跨类共享分项）+ 四通道 every-X 默认 + resetStyle 继承屏障
 */
export type IRScope = {
  type: 'scope';
  /** 仅覆盖已声明字段的局部 Theme */
  theme?: IRTheme;
  id?: string;
  /**
   * 是否为子树开启局部命名空间
   * @default false
   */
  localNamespace?: boolean;
  /**
   * scope 局部变换序列
   * @default []
   */
  transforms?: Array<IRTransform>;
  /**
   * own transforms 完成后的最终锚点对齐定位
   * @default 不额外平移
   */
  placement?: IRScopePlacement;
  /**
   * 级联主色
   * @default 继承外层 color
   */
  color?: string;
  /**
   * 级联描边 paint
   * @default 继承外层 stroke
   */
  stroke?: string | IRPaintSpec;
  /**
   * 级联填充 paint
   * @default 继承外层 fill
   */
  fill?: string | IRPaintSpec;
  /**
   * 级联描边宽度
   * @default 继承外层 strokeWidth
   */
  strokeWidth?: number;
  /**
   * 级联整体不透明度
   * @default 继承外层 opacity
   */
  opacity?: number;
  /**
   * 级联填充不透明度
   * @default 继承外层 fillOpacity
   */
  fillOpacity?: number;
  /**
   * 级联绘制不透明度
   * @default 继承外层 strokeOpacity
   */
  strokeOpacity?: number;
  /**
   * every node 默认样式
   * @default 继承外层 nodeDefault
   */
  nodeDefault?: IRNodeDefault;
  /**
   * every path 默认样式
   * @default 继承外层 pathDefault
   */
  pathDefault?: IRPathDefault;
  /**
   * every label 默认样式
   * @default 继承外层 labelDefault
   */
  labelDefault?: IRLabelDefault;
  /**
   * every arrow 默认样式
   * @default 继承外层 arrowDefault
   */
  arrowDefault?: IRArrowDefault;
  /**
   * 样式继承屏障；缺省继承全部通道
   * @default false
   */
  resetStyle?: boolean | Array<StyleChannel>;
  /**
   * scope 整体参与同层排序的层级
   * @default 0
   */
  zIndex?: number;
  /**
   * scope 裁剪区
   * @default 不裁剪
   */
  clip?: IRClipSpec;
  /**
   * 有 id 的 scope 注册为可引用边界时使用的包络形状
   * @default 'rectangle'
   */
  boundingShape?: ScopeBoundingShapeValue;
  meta?: IRJsonObject;
  animations?: Array<IRAnimationTrack>;
  children: Array<IRNode | IRPathBase | IRCoordinate | IRScope | IRComposite>;
};

/** scope 包络形状名联合（'rectangle' | 'circle'） */
export type ScopeBoundingShapeValue = ValueOf<typeof ScopeBoundingShape>;
