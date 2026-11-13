import type { IRSlopeChart } from '@retikz/chart/line';
import type { FC } from 'react';

import type { ChartMarkOf } from '../../authoring';

/** Slope Chart mark 的精确 Source payload */
export type SlopeChartMark = Extract<ChartMarkOf<IRSlopeChart>, { kind: 'slope' }>;

/** SlopeMark React 属性；组件身份固定 mark kind */
export type SlopeMarkProps = Omit<SlopeChartMark, 'kind'>;

/** Chart-owned Slope mark 声明组件，只由直接父级 SlopeChart 吸收 */
export const SlopeMark: FC<SlopeMarkProps> = () => null;
SlopeMark.displayName = 'SlopeMark';
