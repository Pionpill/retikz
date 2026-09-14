import type { FlexLayoutInspectOptions } from '../../flex-layout/types';
import type { BaseLayoutInspectOptions } from '../../shared/types';
import type { CanonicalBaseLayoutInspectOptions } from '../shared/types';

/** 已确定共享字段及 Flex 专属开关的观测选项 */
export type CanonicalFlexLayoutInspectOptions = CanonicalBaseLayoutInspectOptions &
  Required<Omit<FlexLayoutInspectOptions, keyof BaseLayoutInspectOptions>>;
