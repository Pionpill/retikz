import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { defineControlledPreview } from '@/modules/docs/preview';

import { createPreviewControlContract } from './builtin-text.controls';
import { BuiltinTextPreview } from './builtin-text.preview';

const previews = {
  zh: defineControlledPreview(createPreviewControlContract('zh'), BuiltinTextPreview),
  en: defineControlledPreview(createPreviewControlContract('en'), BuiltinTextPreview),
};
/** 预览器的控件回退定义 */
export const previewControls = createPreviewControlContract('zh').controls;
/** 稳定源码配置 */
export const previewSource = previews.zh.source;
export { createPreviewControlContract } from './builtin-text.controls';
/** 示例语言 */
export type BuiltinTextProps = { lang?: Lang };
/** 独立展示本节的图元属性 */
const BuiltinText: FC<BuiltinTextProps> = props => {
  const { lang = 'zh' } = props;
  const Preview = previews[lang].Component;
  return <Preview />;
};
export default BuiltinText;
