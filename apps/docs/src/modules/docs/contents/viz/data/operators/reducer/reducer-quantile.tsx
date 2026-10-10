import type { FC } from 'react';

import type { Lang } from '@/i18n';
import type { PreviewSourceConfig } from '@/modules/docs/preview';
import { defineControlledPreview, usePreviewControls } from '@/modules/docs/preview';

import { buildOperatorSourceViews } from '../source-views';
import { createPreviewControlContract, previewControlContract } from './reducer-quantile.controls';
import { reducerQuantileRowsOf, reducerQuantileOperationOf } from './reducer-quantile.data';
import { ReducerQuantilePreview } from './reducer-quantile.preview';

/** 注册回退使用同一份控件定义 */
export const previewControls = previewControlContract.controls;
const controlledPreview = defineControlledPreview(previewControlContract, values => (
  <ReducerQuantilePreview {...values} />
));
/** 源码视图展示实际数据调用及变换声明 */
export const previewSource = {
  ...controlledPreview.source,
  buildViews: () =>
    buildOperatorSourceViews(
      'reducer-quantile',
      reducerQuantileRowsOf(previewControlContract.canonicalValues),
      reducerQuantileOperationOf(previewControlContract.canonicalValues),
    ),
} satisfies PreviewSourceConfig;
/** 分位数演示的语言输入 */
export type ReducerQuantileProps = { lang?: Lang };
const Demo: FC<ReducerQuantileProps> = props => {
  const { lang = 'zh' } = props;
  const values = usePreviewControls(createPreviewControlContract(lang).controls);
  return <ReducerQuantilePreview {...values} lang={lang} />;
};
export default Demo;
