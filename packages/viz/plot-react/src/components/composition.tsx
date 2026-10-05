import type { InputPlotFacet, InputPlotFacetDimension, InputPlotScaffold, InputPlotTrack } from '@retikz/plot-vanilla';
import type { FC, ReactNode } from 'react';

/** 声明按行、列划分的分面及其共享子图内容 */
export type PlotFacetProps = Omit<InputPlotFacet, 'row' | 'column'> & {
  /** 用于生成分面行的字段或维度声明 */
  row?: InputPlotFacetDimension;
  /** 用于生成分面列的字段或维度声明 */
  column?: InputPlotFacetDimension;
  /** 由 Plot 收集器展开的分面子声明，不直接渲染 DOM */
  children?: ReactNode;
};

/** 声明共享坐标骨架及其中的轨道 */
export type PlotScaffoldProps = Omit<InputPlotScaffold, 'tracks'> & {
  /** 直接提供的轨道输入，与子声明一起交给 Plot 组合解析 */
  tracks?: InputPlotScaffold['tracks'];
  /** 共享骨架内的轨道等声明，不直接渲染 DOM */
  children?: ReactNode;
};

/** 声明共享骨架中的单条轨道及其子内容 */
export type PlotTrackProps = InputPlotTrack & {
  /** 由 Plot 收集器解析的轨道内容，不直接渲染 DOM */
  children?: ReactNode;
};

/** 分面布局声明组件 */
export const PlotFacet: FC<PlotFacetProps> = () => null;

/** 共享轨道骨架声明组件 */
export const PlotScaffold: FC<PlotScaffoldProps> = () => null;

/** 共享骨架中的轨道声明组件 */
export const PlotTrack: FC<PlotTrackProps> = () => null;
