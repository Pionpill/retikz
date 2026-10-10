import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { defineControlledPreview, usePreviewControls } from '@/modules/docs/preview';

import { createPreviewControlContract, previewControlContract } from './extension-regression.controls';
import { ExtensionRegressionPreview } from './extension-regression.preview';

/** 注册回退共用控件 */
export const previewControls = previewControlContract.controls;
const controlledPreview = defineControlledPreview(previewControlContract, values => (
  <ExtensionRegressionPreview {...values} />
));
/** 基线派生源码 */
export const previewSource = controlledPreview.source;
/** 图示语言 */
export type ExtensionRegressionProps = { lang?: Lang };
const Demo: FC<ExtensionRegressionProps> = props => {
  const { lang = 'zh' } = props;
  const values = usePreviewControls(createPreviewControlContract(lang).controls);
  return <ExtensionRegressionPreview {...values} lang={lang} />;
};
export default Demo;
