import type { IRAnimationOrigin } from '@retikz/core';
import { grow, growUp } from '@retikz/extension';
import { Layout, Node } from '@retikz/react';
import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract } from './growth.controls';

export { createPreviewControlContract } from './growth.controls';
export const previewControls = previewControlContract.controls;

const controlledPreview = defineControlledPreview(previewControlContract, values => {
  const track =
    values.effect === 'grow'
      ? grow({ duration: values.duration, origin: values.origin as IRAnimationOrigin })
      : growUp({ duration: values.duration, origin: values.origin as IRAnimationOrigin });
  return (
    <Layout key={JSON.stringify(values)} viewBox={{ x: -110, y: -75, width: 220, height: 150 }}>
      <Node
        id="growth-effect"
        shape="rectangle"
        layout={{ minimumSize: { width: 72, height: 52 } }}
        style={{ fill: '#dbeafe', stroke: '#2563eb', strokeWidth: 2 }}
        animations={[track]}
      />
    </Layout>
  );
});

export const previewSource = controlledPreview.source;

/** 生长入场的交互示例 */
const Demo: FC = controlledPreview.Component;
export default Demo;
