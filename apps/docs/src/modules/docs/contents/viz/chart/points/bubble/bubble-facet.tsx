import type { FC } from 'react';

import type { Lang } from '@/i18n';
import type { PreviewDimensions } from '@/modules/docs/components/component-preview/context';
import { usePreviewControls, usePreviewDimensions } from '@/modules/docs/preview';

import { renderBubbleFacetPreview } from './bubble-facet.preview';

/** 示例的语言参数 */
export type BubbleFacetProps = { lang?: Lang };

import { createPreviewControlContract } from './bubble-facet.controls';
import type { DemoValues } from './bubble-facet.controls';

const contract = createPreviewControlContract();

/** 在预览尺寸或源码基准尺寸中使用同一图表配置 */
const render = (lang: Lang, dimensions?: PreviewDimensions, values: DemoValues = contract.canonicalValues) => {
  return renderBubbleFacetPreview({
    lang,
    dimensions,
    header: values.header,
    panelGap: values.panelGap,
    fillOpacity: values.fillOpacity,
  });
};

/** 源码视图使用相同配置，避免依赖 React 容器上下文 */
export const previewSource = {
  deriveIR: false,
  canonicalRender: (lang: Lang = 'zh') => render(lang),
  datasetImports: { 'chart.data': { name: 'gapminderBubbleData', from: './bubble-basic.data' } },
};

/** 随演示区域重新布局 */
const BubbleFacet: FC<BubbleFacetProps> = props => {
  const { lang = 'zh' } = props;
  return render(lang, usePreviewDimensions(), usePreviewControls(contract.controls));
};
export default BubbleFacet;

/** 控件模块的显式注册回退 */
export { createPreviewControlContract } from './bubble-facet.controls';
export const previewControls = contract.controls;
