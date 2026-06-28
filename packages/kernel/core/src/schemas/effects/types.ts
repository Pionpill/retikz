import type { z } from 'zod';
import type { DropShadowSchema } from './schema';
import type { ValueOf } from '../../types';
import type { BlendMode, ShadowPreset } from './constants';

/** 解析后的投影对象类型（compile 已把预设展开 + 显式字段覆盖合并） */
export type DropShadow = z.infer<typeof DropShadowSchema>;

/** 阴影预设档位值联合 */
export type ShadowPresetValue = ValueOf<typeof ShadowPreset>;

/** 混合模式值联合 */
export type BlendModeValue = ValueOf<typeof BlendMode>;
