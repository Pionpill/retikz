import { Draw, Layout, Node } from '@retikz/react';
import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract } from './layout-defaults.controls';

export const previewControls = previewControlContract.controls;

const controlledPreview = defineControlledPreview(previewControlContract, values => (
  <Layout
    width={320}
    height={240}
    rootScope={{
      style: { stroke: values.stroke, strokeWidth: values.strokeWidth, opacity: values.opacity },
      defaults: { node: { style: { fill: values.fill, textColor: '#0f172a' }, layout: { padding: values.padding } } },
    }}
  >
    <Node id="A" position={[0, 0]}>
      a
    </Node>
    <Node id="B" position={[160, 0]}>
      b
    </Node>
    <Node id="C" position={[80, 100]}>
      c
    </Node>
    <Draw way={['A', 'B']} />
    <Draw way={['B', 'C']} />
    <Draw way={['C', 'A']} />
  </Layout>
));

export const previewSource = controlledPreview.source;

/** Apply root defaults to every node and path */
const Demo: FC = controlledPreview.Component;

export default Demo;
