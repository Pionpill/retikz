import type { FC } from 'react';

import type { Lang } from '@/i18n';
import type { PreviewSourceConfig } from '@/modules/docs/preview';
import { defineControlledPreview, usePreviewControls } from '@/modules/docs/preview';

import { buildOperatorSourceViews } from '../source-views';
import { createPreviewControlContract, previewControlContract } from './reducer-sum.controls';
import { reducerSumRowsOf, reducerSumOperationOf } from './reducer-sum.data';
import { ReducerSumPreview } from './reducer-sum.preview';

/** 注册回退使用同一份控件定义 */
export const previewControls = previewControlContract.controls;
const controlledPreview = defineControlledPreview(previewControlContract, values => <ReducerSumPreview {...values} />);
/** 源码视图展示实际数据调用及变换声明 */
export const previewSource = {
  ...controlledPreview.source,
  buildViews: () =>
    buildOperatorSourceViews(
      'reducer-sum',
      reducerSumRowsOf(previewControlContract.canonicalValues),
      reducerSumOperationOf(previewControlContract.canonicalValues),
    ),
} satisfies PreviewSourceConfig;
/** 求和演示的语言输入 */
export type ReducerSumProps = { lang?: Lang };
const Demo: FC<ReducerSumProps> = props => {
  const { lang = 'zh' } = props;
  const values = usePreviewControls(createPreviewControlContract(lang).controls);
  return <ReducerSumPreview {...values} lang={lang} />;
};
export default Demo;
