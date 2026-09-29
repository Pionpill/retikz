import type { FC } from 'react';

import type { Lang } from '@/i18n';
import type { PreviewDimensions } from '@/modules/docs/components/component-preview/context';
import { usePreviewDimensions } from '@/modules/docs/preview';

import { renderStripPlacementFigurePreview } from './strip-placement-figure.preview';

/** 示例的语言参数 */
export type StripPlacementFigureProps = { lang?: Lang };

/** 在预览尺寸或源码基准尺寸中使用同一图表配置 */
const render = (lang: Lang, dimensions?: PreviewDimensions) => renderStripPlacementFigurePreview(lang, dimensions);

/** 源码视图使用相同配置，避免依赖 React 容器上下文 */
export const previewSource = {
  deriveIR: false,
  canonicalRender: (lang: Lang) => render(lang),
  datasetImports: { 'chart.data': { name: 'stripPlacementFigureData', from: './strip-placement-figure.data' } },
};

/** 随演示区域重新布局 */
const StripPlacementFigure: FC<StripPlacementFigureProps> = props => {
  const { lang = 'zh' } = props;
  return render(lang, usePreviewDimensions());
};
export default StripPlacementFigure;
