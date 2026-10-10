import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { defineControlledPreview, usePreviewControls } from '@/modules/docs/preview';

import { RegressionPreview } from './regression-preview';
import { createPreviewControlContract, previewControlContract } from './regression-transformed.controls';

/** 注册回退共用控件契约 */
export const previewControls = previewControlContract.controls;
const controlledPreview = defineControlledPreview(previewControlContract, values => <RegressionPreview {...values} />);
/** 稳定基线派生源码 */
export const previewSource = controlledPreview.source;
/** 图示语言 */
export type RegressionTransformedProps = { lang?: Lang };
const Demo: FC<RegressionTransformedProps> = props => {
  const { lang = 'zh' } = props;
  const values = usePreviewControls(createPreviewControlContract(lang).controls);
  return <RegressionPreview {...values} lang={lang} />;
};
export default Demo;
