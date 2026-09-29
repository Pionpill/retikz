import type { FC } from 'react';

import { usePreviewDimensions } from '@/modules/docs/preview';

import { renderConnectedScatterMinimalPreview } from './connected-scatter-minimal.preview';

/** 只在根组件传入必要数据与字段映射的 Connected Scatter 基础用法 */
const render = (dimensions?: { width: number; height: number }) => renderConnectedScatterMinimalPreview(dimensions);

/** IR 与 Vanilla 预览使用的数据导入 */
export const previewSource = {
  deriveIR: false,
  canonicalRender: () => render(),
  datasetImports: {
    'chart.data': { name: 'connectedScatterMinimalData', from: './connected-scatter-minimal.data' },
  },
};

/** 预览尺寸改变时重新布局，源码使用无上下文的配置 */
const Demo: FC = () => {
  const dimensions = usePreviewDimensions();
  const chart = render(dimensions);
  return chart;
};
export default Demo;
