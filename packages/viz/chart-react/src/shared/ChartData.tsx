import type { IRChartSource } from '@retikz/chart';
import type { ExternalRow } from '@retikz/data';
import type { FC } from 'react';

/** Chart 主数据声明属性 */
export type ChartDataProps = Readonly<{
  /** 当前 Chart 使用的运行时数据行 */
  data: Array<ExternalRow>;
  /** Source 数据引用；省略时使用稳定的 `chart.data` */
  reference?: IRChartSource['data']['reference'];
  /** Source 字段模型 */
  model?: IRChartSource['data']['model'];
}>;

/** 声明 Chart 主数据、引用与字段模型 */
export const ChartData: FC<ChartDataProps> = () => null;
ChartData.displayName = 'ChartData';
