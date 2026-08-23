import type { IRScatterChart } from '@retikz/chart/point/scatter';
import type { FC } from 'react';

type ChartMarkOf<TSource extends { recipe: { marks?: ReadonlyArray<unknown> } }> = NonNullable<
  TSource['recipe']['marks']
>[number];
export type ScatterChartMark = Extract<ChartMarkOf<IRScatterChart>, { kind: 'scatter' }>;

/** ScatterMark React 属性；组件身份固定 mark kind，不暴露 kind 字段 */
export type ScatterMarkProps = Omit<ScatterChartMark, 'kind'>;

/** Chart-owned Scatter mark 声明组件，只由直接父级 Point Chart 吸收 */
export const ScatterMark: FC<ScatterMarkProps> = () => null;
ScatterMark.displayName = 'ScatterMark';
