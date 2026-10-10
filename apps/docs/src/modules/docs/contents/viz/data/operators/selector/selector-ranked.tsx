import type { FC } from 'react';

import type { Lang } from '@/i18n';
import type { PreviewSourceConfig } from '@/modules/docs/preview';
import { defineControlledPreview, usePreviewControls } from '@/modules/docs/preview';

import { buildOperatorSourceViews } from '../source-views';
import { createPreviewControlContract, previewControlContract } from './selector-ranked.controls';
import { selectorRankedRowsOf, selectorRankedOperationOf } from './selector-ranked.data';
import { SelectorRankedPreview } from './selector-ranked.preview';

/** 注册回退使用同一份控件定义 */
export const previewControls = previewControlContract.controls;
const controlledPreview = defineControlledPreview(previewControlContract, values => (
  <SelectorRankedPreview {...values} />
));
/** 源码视图展示实际数据调用及选择声明 */
export const previewSource = {
  ...controlledPreview.source,
  buildViews: () =>
    buildOperatorSourceViews(
      'selector-ranked',
      selectorRankedRowsOf(previewControlContract.canonicalValues),
      selectorRankedOperationOf(previewControlContract.canonicalValues),
    ),
} satisfies PreviewSourceConfig;
/** 最高与最低 N 行演示的语言输入 */
export type SelectorRankedProps = { lang?: Lang };
const Demo: FC<SelectorRankedProps> = props => {
  const { lang = 'zh' } = props;
  const values = usePreviewControls(createPreviewControlContract(lang).controls);
  return <SelectorRankedPreview {...values} lang={lang} />;
};
export default Demo;
