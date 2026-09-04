import type { IRBubbleChart } from '@retikz/chart/point/bubble';
import type { FC } from 'react';

import type { ChartMarkOf } from '../shared';

/** Bubble Chart mark 的精确 Source payload */
export type BubbleChartMark = Extract<ChartMarkOf<IRBubbleChart>, { kind: 'bubble' }>;

/** BubbleMark React 属性；组件身份固定 mark kind，不暴露 kind 与 size 字段 */
export type BubbleMarkProps = Omit<BubbleChartMark, 'kind'>;

/** Chart-owned Bubble mark 声明组件，只由直接父级 BubbleChart 吸收 */
export const BubbleMark: FC<BubbleMarkProps> = () => null;
BubbleMark.displayName = 'BubbleMark';
