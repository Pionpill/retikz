import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { defineControlledPreview } from '@/modules/docs/preview';

import { createPreviewControlContract } from './builtin-label.controls';
import { BuiltinLabelPreview } from './builtin-label.preview';

/** 标签示例语言 */
export type BuiltinLabelProps = { lang?: Lang };

const previews = {
  zh: defineControlledPreview(createPreviewControlContract('zh'), BuiltinLabelPreview),
  en: defineControlledPreview(createPreviewControlContract('en'), BuiltinLabelPreview),
};

/** 注册回退的控件定义 */
export const previewControls = createPreviewControlContract('zh').controls;
/** 与交互图共用实现的稳定源码 */
export const previewSource = previews.zh.source;

export { createPreviewControlContract } from './builtin-label.controls';

/** 外侧标签试验场，控件文案由宿主按语言加载 */
const BuiltinLabel: FC<BuiltinLabelProps> = props => {
  const { lang = 'zh' } = props;
  const Preview = previews[lang].Component;
  return <Preview />;
};

export default BuiltinLabel;
