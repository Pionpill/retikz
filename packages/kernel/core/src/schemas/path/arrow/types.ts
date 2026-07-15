import type { z } from 'zod';

import type { ValueOf } from '../../../shared';
import type { BuiltinArrowShape } from './constants';
import type { ArrowDetailSchema, ArrowEndDetailSchema } from './schema';

/** 端点级箭头视觉规格 */
export type IRArrowEndDetail = z.infer<typeof ArrowEndDetailSchema>;

/** Path 级箭头详细配置 */
export type IRArrowDetail = z.infer<typeof ArrowDetailSchema>;

/** 内置箭头形状字面量类型 */
export type BuiltinArrowShapeValue = ValueOf<typeof BuiltinArrowShape>;

/**
 * 箭头形状名：开放字符串
 * @description 内置 `BuiltinArrowShapeValue`，或经 `CompileOptions.arrows` 注册的扩展箭头名；
 *   `& {}` 让 IDE 仍对内置 8 名自动补全，同时接受任意非空字符串（对齐 `NodeShape` / `PatternShapeName`）
 */
export type ArrowShapeValue = BuiltinArrowShapeValue | (string & {});
