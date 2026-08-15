import type { InputPlotAxis, InputPlotLegend } from '@retikz/plot-vanilla';
import type { FC } from 'react';

export type AxisProps = InputPlotAxis;
export type LegendProps = InputPlotLegend;

/** 坐标轴声明组件 */
export const Axis: FC<AxisProps> = () => null;
/** 图例声明组件 */
export const Legend: FC<LegendProps> = () => null;
