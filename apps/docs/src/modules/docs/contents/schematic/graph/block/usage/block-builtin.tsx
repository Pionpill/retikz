import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { defineControlledPreview, withGraphPreviewSource } from '@/modules/docs/preview';

import { blockBuiltinControls, createPreviewControlContract } from './block-builtin.controls';
import { BlockBuiltinPreview } from './block-builtin.preview';

export const previewControls = blockBuiltinControls;

const createPreview = (lang: Lang) =>
  defineControlledPreview(createPreviewControlContract(lang), values => BlockBuiltinPreview(values, lang));
const previews = { zh: createPreview('zh'), en: createPreview('en') };
export const previewSource = withGraphPreviewSource(previews.zh.source);
/** 示例语言 */
export type BlockBuiltinProps = { lang?: Lang };
/** 结构块交互示例 */
const Demo: FC<BlockBuiltinProps> = props => {
  const { lang = 'zh' } = props;
  const Preview = previews[lang].Component;
  return <Preview />;
};
export default Demo;

export { BlockBuiltinPreview } from './block-builtin.preview';
