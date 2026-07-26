import type { ValueOf } from '@retikz/core';
import type { z } from 'zod';

import type { TableTrackSizeKind } from './constants';
import type {
  TableAutoTrackSizeSchema,
  TableFixedTrackSizeSchema,
  TableFractionTrackSizeSchema,
  TableLayoutSchema,
  TableMinmaxTrackSizeSchema,
  TableTrackOverrideSchema,
  TableTrackOverridesSchema,
  TableTrackSizeSchema,
} from './schema';

/** Table 轨道尺寸判别值 */
export type TableTrackSizeKindValue = ValueOf<typeof TableTrackSizeKind>;

/** 固定轨道尺寸 IR */
export type IRTableFixedTrackSize = z.infer<typeof TableFixedTrackSizeSchema>;

/** 内容自然尺寸轨道 IR */
export type IRTableAutoTrackSize = z.infer<typeof TableAutoTrackSizeSchema>;

/** 弹性轨道尺寸 IR */
export type IRTableFractionTrackSize = z.infer<typeof TableFractionTrackSizeSchema>;

/** 上下界轨道尺寸 IR */
export type IRTableMinmaxTrackSize = z.infer<typeof TableMinmaxTrackSizeSchema>;

/** Table 轨道尺寸 IR */
export type IRTableTrackSize = z.infer<typeof TableTrackSizeSchema>;

/** canonical index 轨道覆盖 IR */
export type IRTableTrackOverride = z.infer<typeof TableTrackOverrideSchema>;

/** 稀疏轨道覆盖列表 IR */
export type IRTableTrackOverrides = z.infer<typeof TableTrackOverridesSchema>;

/** 固定轨道 Table layout IR */
export type IRTableLayout = z.infer<typeof TableLayoutSchema>;
