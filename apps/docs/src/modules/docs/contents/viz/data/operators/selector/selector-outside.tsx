import type { FC } from 'react';

import type { Lang } from '@/i18n';
import type { PreviewSourceConfig } from '@/modules/docs/preview';
import { defineControlledPreview, usePreviewControls } from '@/modules/docs/preview';

import { buildOperatorSourceViews } from '../source-views';
import { createPreviewControlContract, previewControlContract } from './selector-outside.controls';
import { selectorOutsideRowsOf, selectorOutsideOperationOf } from './selector-outside.data';
import { SelectorOutsidePreview } from './selector-outside.preview';

/** 注册回退使用同一份控件定义 */
export const previewControls = previewControlContract.controls;
const controlledPreview = defineControlledPreview(previewControlContract, values => (
  <SelectorOutsidePreview {...values} />
));
/** 源码视图展示实际数据调用及选择声明 */
export const previewSource = {
  ...controlledPreview.source,
  buildViews: () =>
    buildOperatorSourceViews(
      'selector-outside',
      selectorOutsideRowsOf(previewControlContract.canonicalValues),
      selectorOutsideOperationOf(previewControlContract.canonicalValues),
    ),
} satisfies PreviewSourceConfig;
/** 分位区间外的行演示的语言输入 */
export type SelectorOutsideProps = { lang?: Lang };
const Demo: FC<SelectorOutsideProps> = props => {
  const { lang = 'zh' } = props;
  const values = usePreviewControls(createPreviewControlContract(lang).controls);
  return <SelectorOutsidePreview {...values} lang={lang} />;
};
export default Demo;
