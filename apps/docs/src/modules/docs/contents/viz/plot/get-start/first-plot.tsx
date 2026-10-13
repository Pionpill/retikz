import type { FC } from 'react';

import type { Lang } from '@/i18n';
import type { PreviewSourceConfig } from '@/modules/docs/components/component-preview';
import { usePreviewDimensions } from '@/modules/docs/preview';

import { FirstPlotPreview } from './first-plot.preview';

/** 首张 Plot 的展示语言 */
export type FirstPlotProps = {
  /** 文档语言 */
  lang?: Lang;
};

/** 用折线呈现四次测量 */
const FirstPlot: FC<FirstPlotProps> = props => {
  const { lang = 'zh' } = props;
  const dimensions = usePreviewDimensions();

  return <FirstPlotPreview lang={lang} width={Math.min(400, (dimensions?.width ?? 464) - 64)} />;
};

/** 容器尺寸由预览宿主提供，接入代码由正文展示 */
export const previewSource = { deriveIR: false } satisfies PreviewSourceConfig;

export default FirstPlot;
