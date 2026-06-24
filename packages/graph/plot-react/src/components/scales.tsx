import type { FC } from 'react';

/** 位置 scale 可配置的坐标维度 */
export type ScaleDimension = 'x' | 'y' | 'z';

/** React DSL 里当前暴露的位置 scale 类型 */
export type PositionScaleType = 'linear' | 'time' | 'point' | 'log' | 'sqrt' | 'symlog' | 'radial';

/** <Scale> props：声明某个坐标维度使用的 scale 类型 */
export type ScaleProps = {
  /** 绑定哪个定位维度；polar 下 x 为角向，y 为径向 */
  dimension: ScaleDimension;
  /** scale 类型；更细的 domain / range / base / constant 等参数走 spec 入口 */
  type: PositionScaleType;
};

/**
 * 位置 scale 声明组件
 * @description 配置载体：不进 React render 栈、不渲染（返回 null），由 <Plot> 同步内省其 props 装配进 PlotSpec.scales
 */
export const Scale: FC<ScaleProps> = () => null;
