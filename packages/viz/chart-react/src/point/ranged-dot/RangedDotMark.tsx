import type { IRRangedDotChart } from '@retikz/chart/point/ranged-dot';
import type { FC } from 'react';

import type { ChartMarkOf } from '../shared';

/** Ranged Dot Chart mark 的精确 Source payload */
export type RangedDotChartMark = Extract<ChartMarkOf<IRRangedDotChart>, { kind: 'ranged-dot' }>;

/** RangedDotMark React 属性；组件身份固定 mark kind */
export type RangedDotMarkProps = Omit<RangedDotChartMark, 'kind'>;

/** Chart-owned Ranged Dot mark 声明组件，只由直接父级 RangedDotChart 吸收 */
export const RangedDotMark: FC<RangedDotMarkProps> = () => null;
RangedDotMark.displayName = 'RangedDotMark';
