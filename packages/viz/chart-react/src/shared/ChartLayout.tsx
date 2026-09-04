import type { IRChartSource } from '@retikz/chart';
import type { FC } from 'react';

type ChartSourceLayout = NonNullable<IRChartSource['layout']>;

/** Chart 尺寸声明属性 */
export type ChartLayoutProps = Readonly<{
  /** standalone host 宽度；未显式声明 layout 时同时镜像到 Source */
  width?: ChartSourceLayout['width'];
  /** standalone host 高度；未显式声明 layout 时同时镜像到 Source */
  height?: ChartSourceLayout['height'];
  /** 完整 Source layout；存在时不与 width / height 字段级合并 */
  layout?: ChartSourceLayout;
}>;

/** 声明 standalone host 尺寸与 Chart Source layout */
export const ChartLayout: FC<ChartLayoutProps> = () => null;
ChartLayout.displayName = 'ChartLayout';
