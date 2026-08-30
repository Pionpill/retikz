import type { IRConnectedScatterChart } from '@retikz/chart/point/connected-scatter';
import type { FC } from 'react';

import type { ChartMarkOf } from '../shared';

/** Connected Scatter Chart mark 的精确 Source payload */
export type ConnectedScatterChartMark = Extract<ChartMarkOf<IRConnectedScatterChart>, { kind: 'connected-scatter' }>;

/** ConnectedScatterMark React 属性；组件身份固定 mark kind */
export type ConnectedScatterMarkProps = Omit<ConnectedScatterChartMark, 'kind'>;

/** Chart-owned Connected Scatter mark 声明组件，只由直接父级 ConnectedScatterChart 吸收 */
export const ConnectedScatterMark: FC<ConnectedScatterMarkProps> = () => null;
ConnectedScatterMark.displayName = 'ConnectedScatterMark';
