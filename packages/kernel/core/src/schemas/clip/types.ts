import type { z } from 'zod';

import type { ValueOf } from '../../shared';
import type { IRJsonObject } from '../json';
import type { ClipFillRule } from './constants';
import type {
  CircleClipSchema,
  EllipseClipSchema,
  PathClipSchema,
  PolygonClipSchema,
  RectClipSchema,
} from './schema';

/** 裁切路径填充规则取值 */
export type ClipFillRuleValue = ValueOf<typeof ClipFillRule>;

/** 裁切路径填充规则 IR 类型 */
export type IRClipFillRule = ClipFillRuleValue;

/** 矩形裁切 IR 类型。 */
export type IRRectClipSpec = z.infer<typeof RectClipSchema>;

/** 圆形裁切 IR 类型。 */
export type IRCircleClipSpec = z.infer<typeof CircleClipSchema>;

/** 椭圆裁切 IR 类型。 */
export type IREllipseClipSpec = z.infer<typeof EllipseClipSchema>;

/** 多边形裁切 IR 类型。 */
export type IRPolygonClipSpec = z.infer<typeof PolygonClipSchema>;

/** 路径裁切 IR 类型。 */
export type IRPathClipSpec = z.infer<typeof PathClipSchema>;

/**
 * 复合裁切 IR 类型。
 * @description `CompoundClipSchema` 递归引用 `ClipSpecSchema`，这里手写递归节点，避免 `z.infer` 形成循环类型。
 */
export type IRCompoundClipSpec = {
  kind: 'compound';
  children: Array<IRClipSpec>;
  fillRule?: IRClipFillRule;
};

/** 自定义裁切 IR 类型：`kind` 对应 compile options 中注册的 clip provider。 */
export type IRCustomClipSpec = IRJsonObject & { kind: string };

/** 裁切 IR 类型：内置分支由 schema 推导，自定义分支保持开放 JSON 对象。 */
export type IRClipSpec =
  | IRRectClipSpec
  | IRCircleClipSpec
  | IREllipseClipSpec
  | IRPolygonClipSpec
  | IRPathClipSpec
  | IRCompoundClipSpec
  | IRCustomClipSpec;
