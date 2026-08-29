import type { IRRegressionChart } from '@retikz/chart/point/regression';
import type { FC } from 'react';

type ChartMarkOf<TSource extends { recipe: { marks?: ReadonlyArray<unknown> } }> = NonNullable<
  TSource['recipe']['marks']
>[number];

/** Regression Chart mark 的精确 Source payload */
export type RegressionChartMark = Extract<ChartMarkOf<IRRegressionChart>, { kind: 'regression' }>;

/** RegressionMark React 属性；组件身份固定 mark kind */
export type RegressionMarkProps = Omit<RegressionChartMark, 'kind'>;

/** Chart-owned Regression mark 声明组件，只由直接父级 RegressionChart 吸收 */
export const RegressionMark: FC<RegressionMarkProps> = () => null;
RegressionMark.displayName = 'RegressionMark';
