import type { FC } from 'react';

/** 位置 scale 可配置的坐标维度 */
export type ScaleDimension = 'x' | 'y' | 'z';

/** React DSL 里当前暴露的位置 scale 类型 */
export type PositionScaleType = 'linear' | 'time' | 'point' | 'log' | 'sqrt' | 'symlog' | 'radial';

/** 支持连续 domain 配置的位置 scale 类型。 */
export type ContinuousPositionScaleType = Exclude<PositionScaleType, 'point'>;

/** React DSL 中暴露的 position scale domain padding 输入。 */
export type DomainPaddingInput = number | { lower?: number; upper?: number };

/** <Scale> 公共 props：声明某个坐标维度使用的 scale 类型。 */
type ScaleBaseProps = {
  /** 绑定哪个定位维度；polar 下 x 为角向，y 为径向 */
  dimension: ScaleDimension;
};

/** 连续位置 scale props。 */
type ContinuousScaleProps = ScaleBaseProps & {
  /** 连续位置 scale 类型；更细的 range / base / constant 等参数走 spec 入口 */
  type: ContinuousPositionScaleType;
  /** 显式数值 / 时间 domain；省略时从绑定数据推断。 */
  domain?: [number, number];
  /** 额外值域留白；推断 domain 默认 0.05，显式 domain 默认 0。 */
  domainPadding?: DomainPaddingInput;
  /** 单值 domain 展开跨度；省略时按 scale 类型默认。 */
  singleValueSpan?: number;
};

/** 分类点位 scale props。 */
type PointScaleProps = ScaleBaseProps & {
  /** 分类点位 scale 类型；不接受连续 domain 配置。 */
  type: 'point';
};

/** <Scale> props：声明某个坐标维度使用的 scale 类型。 */
export type ScaleProps = ContinuousScaleProps | PointScaleProps;

/**
 * 位置 scale 声明组件
 * @description 配置载体：不进 React render 栈、不渲染（返回 null），由 <Plot> 同步内省其 props 装配进 PlotSpec.scales
 */
export const Scale: FC<ScaleProps> = () => null;
