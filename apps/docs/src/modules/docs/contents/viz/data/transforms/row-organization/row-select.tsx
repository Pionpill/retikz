import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { defineControlledPreview, usePreviewControls } from '@/modules/docs/preview';
import type { PreviewSourceConfig } from '@/modules/docs/preview';

import { buildOperatorSourceViews } from '../../operators';
import { createPreviewControlContract, previewControlContract } from './row-select.controls';
import { rowSelectRowsOf, rowSelectOperationOf } from './row-select.data';
import { RowSelectPreview } from './row-select.preview';

/** 注册回退使用同一份控件定义 */
export const previewControls = previewControlContract.controls;
const controlledPreview = defineControlledPreview(previewControlContract, values => <RowSelectPreview {...values} />);
/** 源码视图展示实际选择调用与变换声明 */
export const previewSource = {
  ...controlledPreview.source,
  buildViews: () =>
    buildOperatorSourceViews(
      'row-select',
      rowSelectRowsOf(),
      rowSelectOperationOf(previewControlContract.canonicalValues),
    ),
} satisfies PreviewSourceConfig;
/** 选择宿主演示的语言输入 */
export type RowSelectProps = { lang?: Lang };
const Demo: FC<RowSelectProps> = props => {
  const { lang = 'zh' } = props;
  const values = usePreviewControls(createPreviewControlContract(lang).controls);
  return <RowSelectPreview {...values} lang={lang} />;
};
export default Demo;
