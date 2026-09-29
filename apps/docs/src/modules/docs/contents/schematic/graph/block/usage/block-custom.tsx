import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { defineControlledPreview, withGraphPreviewSource } from '@/modules/docs/preview';

import { blockCustomControls, createPreviewControlContract } from './block-custom.controls';
import { BlockCustomPreview } from './block-custom.preview';

export const previewControls = blockCustomControls;

const createPreview = (lang: Lang) =>
  defineControlledPreview(createPreviewControlContract(lang), values => BlockCustomPreview(values, lang));
const previews = { zh: createPreview('zh'), en: createPreview('en') };
export const previewSource = withGraphPreviewSource(previews.zh.source);
/** 示例语言 */
export type BlockCustomProps = { lang?: Lang };
/** 结构块交互示例 */
const Demo: FC<BlockCustomProps> = props => {
  const { lang = 'zh' } = props;
  const Preview = previews[lang].Component;
  return <Preview />;
};
export default Demo;

export { BlockCustomPreview } from './block-custom.preview';
