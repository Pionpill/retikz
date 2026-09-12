import type { GridLayoutInspectOptions } from '../../grid-layout/types';
import type { BaseLayoutInspectOptions } from '../../shared/types';
import type { CanonicalBaseLayoutInspectOptions } from '../shared/types';

/** 已确定共享字段及 Grid 专属开关的观测选项 */
export type CanonicalGridLayoutInspectOptions = CanonicalBaseLayoutInspectOptions &
  Required<Omit<GridLayoutInspectOptions, keyof BaseLayoutInspectOptions>>;
