import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { usePreviewDimensions } from '@/modules/docs/preview';

import { renderFirstChartPreview } from './first-chart.preview';

/** 首张图形示例的语言选项 */
export type FirstChartProps = { lang?: Lang };

/** 使用真实经济体数据展示字段映射与公共组件写法 */
const FirstChart: FC<FirstChartProps> = props => {
  const { lang = 'zh' } = props;
  const dimensions = usePreviewDimensions();
  return renderFirstChartPreview({ lang, layout: dimensions });
};

/** 源码视图复用散点图的经济体数据 */
export const previewSource = {
  datasetImports: {
    'chart.data': { name: 'fertilityWorkData', from: '../points/scatter/scatter-fertility-work.data' },
  },
};

export default FirstChart;
