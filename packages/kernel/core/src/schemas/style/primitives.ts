import { NonBlankStringSchema, NormalizedFractionSchema } from '@retikz/foundation';

/** 校验非空 CSS 颜色字符串，不解析颜色语法 */
export const CssColorSchema = NonBlankStringSchema.describe('Non-blank CSS color string.');

/** 校验闭区间 0 到 1 内的不透明度 */
export const OpacitySchema = NormalizedFractionSchema.describe('Opacity value in the inclusive 0..1 range.');
