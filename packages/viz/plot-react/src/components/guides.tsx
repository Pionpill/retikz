import type { InputPlotAxis, InputPlotLegend } from '@retikz/plot-vanilla';
import type { FC } from 'react';

export type PlotAxisProps = InputPlotAxis;
export type PlotLegendProps = InputPlotLegend;

/** 坐标轴声明组件 */
export const PlotAxis: FC<PlotAxisProps> = () => null;
/** 图例声明组件 */
export const PlotLegend: FC<PlotLegendProps> = () => null;
