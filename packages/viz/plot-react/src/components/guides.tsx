import type { InputAxis, InputLegend } from '@retikz/plot-vanilla';
import type { FC } from 'react';

export type AxisProps = InputAxis;
export type LegendProps = InputLegend;

/** 坐标轴声明组件 */
export const Axis: FC<AxisProps> = () => null;
/** 图例声明组件 */
export const Legend: FC<LegendProps> = () => null;
