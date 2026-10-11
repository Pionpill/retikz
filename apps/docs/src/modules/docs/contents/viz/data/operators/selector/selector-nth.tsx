import type { FC } from 'react';

import type { Lang } from '@/i18n';
import type { PreviewSourceConfig } from '@/modules/docs/preview';
import { defineControlledPreview, usePreviewControls } from '@/modules/docs/preview';

import { buildOperatorSourceViews } from '../source-views';
import { createPreviewControlContract, previewControlContract } from './selector-nth.controls';
import { selectorNthRowsOf, selectorNthOperationOf } from './selector-nth.data';
import { SelectorNthPreview } from './selector-nth.preview';

/** 注册回退使用同一份控件定义 */
export const previewControls = previewControlContract.controls;
const controlledPreview = defineControlledPreview(previewControlContract, values => <SelectorNthPreview {...values} />);
/** 源码视图展示实际数据调用及选择声明 */
export const previewSource = {
  ...controlledPreview.source,
  buildViews: () =>
    buildOperatorSourceViews(
      'selector-nth',
      selectorNthRowsOf(previewControlContract.canonicalValues),
      selectorNthOperationOf(previewControlContract.canonicalValues),
    ),
} satisfies PreviewSourceConfig;
/** 指定位置演示的语言输入 */
export type SelectorNthProps = { lang?: Lang };
const Demo: FC<SelectorNthProps> = props => {
  const { lang = 'zh' } = props;
  const values = usePreviewControls(createPreviewControlContract(lang).controls);
  return <SelectorNthPreview {...values} lang={lang} />;
};
export default Demo;
