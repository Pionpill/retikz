import type { FC } from 'react';

import { Layout, Node, Scope } from '@retikz/react';
import { PolygonClipDefinition } from '@retikz/standard/clip';

import { defineControlledPreview } from '@/modules/docs/preview';

import { polygonClipControls, previewControlContract } from './polygon-clip.controls';

export const previewControls = polygonClipControls;

const controlledPreview = defineControlledPreview(previewControlContract, values => (
  <Layout width={340} height={220} viewBox={{ x: 0, y: 0, width: 200, height: 200 }} clips={[PolygonClipDefinition]}>
    <Node
      position={[100, 100]}
      shape="rectangle"
      minimumSize={{ width: 192, height: 180 }}
      fill="none"
      stroke="lightgray"
      strokeWidth={1}
      dashPattern={[6, 4]}
    />
    <Scope clip={{ kind: 'polygon', points: [values.top, values.right, values.left] }}>
      <Node
        position={[100, 100]}
        shape="rectangle"
        minimumSize={{ width: 192, height: 180 }}
        stroke="none"
        fill={{ kind: 'pattern', shape: 'grid', color: 'darkorange', size: 14 }}
      />
    </Scope>
  </Layout>
));

export const previewSource = controlledPreview.source;

/** 固定使用 polygon，并通过三个顶点参数调整裁剪区域 */
const Demo: FC = controlledPreview.Component;

export default Demo;
