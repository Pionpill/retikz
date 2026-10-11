import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { defineControlledPreview, usePreviewControls } from '@/modules/docs/preview';
import type { PreviewSourceConfig } from '@/modules/docs/preview';

import { buildOperatorSourceViews } from '../../operators';
import { createPreviewControlContract, previewControlContract } from './group-annotate.controls';
import { groupAnnotateRowsOf, groupAnnotateOperationOf } from './group-annotate.data';
import { GroupAnnotatePreview } from './group-annotate.preview';

/** 注册回退与静态源码使用同一控件定义 */
export const previewControls = previewControlContract.controls;
const controlledPreview = defineControlledPreview(previewControlContract, values => (
  <GroupAnnotatePreview {...values} />
));
/** 源码视图展示公开变换调用，不包含辅助表格的绘制逻辑 */
export const previewSource = {
  ...controlledPreview.source,
  buildViews: () =>
    buildOperatorSourceViews(
      'group-annotate',
      groupAnnotateRowsOf(),
      groupAnnotateOperationOf(previewControlContract.canonicalValues),
    ),
} satisfies PreviewSourceConfig;
/** 双语演示入口 */
export type GroupAnnotateProps = { lang?: Lang };
const Demo: FC<GroupAnnotateProps> = props => {
  const { lang = 'zh' } = props;
  const values = usePreviewControls(createPreviewControlContract(lang).controls);
  return <GroupAnnotatePreview {...values} lang={lang} />;
};
export default Demo;
