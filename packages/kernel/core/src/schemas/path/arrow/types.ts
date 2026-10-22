import type { OpenString } from '@retikz/foundation';
import type { infer as ZodInfer } from 'zod';

import type { BuiltinArrowShape } from './constants';
import type { ArrowDetailSchema, ArrowStyleSchema } from './schema';

/** 箭头形状、尺寸与视觉样式 */
export type IRArrowStyle = ZodInfer<typeof ArrowStyleSchema>;

/** Path 级箭头详细配置 */
export type IRArrowDetail = ZodInfer<typeof ArrowDetailSchema>;

/** 箭头形状名称，支持内置名称和已注册的自定义名称 */
export type ArrowShape = OpenString<BuiltinArrowShape>;
