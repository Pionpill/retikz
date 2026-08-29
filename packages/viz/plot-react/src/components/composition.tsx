import type { InputPlotFacet, InputPlotFacetDimension, InputPlotScaffold, InputPlotTrack } from '@retikz/plot-vanilla';
import type { FC, ReactNode } from 'react';

export type PlotFacetProps = Omit<InputPlotFacet, 'row' | 'column'> & {
  row?: InputPlotFacetDimension;
  column?: InputPlotFacetDimension;
  children?: ReactNode;
};
export type PlotScaffoldProps = Omit<InputPlotScaffold, 'tracks'> & {
  tracks?: InputPlotScaffold['tracks'];
  children?: ReactNode;
};
export type PlotTrackProps = InputPlotTrack & { children?: ReactNode };

/** 分面布局声明组件 */
export const PlotFacet: FC<PlotFacetProps> = () => null;
/** 共享轨道骨架声明组件 */
export const PlotScaffold: FC<PlotScaffoldProps> = () => null;
/** 共享骨架中的轨道声明组件 */
export const PlotTrack: FC<PlotTrackProps> = () => null;
