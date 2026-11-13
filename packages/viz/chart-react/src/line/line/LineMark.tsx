import type { IRLineChart } from '@retikz/chart/line';
import type { FC } from 'react';

import type { ChartMarkOf } from '../../authoring';

/** Line Chart mark 的精确 Source payload */
export type LineChartMark = Extract<ChartMarkOf<IRLineChart>, { kind: 'line' }>;

/** LineMark React 属性；组件身份固定 mark kind */
export type LineMarkProps = Omit<LineChartMark, 'kind'>;

/** Chart-owned Line mark 声明组件，只由直接父级 LineChart 吸收 */
export const LineMark: FC<LineMarkProps> = () => null;
LineMark.displayName = 'LineMark';
