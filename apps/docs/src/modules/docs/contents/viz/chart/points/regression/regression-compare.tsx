import type { FC } from 'react';

import type { Lang } from '@/i18n';
import type { PreviewDimensions } from '@/modules/docs/components/component-preview/context';
import { usePreviewControls, usePreviewDimensions } from '@/modules/docs/preview';

/** 示例的语言参数 */
export type RegressionCompareProps = { lang?: Lang };

import { createPreviewControlContract } from './regression-compare.controls';
import type { DemoValues } from './regression-compare.controls';
import { renderRegressionComparePreview } from './regression-compare.preview';

const contract = createPreviewControlContract();

/** 在预览尺寸或源码基准尺寸中使用同一图表配置 */
const render = (lang: Lang, dimensions?: PreviewDimensions, values: DemoValues = contract.canonicalValues) =>
  renderRegressionComparePreview(lang, dimensions, values);

/** 源码视图使用相同配置，避免依赖 React 容器上下文 */
export const previewSource = {
  deriveIR: false,
  canonicalRender: (lang: Lang = 'zh') => render(lang),
  datasetImports: { 'chart.data': { name: 'irisRegressionData', from: './regression-basic.data' } },
};

/** 随演示区域重新布局 */
const RegressionCompare: FC<RegressionCompareProps> = props => {
  const { lang = 'zh' } = props;
  return render(lang, usePreviewDimensions(), usePreviewControls(contract.controls));
};
export default RegressionCompare;

/** 控件模块的显式注册回退 */
export { createPreviewControlContract } from './regression-compare.controls';
export const previewControls = contract.controls;
