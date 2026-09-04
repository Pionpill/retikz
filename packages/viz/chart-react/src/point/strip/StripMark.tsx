import type { IRStripChart } from '@retikz/chart/point/strip';
import type { FC } from 'react';

import type { ChartMarkOf } from '../shared';

/** Strip Chart mark 的精确 Source payload */
export type StripChartMark = Extract<ChartMarkOf<IRStripChart>, { kind: 'strip' }>;

/** StripMark React 属性；组件身份固定 mark kind，不暴露 kind 字段 */
export type StripMarkProps = Omit<StripChartMark, 'kind'>;

/** Chart-owned Strip mark 声明组件，只由直接父级 StripChart 吸收 */
export const StripMark: FC<StripMarkProps> = () => null;
StripMark.displayName = 'StripMark';
