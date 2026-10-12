import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { defineControlledPreview } from '@/modules/docs/preview';

import { createPreviewControlContract } from './builtin-node.controls';
import { BuiltinNodePreview } from './builtin-node.preview';

const previews = {
  zh: defineControlledPreview(createPreviewControlContract('zh'), BuiltinNodePreview),
  en: defineControlledPreview(createPreviewControlContract('en'), BuiltinNodePreview),
};
/** 预览器的控件回退定义 */
export const previewControls = createPreviewControlContract('zh').controls;
/** 稳定源码配置 */
export const previewSource = previews.zh.source;
export { createPreviewControlContract } from './builtin-node.controls';
/** 示例语言 */
export type BuiltinNodeProps = { lang?: Lang };
/** 独立展示本节的图元属性 */
const BuiltinNode: FC<BuiltinNodeProps> = props => {
  const { lang = 'zh' } = props;
  const Preview = previews[lang].Component;
  return <Preview />;
};
export default BuiltinNode;
