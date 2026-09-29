import { SquareArrowDefinition, OpenSquareArrowDefinition } from '@retikz/extension';
import { Draw, Layout } from '@retikz/react';
import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract } from './square-arrows.controls';

export { createPreviewControlContract } from './square-arrows.controls';
export const previewControls = previewControlContract.controls;

const controlledPreview = defineControlledPreview(previewControlContract, values => {
  const detail = { length: values.length, width: values.width, lineWidth: values.lineWidth, color: values.color };
  return (
    <Layout
      viewBox={{ x: -190, y: -55, width: 380, height: 110 }}
      extensions={{ arrows: [SquareArrowDefinition, OpenSquareArrowDefinition] }}
    >
      <Draw
        way={[
          [-140, 0],
          [-20, 0],
        ]}
        arrow="->"
        arrowDetail={{ end: { ...detail, shape: 'square' } }}
        style={{ stroke: '#94a3b8', strokeWidth: 2 }}
      />
      <Draw
        way={[
          [20, 0],
          [140, 0],
        ]}
        arrow="->"
        arrowDetail={{ end: { ...detail, shape: 'openSquare' } }}
        style={{ stroke: '#94a3b8', strokeWidth: 2 }}
      />
    </Layout>
  );
});

export const previewSource = controlledPreview.source;

/** 方形箭头的交互示例 */
const Demo: FC = controlledPreview.Component;
export default Demo;
