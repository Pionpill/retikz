import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { defineControlledPreview } from '@/modules/docs/preview';

import { createPreviewControlContract, previewControls } from './flow-presentation.controls';
import { renderFlowPresentationPreview } from './flow-presentation.preview';

export { previewControls };
const createPreview = (lang: Lang) =>
  defineControlledPreview(createPreviewControlContract(lang), values => renderFlowPresentationPreview(values, lang));

const previews = { zh: createPreview('zh'), en: createPreview('en') };

export const previewSource = previews.zh.source;

/** Presentation 示例的语言参数 */
export type FlowPresentationProps = { lang?: Lang };

/** 独立切换整图标题、说明和图例 */
const FlowPresentation: FC<FlowPresentationProps> = props => {
  const { lang = 'zh' } = props;
  const Preview = previews[lang].Component;
  return <Preview />;
};
export default FlowPresentation;
