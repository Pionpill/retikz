import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { defineControlledPreview } from '@/modules/docs/preview';

import { createPreviewControlContract, previewControls } from './flow-group.controls';
import { renderFlowGroupPreview } from './flow-group.preview';

export { previewControls };

const createPreview = (lang: Lang) =>
  defineControlledPreview(createPreviewControlContract(lang), values => renderFlowGroupPreview(values, lang));

const previews = { zh: createPreview('zh'), en: createPreview('en') };
export const previewSource = previews.zh.source;

/** 可见分组示例语言 */
export type FlowGroupProps = Readonly<{ lang?: Lang }>;
/** 可见分组交互示例 */
const Demo: FC<FlowGroupProps> = props => {
  const { lang = 'zh' } = props;
  const Preview = previews[lang].Component;
  return <Preview />;
};

export default Demo;
