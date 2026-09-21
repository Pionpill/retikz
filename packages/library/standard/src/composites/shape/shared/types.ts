import type { IRTarget } from '@retikz/core';
import type { input as ZodInput } from 'zod';

import type { ShapeAnglesSchema, ShapeBoxSchema, ShapePathSchema } from './schema';
/** 形状的 Core Path 公共属性 */
export type ShapePathProperties = ZodInput<typeof ShapePathSchema>;
/** 创建 Source 时省略固定判别字段，保持几何 union 分支 */
export type ShapeProperties<TShape> = TShape extends object ? Omit<TShape, 'namespace' | 'type'> : never;
/** 用公开 Target 契约收窄 schema preprocess 的宽输入 */
export type ShapeSource<TShape> = TShape extends object
  ? {
      [TKey in keyof TShape]: TKey extends 'center' | 'corner1' | 'corner2'
        ? unknown extends TShape[TKey]
          ? IRTarget
          : TShape[TKey]
        : TShape[TKey];
    }
  : never;
/** 角度的紧凑 Source 描述 */
export type ShapeAngles = ZodInput<typeof ShapeAnglesSchema>;
/** 轴对齐盒 Source */
export type ShapeBox = ZodInput<typeof ShapeBoxSchema>;
