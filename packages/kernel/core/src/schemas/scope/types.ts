import type { ValueOf } from '@retikz/foundation';
import type { infer as ZodInfer, input as ZodInput } from 'zod';

import type { IRComposite } from '../composite';
import type { IRCoordinate } from '../coordinate';
import type { IRNode } from '../node';
import type { IRPathBase } from '../path';
import type { ScopeBoundingShape, ScopeStyleChannel } from './constants';
import type { ArrowDefaultSchema, LabelDefaultSchema, NodeDefaultSchema, PathDefaultSchema } from './schema';
import type {
  ScopeFrameSchema,
  ScopeDefaultsSchema,
  ScopePlacementSchema,
  ScopePlacementTargetSchema,
  ScopePropsSchema,
} from './schema';

/** every node 默认样式（排除 type / id / position / text / label 的全部 node 样式字段） */
export type IRNodeDefault = ZodInfer<typeof NodeDefaultSchema>;

/** every path 默认样式（排除 type / children / arrow / arrowDetail） */
export type IRPathDefault = ZodInfer<typeof PathDefaultSchema>;

/** every label 默认样式（color / textColor / opacity / font） */
export type IRLabelDefault = ZodInfer<typeof LabelDefaultSchema>;

/** every arrow 默认样式（= ArrowDetail） */
export type IRArrowDefault = ZodInfer<typeof ArrowDefaultSchema>;

/** Scope placement 允许的闭合 target */
export type IRScopePlacementTarget = ZodInfer<typeof ScopePlacementTargetSchema>;

/** Scope 最终锚点对齐放置 */
export type IRScopePlacement = ZodInfer<typeof ScopePlacementSchema>;

/** 样式继承通道标识，defaults.reset 按通道切断外层继承 */
export type StyleChannel = ValueOf<typeof ScopeStyleChannel>;

/** Scope 除 `type` 与递归 `children` 外的完整 authored 属性集合 */
export type IRScopeProps = Omit<ZodInfer<typeof ScopePropsSchema>, 'frame'> & {
  /** 可省略默认值的包络装饰 */
  frame?: IRScopeFrame;
};

/** Scope 外框的可省略默认值输入 */
export type IRScopeFrame = ZodInput<typeof ScopeFrameSchema>;

/**
 * Scope IR 类型——手写而非 z.infer 派生
 * @description ChildSchema 通过 z.lazy 延迟回灌，z.infer 推断 children 元素时拿不到精确的 IRNode | IRPath | IRCoordinate | IRScope union；手写让 children 类型显式表达递归 union。
 *   Scope 通过 style 提供级联视觉值，通过 defaults 提供四个默认通道与 reset 继承屏障
 */
export type IRScope = IRScopeProps & {
  /** 固定为 scope 的容器判别字段 */
  type: 'scope';
  /** 按声明顺序处理的节点、路径、坐标点、作用域或复合组件 */
  children: Array<IRNode | IRPathBase | IRCoordinate | IRScope | IRComposite>;
};

/** scope 包络形状名联合（'rectangle' | 'circle'） */
export type ScopeBoundingShapeValue = ValueOf<typeof ScopeBoundingShape>;

export type IRScopeDefaults = ZodInfer<typeof ScopeDefaultsSchema>;
