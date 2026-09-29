import type { FC } from 'react';

import type { Lang } from '@/i18n';
import type { PreviewDimensions } from '@/modules/docs/components/component-preview/context';
import { usePreviewControls, usePreviewDimensions } from '@/modules/docs/preview';

/** 示例的语言参数 */
export type StripDistributionProps = { lang?: Lang };

import { createPreviewControlContract } from './strip-distribution.controls';
import type { DemoValues } from './strip-distribution.controls';
import { renderStripDistributionPreview } from './strip-distribution.preview';

const contract = createPreviewControlContract();

/** 在预览尺寸或源码基准尺寸中使用同一图表配置 */
const render = (lang: Lang, dimensions?: PreviewDimensions, values: DemoValues = contract.canonicalValues) =>
  renderStripDistributionPreview(lang, dimensions, values);

/** 源码视图使用相同配置，避免依赖 React 容器上下文 */
export const previewSource = {
  deriveIR: false,
  canonicalRender: (lang: Lang = 'zh') => render(lang),
  datasetImports: { 'chart.data': { name: 'stripVegaBarleyData', from: './strip-vega-barley.data' } },
};

/** 随演示区域重新布局 */
const StripDistribution: FC<StripDistributionProps> = props => {
  const { lang = 'zh' } = props;
  return render(lang, usePreviewDimensions(), usePreviewControls(contract.controls));
};
export default StripDistribution;

/** 控件模块的显式注册回退 */
export { createPreviewControlContract } from './strip-distribution.controls';
export const previewControls = contract.controls;
