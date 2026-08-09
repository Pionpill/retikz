import type { ValueOf } from '@retikz/foundation';
import type { z } from 'zod';

import type { BlendMode, ShadowPreset } from './constants';
import type { DropShadowSchema } from './schema';

/** IR shadow 对象分支（可带 preset 与显式字段覆盖） */
export type IRDropShadow = z.infer<typeof DropShadowSchema>;

/** 解析后的投影对象（preset 已展开，offset / color 已补齐，不再携带 preset） */
export type ResolvedDropShadow = Omit<IRDropShadow, 'preset'> &
  Required<Pick<IRDropShadow, 'offsetX' | 'offsetY' | 'color'>>;

/** 阴影预设档位值联合 */
export type ShadowPresetValue = ValueOf<typeof ShadowPreset>;

/** 混合模式值联合 */
export type BlendModeValue = ValueOf<typeof BlendMode>;
