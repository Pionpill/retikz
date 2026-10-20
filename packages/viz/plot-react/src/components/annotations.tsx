import type {
  InputPlotPointAnnotation,
  InputPlotPathAnnotation,
  InputPlotIntervalAnnotation,
} from '@retikz/plot-vanilla';
import type { FC } from 'react';

export type PointAnnotationProps = InputPlotPointAnnotation;
export type PathAnnotationProps = InputPlotPathAnnotation;
export type IntervalAnnotationProps = InputPlotIntervalAnnotation;

/** 显式点或文本声明，位置可绑定数据 */
export const PointAnnotation: FC<PointAnnotationProps> = () => null;
/** 显式端点路径声明，位置可绑定数据 */
export const PathAnnotation: FC<PathAnnotationProps> = () => null;
/** 显式区间声明，边界可绑定数据 */
export const IntervalAnnotation: FC<IntervalAnnotationProps> = () => null;
