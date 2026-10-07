import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { usePreviewControls } from '@/modules/docs/components/component-preview/context';

import { VersionOrderPreview } from '../intake/version-order.preview';
import { createPreviewControlContract, previewControlContract } from './custom-order.controls';

export { createPreviewControlContract } from './custom-order.controls';

/** 注册回退控件 */
export const previewControls = previewControlContract.controls;
/** 比较器是运行时函数，不从 JSON 反推注册实现 */
export const previewSource = { deriveIR: false } as const;
/** 示例语言 */
export type CustomOrderProps = { lang?: Lang };
const CustomOrder: FC<CustomOrderProps> = props => {
  const { lang = 'zh' } = props;
  const values = usePreviewControls(createPreviewControlContract(lang).controls);
  return <VersionOrderPreview order={values.order} />;
};
export default CustomOrder;
