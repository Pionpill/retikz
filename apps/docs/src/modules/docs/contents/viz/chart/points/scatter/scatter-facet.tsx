import type { FC } from 'react';

import type { Lang } from '@/i18n';
import type { PreviewDimensions } from '@/modules/docs/components/component-preview/context';
import { usePreviewControls, usePreviewDimensions } from '@/modules/docs/preview';

import { renderScatterFacetPreview } from './scatter-facet.preview';

/** 分面示例的语言选项 */
export type ScatterFacetProps = { lang?: Lang };

import { createPreviewControlContract } from './scatter-facet.controls';
import type { DemoValues } from './scatter-facet.controls';

const contract = createPreviewControlContract();

/** 同一份经济体数据按收入组分面，保持共享坐标尺度 */
const render = (lang: Lang, dimensions?: PreviewDimensions, values: DemoValues = contract.canonicalValues) =>
  renderScatterFacetPreview({
    lang,
    layout: dimensions ?? { width: 720, height: 360 },
    header: values.header,
    panelGap: values.panelGap,
    size: values.size,
    opacity: values.opacity,
  });

/** 源码视图与分类编码示例共用同一份数据 */
export const previewSource = {
  deriveIR: false,
  canonicalRender: (lang: Lang = 'zh') => render(lang),
  datasetImports: { 'chart.data': { name: 'fertilityWorkData', from: './scatter-fertility-work.data' } },
};

const ScatterFacet: FC<ScatterFacetProps> = props => {
  const { lang = 'zh' } = props;
  return render(lang, usePreviewDimensions(), usePreviewControls(contract.controls));
};
export default ScatterFacet;

/** 控件模块的显式注册回退 */
export { createPreviewControlContract } from './scatter-facet.controls';
export const previewControls = contract.controls;
