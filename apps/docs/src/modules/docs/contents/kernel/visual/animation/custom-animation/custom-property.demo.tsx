import { createInputScene, Node } from '@retikz/react';
import { normalizeScene } from '@retikz/vanilla';
import type { FC } from 'react';

import { synchronousInputAdaptersOf } from '@/modules/docs/lib';
import type { PreviewSourceConfig } from '@/modules/docs/preview';
import { usePreviewControls } from '@/modules/docs/preview';

import { customPropertyControls, previewControlContract } from './custom-property.controls';
import { createBlurIn } from './custom-property.data';
import { CustomPropertyPreview } from './custom-property.preview';

export const previewControls = customPropertyControls;

export const previewSource = { deriveIR: false } satisfies PreviewSourceConfig;

/** 源码面板使用 canonical 状态生成 IR 与 Vanilla，避免执行带 hook 的交互组件 */
const previewInput = createInputScene(
  <Node
    id="a"
    position={[0, 0]}
    animations={[
      createBlurIn(previewControlContract.canonicalValues.blur, previewControlContract.canonicalValues.duration),
    ]}
    style={{ fill: '#3b82f6' }}
  >
    blur
  </Node>,
);

export const previewIR = normalizeScene(previewInput.scene, {
  adapters: synchronousInputAdaptersOf(previewInput.adapters),
}).ir;

const Demo: FC = () => {
  const values = usePreviewControls(customPropertyControls);
  return CustomPropertyPreview({ blur: values.blur, duration: values.duration });
};

export default Demo;
