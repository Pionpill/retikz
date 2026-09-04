import type { IRRegressionChartEncodings } from '@retikz/chart/point/regression';
import type { FC } from 'react';

/** Regression 字段映射声明属性 */
export type RegressionEncodingsProps = IRRegressionChartEncodings;

/** 声明 Regression 精确字段映射 */
export const RegressionEncodings: FC<RegressionEncodingsProps> = () => null;
RegressionEncodings.displayName = 'RegressionEncodings';
