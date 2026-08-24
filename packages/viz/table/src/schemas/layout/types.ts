import type { ValueOf } from '@retikz/foundation';
import type { infer as ZodInfer } from 'zod';

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
export type IRTableFixedTrackSize = ZodInfer<typeof TableFixedTrackSizeSchema>;

/** 内容自然尺寸轨道 IR */
export type IRTableAutoTrackSize = ZodInfer<typeof TableAutoTrackSizeSchema>;

/** 弹性轨道尺寸 IR */
export type IRTableFractionTrackSize = ZodInfer<typeof TableFractionTrackSizeSchema>;

/** 上下界轨道尺寸 IR */
export type IRTableMinmaxTrackSize = ZodInfer<typeof TableMinmaxTrackSizeSchema>;

/** Table 轨道尺寸 IR */
export type IRTableTrackSize = ZodInfer<typeof TableTrackSizeSchema>;

/** canonical index 轨道覆盖 IR */
export type IRTableTrackOverride = ZodInfer<typeof TableTrackOverrideSchema>;

/** 稀疏轨道覆盖列表 IR */
export type IRTableTrackOverrides = ZodInfer<typeof TableTrackOverridesSchema>;

/** Table 轨道与边框布局 IR */
export type IRTableLayout = ZodInfer<typeof TableLayoutSchema>;
