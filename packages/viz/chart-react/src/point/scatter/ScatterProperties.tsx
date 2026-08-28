import type { IRScatterChartProperties } from '@retikz/chart/point/scatter';
import type { FC } from 'react';

/** Scatter 常量属性声明 */
export type ScatterPropertiesProps = IRScatterChartProperties;

/** 声明 Scatter recipe 的常量属性 */
export const ScatterProperties: FC<ScatterPropertiesProps> = () => null;
ScatterProperties.displayName = 'ScatterProperties';
