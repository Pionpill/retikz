import type { InputPlotFacet, InputPlotFacetDimension, InputPlotScaffold, InputPlotTrack } from '@retikz/plot-vanilla';
import type { FC, ReactNode } from 'react';

export type FacetProps = Omit<InputPlotFacet, 'row' | 'column'> & {
  row?: InputPlotFacetDimension;
  column?: InputPlotFacetDimension;
  children?: ReactNode;
};
export type ScaffoldProps = Omit<InputPlotScaffold, 'tracks'> & {
  tracks?: InputPlotScaffold['tracks'];
  children?: ReactNode;
};
export type TrackProps = InputPlotTrack & { children?: ReactNode };

/** 分面布局声明组件 */
export const Facet: FC<FacetProps> = () => null;
/** 共享轨道骨架声明组件 */
export const Scaffold: FC<ScaffoldProps> = () => null;
/** 共享骨架中的轨道声明组件 */
export const Track: FC<TrackProps> = () => null;
