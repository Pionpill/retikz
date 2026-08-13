import type {
  IRGeometryLabel,
  IRPathBase,
  IRPathRibbonOptions,
  IRRibbonSampling,
  IRRibbonWidth,
  IRStep,
} from '../../schemas';
import type { CanonicalDropShadow } from '../shadow';

/** 展开位置、方向与距离默认值后的路径几何标签 */
export type CanonicalGeometryLabel = Omit<IRGeometryLabel, 'position' | 'side' | 'distance'> & {
  /** 宿主线段或路径上的归一化位置 */
  position: number;
  /** 相对标签锚点的完整方向 */
  side: NonNullable<IRGeometryLabel['side']> | 'center';
  /** 相对宿主的偏移距离 */
  distance: number;
};

/** 为实际支持标签的路径步骤替换规范化标签 */
type WithCanonicalStepLabel<TStep extends IRStep> = TStep extends unknown
  ? 'label' extends keyof TStep
    ? Omit<TStep, 'label'> & { label?: CanonicalGeometryLabel }
    : TStep
  : never;

/** 为需要静态默认值的路径步骤补齐完整字段 */
type CompleteCanonicalStep<TStep extends IRStep> = TStep extends {
  kind: 'fold';
}
  ? TStep extends { via: '-|-' | '|-|' }
    ? Omit<WithCanonicalStepLabel<TStep>, 'fraction'> & { fraction: number }
    : WithCanonicalStepLabel<TStep>
  : TStep extends { kind: 'smooth' }
    ? Omit<WithCanonicalStepLabel<TStep>, 'tension'> & { tension: number }
    : WithCanonicalStepLabel<TStep>;

/** 展开折线路径、平滑路径与标签静态默认值后的路径步骤 */
export type CanonicalStep = CompleteCanonicalStep<IRStep>;

/** 移除标签后仍保留其余规范化字段的路径步骤 */
type WithoutCanonicalStepLabel<TStep extends CanonicalStep> = TStep extends unknown
  ? 'label' extends keyof TStep
    ? Omit<TStep, 'label'>
    : TStep
  : never;

/** 流带复用描边输出器时使用的不带标签规范化步骤 */
export type CanonicalStepWithoutLabel = WithoutCanonicalStepLabel<CanonicalStep>;

/** 宽度停靠点规则的完整规范化形态 */
type CanonicalRibbonStopsWidth = Omit<Extract<IRRibbonWidth, { kind: 'stops' }>, 'interpolation'> & {
  /** 相邻停靠点的插值方式 */
  interpolation: NonNullable<Extract<IRRibbonWidth, { kind: 'stops' }>['interpolation']>;
};

/** 已排序停靠点并补齐插值默认值的流带宽度规则 */
export type CanonicalRibbonWidth = Exclude<IRRibbonWidth, { kind: 'stops' }> | CanonicalRibbonStopsWidth;

/** 自适应采样的完整规范化形态 */
type CanonicalRibbonAdaptiveSampling = Omit<Extract<IRRibbonSampling, { kind: 'adaptive' }>, 'maxSamples'> & {
  /** 最大采样数量 */
  maxSamples: number;
};

/** 已展开简写与自适应默认值的流带采样策略 */
export type CanonicalRibbonSampling = Exclude<IRRibbonSampling, { kind: 'adaptive' }> | CanonicalRibbonAdaptiveSampling;

/** 已补齐端帽默认值的流带端点 */
export type CanonicalRibbonEndpoint = Omit<NonNullable<IRPathRibbonOptions['start']>, 'cap'> & {
  /** 端点闭合方式 */
  cap: NonNullable<NonNullable<IRPathRibbonOptions['start']>['cap']>;
};

/** 内置流带输出器消费的完整静态选项 */
export type CanonicalRibbonOptions = Omit<
  IRPathRibbonOptions,
  'mode' | 'align' | 'interpolation' | 'start' | 'end' | 'sampling' | 'samples' | 'width' | 'upper' | 'lower'
> & {
  /** 流带构造模式 */
  mode: NonNullable<IRPathRibbonOptions['mode']>;
  /** 中心线对齐方式 */
  align: NonNullable<IRPathRibbonOptions['align']>;
  /** 端点宽度插值方式 */
  interpolation: NonNullable<IRPathRibbonOptions['interpolation']>;
  /** 起始端点 */
  start: CanonicalRibbonEndpoint;
  /** 结束端点 */
  end: CanonicalRibbonEndpoint;
  /** 完整宽度规则 */
  width?: CanonicalRibbonWidth;
  /** 完整采样策略 */
  sampling?: CanonicalRibbonSampling;
  /** 边界流带的上边界 */
  upper?: Array<CanonicalStep>;
  /** 边界流带的下边界 */
  lower?: Array<CanonicalStep>;
};

/** 内置路径输出器消费的完整静态路径形态 */
export type CanonicalPath = Omit<IRPathBase, 'children' | 'label' | 'ribbon' | 'shadow'> & {
  /** 完整路径步骤 */
  children?: Array<CanonicalStep>;
  /** 统一为数组的宿主标签 */
  label?: Array<CanonicalGeometryLabel>;
  /** 完整流带选项 */
  ribbon?: CanonicalRibbonOptions;
  /** 已展开预设与静态默认值的投影 */
  shadow?: CanonicalDropShadow;
};
