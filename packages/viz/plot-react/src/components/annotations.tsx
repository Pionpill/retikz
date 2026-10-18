import type {
  InputPlotPointAnnotation,
  InputPlotPathAnnotation,
  InputPlotIntervalAnnotation,
} from '@retikz/plot-vanilla';
import type { FC } from 'react';

export type PointAnnotationProps = InputPlotPointAnnotation;
export type PathAnnotationProps = InputPlotPathAnnotation;
export type IntervalAnnotationProps = InputPlotIntervalAnnotation;

/** 独立常量点或文本声明 */
export const PointAnnotation: FC<PointAnnotationProps> = () => null;
/** 独立常量路径声明 */
export const PathAnnotation: FC<PathAnnotationProps> = () => null;
/** 独立常量区间声明 */
export const IntervalAnnotation: FC<IntervalAnnotationProps> = () => null;
