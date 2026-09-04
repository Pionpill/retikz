import type { IRChartPlotExtension } from '@retikz/chart';
import type { FC, ReactNode } from 'react';

/** Chart 的显式 Plot extension 声明属性 */
export type ChartExtensionProps = Readonly<
  IRChartPlotExtension & {
    /** Plot React declarations、数组、透明 Fragment 或空 slot */
    children?: ReactNode;
  }
>;

/** 隔离并声明 Chart 中独立的 Plot 能力 */
export const ChartExtension: FC<ChartExtensionProps> = () => null;
ChartExtension.displayName = 'ChartExtension';
