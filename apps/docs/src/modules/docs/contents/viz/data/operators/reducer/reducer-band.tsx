import type { FC } from 'react';

import type { Lang } from '@/i18n';
import type { PreviewSourceConfig } from '@/modules/docs/preview';
import { defineControlledPreview, usePreviewControls } from '@/modules/docs/preview';

import { buildOperatorSourceViews } from '../source-views';
import { createPreviewControlContract, previewControlContract } from './reducer-band.controls';
import { reducerBandRowsOf, reducerBandOperationOf } from './reducer-band.data';
import { ReducerBandPreview } from './reducer-band.preview';

/** 注册回退使用同一份控件定义 */
export const previewControls = previewControlContract.controls;
const controlledPreview = defineControlledPreview(previewControlContract, values => <ReducerBandPreview {...values} />);
/** 源码视图展示实际数据调用及变换声明 */
export const previewSource = {
  ...controlledPreview.source,
  buildViews: () =>
    buildOperatorSourceViews(
      'reducer-band',
      reducerBandRowsOf(previewControlContract.canonicalValues),
      reducerBandOperationOf(previewControlContract.canonicalValues),
    ),
} satisfies PreviewSourceConfig;
/** 分位区间演示的语言输入 */
export type ReducerBandProps = { lang?: Lang };
const Demo: FC<ReducerBandProps> = props => {
  const { lang = 'zh' } = props;
  const values = usePreviewControls(createPreviewControlContract(lang).controls);
  return <ReducerBandPreview {...values} lang={lang} />;
};
export default Demo;
