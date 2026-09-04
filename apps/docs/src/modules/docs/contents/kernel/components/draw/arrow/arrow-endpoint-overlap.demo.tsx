import type { FC } from 'react';

import { Coordinate, Draw, Layout, Node } from '@retikz/react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { arrowEndpointOverlapControls, previewControlContract } from './arrow-endpoint-overlap.controls';

export const previewControls = arrowEndpointOverlapControls;
const controlledPreview = defineControlledPreview(previewControlContract, values => (
  <Layout width={380} height={170} viewBox={{ x: -170, y: -75, width: 340, height: 150 }}>
    <Coordinate id="A" position={[-120, 0]} />
    <Node
      id="B"
      position={[80, 0]}
      shape="rectangle"
      minimumSize={{ width: 110, height: 76 }}
      fill={{
        kind: 'pattern',
        shape: 'lines',
        size: 9,
        rotation: 45,
        color: '#cbd5e1',
        background: '#f8fafc',
        lineWidth: 1,
      }}
      stroke="#94a3b8"
      strokeWidth={1.5}
    />
    <Draw
      way={['A', 'B']}
      arrow="->"
      arrowDetail={{ shape: values.shape, length: 14, width: 14, color: '#2563eb', lineWidth: 1.5 }}
      arrowPlacement={{ overlap: values.overlap }}
      stroke="#2563eb"
      strokeWidth={2}
    />
  </Layout>
));
export const previewSource = controlledPreview.source;
/** 调整单个箭头进入 Pattern 矩形边界的比例 */
const Demo: FC = controlledPreview.Component;
export default Demo;
