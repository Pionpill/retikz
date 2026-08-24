import type { ValueOf } from '@retikz/foundation';
import type { infer as ZodInfer } from 'zod';

import type { FontStyle, FontWeightKeyword, WebFontSizePreset } from './constants';
import type { FontSchema } from './schema';

/** 字体规格 IR 类型（所有字段可选，编译期解析默认值） */
export type IRFont = ZodInfer<typeof FontSchema>;

/** CSS font-weight 关键字取值 */
export type FontWeightKeywordValue = ValueOf<typeof FontWeightKeyword>;

/** CSS font-style 关键字取值 */
export type FontStyleValue = ValueOf<typeof FontStyle>;

/** 字号 preset 取值 */
export type FontSizePresetValue = ValueOf<typeof WebFontSizePreset>;
