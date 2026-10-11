import type { FC } from 'react';

import type { Lang } from '@/i18n';
import type { PreviewSourceConfig } from '@/modules/docs/preview';
import { defineControlledPreview, usePreviewControls } from '@/modules/docs/preview';

import { buildOperatorSourceViews } from '../source-views';
import { createPreviewControlContract, previewControlContract } from './reducer-extrema.controls';
import { reducerExtremaRowsOf, reducerExtremaOperationOf } from './reducer-extrema.data';
import { ReducerExtremaPreview } from './reducer-extrema.preview';

/** 注册回退使用同一份控件定义 */
export const previewControls = previewControlContract.controls;
const controlledPreview = defineControlledPreview(previewControlContract, values => (
  <ReducerExtremaPreview {...values} />
));
/** 源码视图展示实际数据调用及变换声明 */
export const previewSource = {
  ...controlledPreview.source,
  buildViews: () =>
    buildOperatorSourceViews(
      'reducer-extrema',
      reducerExtremaRowsOf(previewControlContract.canonicalValues),
      reducerExtremaOperationOf(previewControlContract.canonicalValues),
    ),
} satisfies PreviewSourceConfig;
/** 最小值与最大值演示的语言输入 */
export type ReducerExtremaProps = { lang?: Lang };
const Demo: FC<ReducerExtremaProps> = props => {
  const { lang = 'zh' } = props;
  const values = usePreviewControls(createPreviewControlContract(lang).controls);
  return <ReducerExtremaPreview {...values} lang={lang} />;
};
export default Demo;
