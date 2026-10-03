import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { defineControlledPreview } from '@/modules/docs/preview';

import { createPreviewControlContract, previewControls } from './flow-bend.controls';
import { renderFlowBendPreview } from './flow-bend.preview';

export { previewControls };
const createPreview = (lang: Lang) =>
  defineControlledPreview(createPreviewControlContract(lang), values => renderFlowBendPreview(values, lang));
const previews = { zh: createPreview('zh'), en: createPreview('en') };
export const previewSource = previews.zh.source;
/** 曲线与标签示例语言 */
export type FlowBendProps = Readonly<{ lang?: Lang }>;
/** 曲线避让限制及完整标签试验场 */
const Demo: FC<FlowBendProps> = props => {
  const { lang = 'zh' } = props;
  const Preview = previews[lang].Component;
  return <Preview />;
};
export default Demo;
