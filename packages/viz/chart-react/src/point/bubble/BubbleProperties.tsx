import type { IRBubbleChartProperties } from '@retikz/chart/point/bubble';
import type { FC } from 'react';

/** Bubble 常量属性声明 */
export type BubblePropertiesProps = IRBubbleChartProperties;

/** 声明 Bubble recipe 不含尺寸的常量属性 */
export const BubbleProperties: FC<BubblePropertiesProps> = () => null;
BubbleProperties.displayName = 'BubbleProperties';
