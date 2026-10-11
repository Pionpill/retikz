import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { defineControlledPreview, usePreviewControls } from '@/modules/docs/preview';
import type { PreviewSourceConfig } from '@/modules/docs/preview';

import { buildOperatorSourceViews } from '../../operators';
import { createPreviewControlContract, previewControlContract } from './group-summarize.controls';
import { groupSummarizeRowsOf, groupSummarizeOperationOf } from './group-summarize.data';
import { GroupSummarizePreview } from './group-summarize.preview';

/** 注册回退与静态源码使用同一控件定义 */
export const previewControls = previewControlContract.controls;
const controlledPreview = defineControlledPreview(previewControlContract, values => (
  <GroupSummarizePreview {...values} />
));
/** 源码视图展示公开变换调用，不包含辅助表格的绘制逻辑 */
export const previewSource = {
  ...controlledPreview.source,
  buildViews: () =>
    buildOperatorSourceViews(
      'group-summarize',
      groupSummarizeRowsOf(),
      groupSummarizeOperationOf(previewControlContract.canonicalValues),
    ),
} satisfies PreviewSourceConfig;
/** 双语演示入口 */
export type GroupSummarizeProps = { lang?: Lang };
const Demo: FC<GroupSummarizeProps> = props => {
  const { lang = 'zh' } = props;
  const values = usePreviewControls(createPreviewControlContract(lang).controls);
  return <GroupSummarizePreview {...values} lang={lang} />;
};
export default Demo;
