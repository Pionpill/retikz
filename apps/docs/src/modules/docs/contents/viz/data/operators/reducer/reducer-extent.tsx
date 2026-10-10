import type { FC } from 'react';

import type { Lang } from '@/i18n';
import type { PreviewSourceConfig } from '@/modules/docs/preview';
import { defineControlledPreview, usePreviewControls } from '@/modules/docs/preview';

import { buildOperatorSourceViews } from '../source-views';
import { createPreviewControlContract, previewControlContract } from './reducer-extent.controls';
import { reducerExtentRowsOf, reducerExtentOperationOf } from './reducer-extent.data';
import { ReducerExtentPreview } from './reducer-extent.preview';

/** 注册回退使用同一份控件定义 */
export const previewControls = previewControlContract.controls;
const controlledPreview = defineControlledPreview(previewControlContract, values => (
  <ReducerExtentPreview {...values} />
));
/** 源码视图展示实际数据调用及变换声明 */
export const previewSource = {
  ...controlledPreview.source,
  buildViews: () =>
    buildOperatorSourceViews(
      'reducer-extent',
      reducerExtentRowsOf(previewControlContract.canonicalValues),
      reducerExtentOperationOf(previewControlContract.canonicalValues),
    ),
} satisfies PreviewSourceConfig;
/** 数值范围演示的语言输入 */
export type ReducerExtentProps = { lang?: Lang };
const Demo: FC<ReducerExtentProps> = props => {
  const { lang = 'zh' } = props;
  const values = usePreviewControls(createPreviewControlContract(lang).controls);
  return <ReducerExtentPreview {...values} lang={lang} />;
};
export default Demo;
