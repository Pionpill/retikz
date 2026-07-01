import type { z } from 'zod';

import type { ValueOf } from '../../shared';
import type { ImageFit, PatternShape } from './constants';
import type { GradientStopSchema, PaintSpecSchema } from './schema';

/** 渐变 stop 类型 */
export type IRGradientStop = z.infer<typeof GradientStopSchema>;

/** Paint server 规格类型（渐变 / 图案 / 图片） */
export type IRPaintSpec = z.infer<typeof PaintSpecSchema>;

/**
 * 内置 3 pattern motif 名联合
 * @description `BUILTIN_PATTERNS` 的 Record key（保穷尽性约束，不随 `PatternShapeName` 开放而退化为 `string`）
 */
export type PatternShapeValue = ValueOf<typeof PatternShape>;

/** 图片填充适配方式取值 */
export type ImageFitValue = ValueOf<typeof ImageFit>;

export type BuiltinPatternName = PatternShapeValue;

/**
 * pattern motif 名：开放字符串
 * @description 内置 `BuiltinPatternName`，或经 `CompileOptions.patterns` 注册的扩展 motif 名；
 *   `& {}` 让 IDE 仍对内置 3 名自动补全，同时接受任意非空字符串
 */
export type PatternShapeName = BuiltinPatternName | (string & {});
