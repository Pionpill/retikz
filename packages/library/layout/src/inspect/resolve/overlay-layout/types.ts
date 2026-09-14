import type { OverlayLayoutInspectOptions } from '../../overlay-layout/types';
import type { BaseLayoutInspectOptions } from '../../shared/types';
import type { CanonicalBaseLayoutInspectOptions } from '../shared/types';

/** 已确定共享字段及 Overlay 专属开关的观测选项 */
export type CanonicalOverlayLayoutInspectOptions = CanonicalBaseLayoutInspectOptions &
  Required<Omit<OverlayLayoutInspectOptions, keyof BaseLayoutInspectOptions>>;
