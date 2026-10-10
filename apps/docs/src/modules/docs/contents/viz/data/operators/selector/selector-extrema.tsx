import type { FC } from 'react';

import type { Lang } from '@/i18n';
import type { PreviewSourceConfig } from '@/modules/docs/preview';
import { defineControlledPreview, usePreviewControls } from '@/modules/docs/preview';

import { buildOperatorSourceViews } from '../source-views';
import { createPreviewControlContract, previewControlContract } from './selector-extrema.controls';
import { selectorExtremaRowsOf, selectorExtremaOperationOf } from './selector-extrema.data';
import { SelectorExtremaPreview } from './selector-extrema.preview';

/** 注册回退使用同一份控件定义 */
export const previewControls = previewControlContract.controls;
const controlledPreview = defineControlledPreview(previewControlContract, values => (
  <SelectorExtremaPreview {...values} />
));
/** 源码视图展示实际数据调用及选择声明 */
export const previewSource = {
  ...controlledPreview.source,
  buildViews: () =>
    buildOperatorSourceViews(
      'selector-extrema',
      selectorExtremaRowsOf(previewControlContract.canonicalValues),
      selectorExtremaOperationOf(previewControlContract.canonicalValues),
    ),
} satisfies PreviewSourceConfig;
/** 极值行演示的语言输入 */
export type SelectorExtremaProps = { lang?: Lang };
const Demo: FC<SelectorExtremaProps> = props => {
  const { lang = 'zh' } = props;
  const values = usePreviewControls(createPreviewControlContract(lang).controls);
  return <SelectorExtremaPreview {...values} lang={lang} />;
};
export default Demo;
