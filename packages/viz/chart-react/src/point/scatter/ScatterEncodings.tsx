import type { IRScatterChartEncodings } from '@retikz/chart/point';
import type { FC } from 'react';

/** Scatter 字段映射声明属性 */
export type ScatterEncodingsProps = IRScatterChartEncodings;

/** 声明 Scatter 精确字段映射 */
export const ScatterEncodings: FC<ScatterEncodingsProps> = () => null;
ScatterEncodings.displayName = 'ScatterEncodings';
