import { flash, blink } from '@retikz/extension';
import { Layout, Node } from '@retikz/react';
import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract } from './opacity.controls';

export { createPreviewControlContract } from './opacity.controls';
export const previewControls = previewControlContract.controls;

const controlledPreview = defineControlledPreview(previewControlContract, values => {
  const track =
    values.effect === 'flash'
      ? flash({ duration: values.duration, dim: values.dim })
      : blink({ duration: values.duration, dim: values.dim });
  return (
    <Layout key={JSON.stringify(values)} viewBox={{ x: -110, y: -75, width: 220, height: 150 }}>
      <Node
        id="opacity-effect"
        shape="rectangle"
        layout={{ minimumSize: { width: 72, height: 52 } }}
        style={{ fill: '#dbeafe', stroke: '#2563eb', strokeWidth: 2 }}
        animations={[track]}
      />
    </Layout>
  );
});

export const previewSource = controlledPreview.source;

/** 透明度闪烁的交互示例 */
const Demo: FC = controlledPreview.Component;
export default Demo;
