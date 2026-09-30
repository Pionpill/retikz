import { StraightBarbArrowDefinition } from '@retikz/extension';
import { Draw, Layout } from '@retikz/react';
import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract } from './straight-barb-arrow.controls';

export { createPreviewControlContract } from './straight-barb-arrow.controls';
export const previewControls = previewControlContract.controls;

const controlledPreview = defineControlledPreview(previewControlContract, values => {
  const detail = { length: values.length, width: values.width, lineWidth: values.lineWidth, color: values.color };
  return (
    <Layout
      viewBox={{ x: -190, y: -55, width: 380, height: 110 }}
      extensions={{ arrows: [StraightBarbArrowDefinition] }}
    >
      <Draw
        way={[
          [-110, 0],
          [110, 0],
        ]}
        arrow="->"
        arrowDetail={{ end: { ...detail, shape: 'straightBarb' } }}
        style={{ stroke: '#94a3b8', strokeWidth: 2 }}
      />
    </Layout>
  );
});

export const previewSource = controlledPreview.source;

/** 直线倒钩箭头的交互示例 */
const Demo: FC = controlledPreview.Component;
export default Demo;
