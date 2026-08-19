import type { FC } from 'react';

import { Draw, Layout } from '@retikz/react';
import { CrowFootArrowDefinition } from '@retikz/standard/arrow';

import { defineControlledPreview } from '@/modules/docs/preview';

import { crowFootArrowControls, previewControlContract } from './crow-foot-arrow.controls';

export const previewControls = crowFootArrowControls;
const controlledPreview = defineControlledPreview(previewControlContract, values => (
  <Layout
    width={420}
    height={180}
    viewBox={{ x: -160, y: -70, width: 320, height: 140 }}
    arrows={[CrowFootArrowDefinition]}
  >
    <Draw
      way={[
        [-120, 0],
        [120, 0],
      ]}
      arrow="->"
      arrowDetail={{
        end: {
          shape: 'crowFoot',
          length: values.length,
          width: values.width,
          lineWidth: values.lineWidth,
          color: values.color,
        },
      }}
      stroke="#64748b"
      strokeWidth={2}
    />
  </Layout>
));
export const previewSource = controlledPreview.source;
/** 固定 CrowFoot marker 并调整端点视觉参数 */
const Demo: FC = controlledPreview.Component;
export default Demo;
