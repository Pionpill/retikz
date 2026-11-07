import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { usePreviewControls } from '@/modules/docs/components/component-preview/context';
import type { PreviewSourceConfig } from '@/modules/docs/preview';

import { createPreviewControlContract } from './inspect-custom.controls';
import { EndpointInspection } from './inspect-custom.preview';

export { createPreviewControlContract, previewControlContract, previewControls } from './inspect-custom.controls';

/** 控件直接更新检查器 options，主图几何保持不变 */
const Demo: FC<{ lang?: Lang }> = props => {
  const { lang = 'zh' } = props;
  const values = usePreviewControls(createPreviewControlContract(lang).controls);
  return <EndpointInspection size={values.size} />;
};
export const previewSource = {
  deriveIR: false,
  canonicalRender: () => <EndpointInspection size={10} />,
} satisfies PreviewSourceConfig;
export default Demo;
