import type { FC } from 'react';

import type { Lang } from '@/i18n';
import type { PreviewDimensions } from '@/modules/docs/components/component-preview/context';
import { usePreviewControls, usePreviewDimensions } from '@/modules/docs/preview';

import { createPreviewControlContract } from './connected-scatter-order-figure.controls';
import { renderConnectedScatterOrderFigurePreview } from './connected-scatter-order-figure.preview';

const contract = createPreviewControlContract();

/** 示例的语言参数 */
export type ConnectedScatterOrderFigureProps = { lang?: Lang };

/** 在预览尺寸或源码基准尺寸中使用同一图表配置 */
const render = (lang: Lang, dimensions?: PreviewDimensions, ordered = true) =>
  renderConnectedScatterOrderFigurePreview(lang, dimensions, ordered);

/** 源码视图使用相同配置，避免依赖 React 容器上下文 */
export const previewSource = {
  deriveIR: false,
  canonicalRender: (lang: Lang) => render(lang),
  datasetImports: {
    'chart.data': { name: 'connectedScatterOrderFigureData', from: './connected-scatter-order-figure.data' },
  },
};

/** 随演示区域重新布局 */
const ConnectedScatterOrderFigure: FC<ConnectedScatterOrderFigureProps> = props => {
  const { lang = 'zh' } = props;
  const { ordered } = usePreviewControls(contract.controls);
  return render(lang, usePreviewDimensions(), ordered);
};
export default ConnectedScatterOrderFigure;

export { createPreviewControlContract } from './connected-scatter-order-figure.controls';
export const previewControls = contract.controls;
