import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { defineControlledPreview } from '@/modules/docs/preview';

import { createPreviewControlContract, previewControls } from './branch-presentation.controls';
import { renderPreview } from './branch-presentation.preview';

export { previewControls };
const createPreview = (lang: Lang) =>
  defineControlledPreview(createPreviewControlContract(lang), values => renderPreview(values, lang));
const previews = { zh: createPreview('zh'), en: createPreview('en') };
export const previewSource = previews.zh.source;
/** 双语预览属性 */
export type DemoProps = { lang?: Lang };
/** 使用同一绘图函数生成交互及源码预览 */
const Demo: FC<DemoProps> = props => {
  const Preview = previews[props.lang ?? 'zh'].Component;
  return <Preview />;
};
export default Demo;
