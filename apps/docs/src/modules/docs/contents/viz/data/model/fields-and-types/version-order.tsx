import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { usePreviewControls } from '@/modules/docs/components/component-preview/context';

import { createPreviewControlContract, previewControlContract } from './version-order.controls';
import { VersionOrderPreview } from './version-order.preview';

/** 注册回退控件 */
export const previewControls = previewControlContract.controls;
/** 比较器是运行时函数，不从 JSON 反推注册实现 */
export const previewSource = { deriveIR: false } as const;
/** 示例语言 */
export type VersionOrderProps = { lang?: Lang };
const VersionOrder: FC<VersionOrderProps> = props => {
  const { lang = 'zh' } = props;
  const values = usePreviewControls(createPreviewControlContract(lang).controls);
  return <VersionOrderPreview order={values.order} />;
};
export default VersionOrder;
