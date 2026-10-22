import type { OpenString } from '@retikz/foundation';
import type { infer as ZodInfer } from 'zod';

import type { BuiltinPatternShape } from './constants';
import type { GradientStopSchema, PaintSchema, PatternLineStyleCycleSchema, PatternLineStyleSchema } from './schema';

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

/** 图案形状名称，支持内置名称和已注册的自定义名称 */
export type PatternShapeName = OpenString<BuiltinPatternShape>;
