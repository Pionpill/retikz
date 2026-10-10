import type { FC } from 'react';

import type { Lang } from '@/i18n';
import type { PreviewSourceConfig } from '@/modules/docs/preview';
import { defineControlledPreview, usePreviewControls } from '@/modules/docs/preview';

import { buildOperatorSourceViews } from '../source-views';
import { createPreviewControlContract, previewControlContract } from './selector-ends.controls';
import { selectorEndsRowsOf, selectorEndsOperationOf } from './selector-ends.data';
import { SelectorEndsPreview } from './selector-ends.preview';

/** 注册回退使用同一份控件定义 */
export const previewControls = previewControlContract.controls;
const controlledPreview = defineControlledPreview(previewControlContract, values => (
  <SelectorEndsPreview {...values} />
));
/** 源码视图展示实际数据调用及选择声明 */
export const previewSource = {
  ...controlledPreview.source,
  buildViews: () =>
    buildOperatorSourceViews(
      'selector-ends',
      selectorEndsRowsOf(previewControlContract.canonicalValues),
      selectorEndsOperationOf(previewControlContract.canonicalValues),
    ),
} satisfies PreviewSourceConfig;
/** 首行与末行演示的语言输入 */
export type SelectorEndsProps = { lang?: Lang };
const Demo: FC<SelectorEndsProps> = props => {
  const { lang = 'zh' } = props;
  const values = usePreviewControls(createPreviewControlContract(lang).controls);
  return <SelectorEndsPreview {...values} lang={lang} />;
};
export default Demo;
