import type {
  InputPlotCoreNodeChannels,
  InputPlotCorePathChannels,
  InputPlotDatumLabel,
  InputPlotIntervalMark,
  InputPlotPathMark,
  InputPlotPointMark,
  InputPlotReferenceMark,
  InputPlotRelationMark,
} from '@retikz/plot-vanilla';
import type { FC } from 'react';

export type PathMarkProps = InputPlotPathMark;
export type PointMarkProps = InputPlotPointMark;
export type IntervalMarkProps = InputPlotIntervalMark;
export type ReferenceMarkProps = InputPlotReferenceMark;
export type RelationMarkProps = InputPlotRelationMark;
export type CoreNodeChannelProps = InputPlotCoreNodeChannels;
export type CorePathChannelProps = InputPlotCorePathChannels;
export type DatumLabelProps = InputPlotDatumLabel;

/** 折线图层声明组件 */
export const PathMark: FC<PathMarkProps> = () => null;
/** 散点或文本图层声明组件 */
export const PointMark: FC<PointMarkProps> = () => null;
/** 区间图层声明组件 */
export const IntervalMark: FC<IntervalMarkProps> = () => null;
/** 参考标注图层声明组件 */
export const ReferenceMark: FC<ReferenceMarkProps> = () => null;
/** 起点到终点的关系路径图层 */
export const RelationMark: FC<RelationMarkProps> = () => null;
