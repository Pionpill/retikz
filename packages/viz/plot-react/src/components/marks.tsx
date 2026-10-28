import type { IRPlotPathStep } from '@retikz/plot';
import type {
  InputPlotDatumLabel,
  InputPlotIntervalMark,
  InputPlotPathMark,
  InputPlotPointMark,
  InputPlotRelationMark,
} from '@retikz/plot-vanilla';
import type { FC, ReactNode } from 'react';

export type PathMarkProps =
  | Exclude<InputPlotPathMark, { children: Array<IRPlotPathStep> }>
  | (Omit<Extract<InputPlotPathMark, { children: Array<IRPlotPathStep> }>, 'children'> & { children: ReactNode });

export type PlotPathStepProps = IRPlotPathStep;

/** 声明数据绑定路径步骤，由 PathMark 收集后统一交给 Vanilla */
export const PlotPathStep: FC<PlotPathStepProps> = () => null;

export type PointMarkProps = InputPlotPointMark;

export type IntervalMarkProps = InputPlotIntervalMark;

export type RelationMarkProps = InputPlotRelationMark;

export type DatumLabelProps = InputPlotDatumLabel;

/** 折线图层声明组件 */
export const PathMark: FC<PathMarkProps> = () => null;

/** 散点或文本图层声明组件 */
export const PointMark: FC<PointMarkProps> = () => null;

/** 区间图层声明组件 */
export const IntervalMark: FC<IntervalMarkProps> = () => null;

/** 起点到终点的关系路径图层 */
export const RelationMark: FC<RelationMarkProps> = () => null;
