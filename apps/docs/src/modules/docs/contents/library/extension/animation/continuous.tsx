import { pulse, spin } from '@retikz/extension';
import { Layout, Node } from '@retikz/react';
import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract } from './continuous.controls';

export { createPreviewControlContract } from './continuous.controls';
export const previewControls = previewControlContract.controls;

const controlledPreview = defineControlledPreview(previewControlContract, values => {
  const track =
    values.effect === 'pulse'
      ? pulse({ duration: values.duration, peak: values.peak })
      : spin({ duration: values.duration });
  return (
    <Layout key={JSON.stringify(values)} viewBox={{ x: -110, y: -75, width: 220, height: 150 }}>
      <Node
        id="continuous-effect"
        shape="rectangle"
        layout={{ minimumSize: { width: 72, height: 52 } }}
        style={{ fill: '#dbeafe', stroke: '#2563eb', strokeWidth: 2 }}
        animations={[track]}
      />
    </Layout>
  );
});

export const previewSource = controlledPreview.source;

/** 持续强调的交互示例 */
const Demo: FC = controlledPreview.Component;
export default Demo;
