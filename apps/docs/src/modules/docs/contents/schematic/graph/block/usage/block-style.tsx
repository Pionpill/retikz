import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { defineControlledPreview, withGraphPreviewSource } from '@/modules/docs/preview';

import { blockStyleControls, createPreviewControlContract } from './block-style.controls';
import { BlockStylePreview } from './block-style.preview';

export const previewControls = blockStyleControls;

const createPreview = (lang: Lang) =>
  defineControlledPreview(createPreviewControlContract(lang), values => BlockStylePreview(values, lang));

const previews = { zh: createPreview('zh'), en: createPreview('en') };

export const previewSource = withGraphPreviewSource(previews.zh.source);

/** 示例语言 */
export type BlockStyleProps = { lang?: Lang };

/** 结构块交互示例 */
const Demo: FC<BlockStyleProps> = props => {
  const { lang = 'zh' } = props;
  const Preview = previews[lang].Component;
  return <Preview />;
};
export default Demo;

export { BlockStylePreview } from './block-style.preview';
