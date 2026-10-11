import type { FC } from 'react';

import type { Lang } from '@/i18n';
import type { PreviewSourceConfig } from '@/modules/docs/preview';
import { defineControlledPreview, usePreviewControls } from '@/modules/docs/preview';

import { buildOperatorSourceViews } from '../source-views';
import { createPreviewControlContract, previewControlContract } from './reducer-center.controls';
import { reducerCenterRowsOf, reducerCenterOperationOf } from './reducer-center.data';
import { ReducerCenterPreview } from './reducer-center.preview';

/** 注册回退使用同一份控件定义 */
export const previewControls = previewControlContract.controls;
const controlledPreview = defineControlledPreview(previewControlContract, values => (
  <ReducerCenterPreview {...values} />
));
/** 源码视图展示实际数据调用及变换声明 */
export const previewSource = {
  ...controlledPreview.source,
  buildViews: () =>
    buildOperatorSourceViews(
      'reducer-center',
      reducerCenterRowsOf(previewControlContract.canonicalValues),
      reducerCenterOperationOf(previewControlContract.canonicalValues),
    ),
} satisfies PreviewSourceConfig;
/** 均值与中位数演示的语言输入 */
export type ReducerCenterProps = { lang?: Lang };
const Demo: FC<ReducerCenterProps> = props => {
  const { lang = 'zh' } = props;
  const values = usePreviewControls(createPreviewControlContract(lang).controls);
  return <ReducerCenterPreview {...values} lang={lang} />;
};
export default Demo;
