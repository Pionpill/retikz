import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { usePreviewControls } from '@/modules/docs/components/component-preview/context';

import { createPreviewControlContract, previewControlContract } from './external-execution.controls';
import { ExternalExecutionPreview } from './external-execution.preview';

/** 注册回退使用的执行控件 */
export const previewControls = previewControlContract.controls;

/** hooks与外接句柄不参与同步源码推导 */
export const previewSource = { deriveIR: false } as const;

/** 外接Promise示例的语言输入 */
export type ExternalExecutionProps = { lang?: Lang };

const ExternalExecution: FC<ExternalExecutionProps> = props => {
  const { lang = 'zh' } = props;
  const values = usePreviewControls(createPreviewControlContract(lang).controls);
  return <ExternalExecutionPreview lang={lang} mode={values.mode} factor={values.factor} />;
};
export default ExternalExecution;
