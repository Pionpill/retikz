import type { ValueOf } from '@retikz/foundation';
import type { infer as ZodInfer, input as ZodInput } from 'zod';

import type { IRComposite } from '../composite';
import type { IRCoordinate } from '../coordinate';
import type { IRNode } from '../node';
import type { IRPathBase } from '../path';
import type { ScopeStyleChannel } from './constants';
import type { NodeLabelDefaultSchema, PathLabelDefaultSchema, NodeDefaultSchema, PathDefaultSchema } from './schema';
import type {
  ScopeFrameSchema,
  ScopeDefaultsSchema,
  ScopeAnchorPositionSchema,
  ScopePositionSchema,
  ScopePositionTargetSchema,
  ScopePropsSchema,
} from './schema';

/** 节点主体、布局与已有标签的默认配置 */
export type IRNodeDefault = ZodInfer<typeof NodeDefaultSchema>;

/** 路径主体、几何及已有标签和箭头的默认配置 */
export type IRPathDefault = ZodInfer<typeof PathDefaultSchema>;

/** 节点已有标签的默认配置 */
export type IRNodeLabelDefault = ZodInfer<typeof NodeLabelDefaultSchema>;

/** 路径与步骤已有标签的默认配置 */
export type IRPathLabelDefault = ZodInfer<typeof PathLabelDefaultSchema>;

/** Scope 锚点定位允许的闭合目标 */
export type IRScopePositionTarget = ZodInput<typeof ScopePositionTargetSchema>;

/** Scope 最终锚点对齐放置 */
export type IRScopeAnchorPosition = ZodInput<typeof ScopeAnchorPositionSchema>;

/** Scope 原点位置或最终锚点对齐 */
export type IRScopePosition = ZodInput<typeof ScopePositionSchema>;

/** 样式继承通道标识，defaults.reset 按通道切断外层继承 */
export type StyleChannel = ValueOf<typeof ScopeStyleChannel>;

/** Scope 除 `type` 与递归 `children` 外的完整 authored 属性集合 */
export type IRScopeProps = Omit<ZodInfer<typeof ScopePropsSchema>, 'frame' | 'position'> & {
  /** 父坐标系原点位置或最终锚点对齐，省略时为原点 */
  position?: IRScopePosition;
  /** 可省略默认值的包络装饰 */
  frame?: IRScopeFrame;
};

/** Scope 外框的可省略默认值输入 */
export type IRScopeFrame = ZodInput<typeof ScopeFrameSchema>;

/**
 * Scope IR 类型——手写而非 z.infer 派生
 * @description ChildSchema 通过 z.lazy 延迟回灌，z.infer 推断 children 元素时拿不到精确的 IRNode | IRPath | IRCoordinate | IRScope union；手写让 children 类型显式表达递归 union。
 *   Scope 通过 defaults.style 提供级联视觉默认值，并在 defaults 中提供两个宿主通道与 reset 继承屏障
 */
export type IRScope = IRScopeProps & {
  /** 固定为 scope 的容器判别字段 */
  type: 'scope';
  /** 按声明顺序处理的节点、路径、坐标点、作用域或复合组件 */
  children: Array<IRNode | IRPathBase | IRCoordinate | IRScope | IRComposite>;
};

export type IRScopeDefaults = ZodInfer<typeof ScopeDefaultsSchema>;
