import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { defineControlledPreview } from '@/modules/docs/preview';

import { createPreviewControlContract, previewControls } from './flow-item-width.controls';
import { renderFlowItemWidthPreview } from './flow-item-width.preview';

export { previewControls };

const createPreview = (lang: Lang) =>
  defineControlledPreview(createPreviewControlContract(lang), values => renderFlowItemWidthPreview(values, lang));

const previews = { zh: createPreview('zh'), en: createPreview('en') };
export const previewSource = previews.zh.source;

/** itemWidth 示例语言 */
export type FlowItemWidthProps = Readonly<{ lang?: Lang }>;
/** itemWidth 交互示例 */
const Demo: FC<FlowItemWidthProps> = props => {
  const { lang = 'zh' } = props;
  const Preview = previews[lang].Component;
  return <Preview />;
};

export default Demo;
