import type { BaseLayoutInspectOptions } from '../../shared/types';

/** 布尔简写展开且所有共享观测开关已确定的选项 */
export type CanonicalBaseLayoutInspectOptions = Required<Omit<BaseLayoutInspectOptions, 'bounds' | 'spacing'>> & {
  /** 已将布尔简写及默认值展开的边界显示选项 */
  bounds: Required<Exclude<BaseLayoutInspectOptions['bounds'], boolean | undefined>>;
  /** 已将布尔简写及默认值展开的间距显示选项 */
  spacing: Required<Exclude<BaseLayoutInspectOptions['spacing'], boolean | undefined>>;
};
