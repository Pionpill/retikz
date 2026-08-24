import type { ValueOf } from '@retikz/foundation';
import type { infer as ZodInfer } from 'zod';

import type { ImageFit, PatternShape } from './constants';
import type {
  GradientStopSchema,
  PaintSchema,
  PatternLineStyleCycleSchema,
  PatternLineStyleSchema,
  PatternShapeNameSchema,
} from './schema';

/** 渐变 stop 类型 */
export type IRGradientStop = ZodInfer<typeof GradientStopSchema>;

/** Paint server 规格类型（渐变 / 图案 / 图片） */
export type IRPaint = ZodInfer<typeof PaintSchema>;

/** Pattern paint 的可序列化实例参数 */
export type IRPatternPaint = Extract<IRPaint, { kind: 'pattern' }>;

/** Pattern 单条线 motif 的可序列化样式覆盖 */
export type IRPatternLineStyle = ZodInfer<typeof PatternLineStyleSchema>;

/** Pattern 相邻线条的稀疏周期样式 */
export type IRPatternLineStyleCycle = ZodInfer<typeof PatternLineStyleCycleSchema>;

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
export type PatternShapeName = ZodInfer<typeof PatternShapeNameSchema>;
