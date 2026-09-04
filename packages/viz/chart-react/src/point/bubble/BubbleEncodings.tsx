import type { IRBubbleChartEncodings } from '@retikz/chart/point/bubble';
import type { FC } from 'react';

/** Bubble 字段映射声明属性 */
export type BubbleEncodingsProps = IRBubbleChartEncodings;

/** 声明 Bubble 精确字段映射 */
export const BubbleEncodings: FC<BubbleEncodingsProps> = () => null;
BubbleEncodings.displayName = 'BubbleEncodings';
