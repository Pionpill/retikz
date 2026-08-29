import type { IRRegressionChartProperties } from '@retikz/chart/point/regression';
import type { FC } from 'react';

/** Regression 拟合与常量外观属性声明 */
export type RegressionPropertiesProps = IRRegressionChartProperties;

/** 声明 Regression recipe 的拟合与常量外观属性 */
export const RegressionProperties: FC<RegressionPropertiesProps> = () => null;
RegressionProperties.displayName = 'RegressionProperties';
