import type { IRStripChartProperties } from '@retikz/chart/point/strip';
import type { FC } from 'react';

/** Strip 常量属性声明属性 */
export type StripPropertiesProps = IRStripChartProperties;

/** 声明 Strip recipe 的常量属性 */
export const StripProperties: FC<StripPropertiesProps> = () => null;
StripProperties.displayName = 'StripProperties';
