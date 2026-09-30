import { wiggle } from '@retikz/extension';
import { Layout, Node } from '@retikz/react';
import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract } from './wiggle.controls';

export { createPreviewControlContract } from './wiggle.controls';
export const previewControls = previewControlContract.controls;

const controlledPreview = defineControlledPreview(previewControlContract, values => {
  const track = wiggle({ duration: values.duration, angle: values.angle });
  return (
    <Layout key={JSON.stringify(values)} viewBox={{ x: -110, y: -75, width: 220, height: 150 }}>
      <Node
        id="wiggle-effect"
        shape="rectangle"
        layout={{ minimumSize: { width: 72, height: 52 } }}
        style={{ fill: '#dbeafe', stroke: '#2563eb', strokeWidth: 2 }}
        animations={[track]}
      />
    </Layout>
  );
});

export const previewSource = controlledPreview.source;

/** 摆动强调的交互示例 */
const Demo: FC = controlledPreview.Component;
export default Demo;
