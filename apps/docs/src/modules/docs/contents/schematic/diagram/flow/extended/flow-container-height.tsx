import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { defineControlledPreview } from '@/modules/docs/preview';

import { createPreviewControlContract, previewControls } from './flow-container-height.controls';
import { renderFlowContainerHeightPreview } from './flow-container-height.preview';

export { previewControls };

const createPreview = (lang: Lang) =>
  defineControlledPreview(createPreviewControlContract(lang), values => renderFlowContainerHeightPreview(values, lang));

const previews = { zh: createPreview('zh'), en: createPreview('en') };

export const previewSource = previews.zh.source;

/** 容器高度示例语言 */
export type FlowContainerHeightProps = Readonly<{ lang?: Lang }>;

/** 容器高度交互示例 */
const Demo: FC<FlowContainerHeightProps> = props => {
  const { lang = 'zh' } = props;
  const Preview = previews[lang].Component;
  return <Preview />;
};

export default Demo;
