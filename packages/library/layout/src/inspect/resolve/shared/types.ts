import type { BaseLayoutInspectOptions } from '../../shared/types';

/** 布尔简写展开且所有共享观测开关已确定的选项 */
export type CanonicalBaseLayoutInspectOptions = Required<Omit<BaseLayoutInspectOptions, 'bounds' | 'spacing'>> & {
  bounds: Required<Exclude<BaseLayoutInspectOptions['bounds'], boolean | undefined>>;
  spacing: Required<Exclude<BaseLayoutInspectOptions['spacing'], boolean | undefined>>;
};
