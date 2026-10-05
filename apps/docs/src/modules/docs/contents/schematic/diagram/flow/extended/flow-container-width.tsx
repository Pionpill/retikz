import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { defineControlledPreview } from '@/modules/docs/preview';

import { createPreviewControlContract, previewControls } from './flow-container-width.controls';
import { renderFlowContainerWidthPreview } from './flow-container-width.preview';

export { previewControls };

const createPreview = (lang: Lang) =>
  defineControlledPreview(createPreviewControlContract(lang), values => renderFlowContainerWidthPreview(values, lang));

const previews = { zh: createPreview('zh'), en: createPreview('en') };
export const previewSource = previews.zh.source;

/** 容器宽度示例语言 */
export type FlowContainerWidthProps = Readonly<{ lang?: Lang }>;
/** 容器宽度交互示例 */
const Demo: FC<FlowContainerWidthProps> = props => {
  const { lang = 'zh' } = props;
  const Preview = previews[lang].Component;
  return <Preview />;
};

export default Demo;
