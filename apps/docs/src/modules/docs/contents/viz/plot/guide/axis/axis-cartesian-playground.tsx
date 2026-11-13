import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { defineControlledPreview } from '@/modules/docs/preview';

import { createPreviewControlContract } from './axis-cartesian-playground.controls';
import { renderCartesianPlayground } from './axis-cartesian-playground.preview';

export { createPreviewControlContract } from './axis-cartesian-playground.controls';
/** 注册回退使用的控件 */
export const previewControls = createPreviewControlContract('zh').controls;
const createPreview = (lang: Lang) =>
  defineControlledPreview(createPreviewControlContract(lang), values =>
    renderCartesianPlayground({ minGap: 32, markKind: 'line', gridOpacity: 0.45, minorStep: '2.5', ...values }),
  );
const previews = { zh: createPreview('zh'), en: createPreview('en') };
/** canonical 状态派生的稳定源码 */
export const previewSource = previews.zh.source;
/** 示例语言 */
export type PreviewProps = { lang?: Lang };
/** 复用双语控件与绘图实现 */
const Preview: FC<PreviewProps> = props => {
  const { lang = 'zh' } = props;
  const Component = previews[lang].Component;
  return <Component />;
};
export default Preview;
