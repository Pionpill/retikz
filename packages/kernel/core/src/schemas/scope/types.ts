import type { z } from 'zod';
import { type IRAnimationTrack } from '../animation';
import { type IRClipSpec } from '../clip';
import type { IRComposite } from '../composite';
import type { IRCoordinate } from '../coordinate';
import { type IRJsonObject } from '../json';
import { type IRPaintSpec } from '../paint';
import { type IRNode } from '../node';
import { type IRPathBase } from '../path';
import { type IRTransform } from '../transform';
import type { ArrowDefaultSchema, LabelDefaultSchema, NodeDefaultSchema, PathDefaultSchema } from './schema';
import type { ScopeBoundingShapeValue } from './constants';

/** every node 默认样式（排除 type / id / position / text / label 的全部 node 样式字段） */
export type IRNodeDefault = z.infer<typeof NodeDefaultSchema>;

/** every path 默认样式（排除 type / children / arrow / arrowDetail） */
export type IRPathDefault = z.infer<typeof PathDefaultSchema>;

/** every label 默认样式（color / textColor / opacity / font） */
export type IRLabelDefault = z.infer<typeof LabelDefaultSchema>;

/** every arrow 默认样式（= ArrowDetail） */
export type IRArrowDefault = z.infer<typeof ArrowDefaultSchema>;

/** 样式继承通道标识——resetStyle 按通道切外层继承 */
export type StyleChannel = 'node' | 'path' | 'label' | 'arrow';

/**
 * Scope IR 类型——手写而非 z.infer 派生
 * @description ChildSchema 通过 z.lazy 延迟回灌，z.infer 推断 children 元素时拿不到精确的 IRNode | IRPath | IRCoordinate | IRScope union；手写让 children 类型显式表达递归 union。
 *   Scope 兼作样式默认值挂点：级联 graphic state（color + 跨类共享分项）+ 四通道 every-X 默认 + resetStyle 继承屏障。
 */
export type IRScope = {
  type: 'scope';
  id?: string;
  localNamespace?: boolean;
  transforms?: Array<IRTransform>;
  color?: string;
  stroke?: string | IRPaintSpec;
  fill?: string | IRPaintSpec;
  strokeWidth?: number;
  opacity?: number;
  fillOpacity?: number;
  drawOpacity?: number;
  nodeDefault?: IRNodeDefault;
  pathDefault?: IRPathDefault;
  labelDefault?: IRLabelDefault;
  arrowDefault?: IRArrowDefault;
  resetStyle?: boolean | Array<StyleChannel>;
  zIndex?: number;
  clip?: IRClipSpec;
  boundingShape?: ScopeBoundingShapeValue;
  meta?: IRJsonObject;
  animations?: Array<IRAnimationTrack>;
  children: Array<IRNode | IRPathBase | IRCoordinate | IRScope | IRComposite>;
};
