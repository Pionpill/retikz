import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { defineControlledPreview, usePreviewControls } from '@/modules/docs/preview';
import type { PreviewSourceConfig } from '@/modules/docs/preview';

import { buildOperatorSourceViews } from '../../operators';
import { createPreviewControlContract, previewControlContract } from './row-sort.controls';
import { rowSortRowsOf, rowSortOperationOf } from './row-sort.data';
import { RowSortPreview } from './row-sort.preview';

/** 注册回退使用同一份控件定义 */
export const previewControls = previewControlContract.controls;
const controlledPreview = defineControlledPreview(previewControlContract, values => <RowSortPreview {...values} />);
/** 源码视图展示实际排序调用与变换声明 */
export const previewSource = {
  ...controlledPreview.source,
  buildViews: () =>
    buildOperatorSourceViews('row-sort', rowSortRowsOf(), rowSortOperationOf(previewControlContract.canonicalValues)),
} satisfies PreviewSourceConfig;
/** 排序演示的语言输入 */
export type RowSortProps = { lang?: Lang };
const Demo: FC<RowSortProps> = props => {
  const { lang = 'zh' } = props;
  const values = usePreviewControls(createPreviewControlContract(lang).controls);
  return <RowSortPreview {...values} lang={lang} />;
};
export default Demo;
