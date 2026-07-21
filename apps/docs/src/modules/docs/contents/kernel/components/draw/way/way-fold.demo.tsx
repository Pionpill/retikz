import type { FC } from 'react';

import { Circle, Draw, Layout, Node } from '@retikz/react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract,wayFoldControls } from './way-fold.controls';

export const previewControls = wayFoldControls;

const Start: [number, number] = [-120, -50];
const End: [number, number] = [120, 50];

const controlledPreview = defineControlledPreview(previewControlContract, values => {
  const corner: [number, number] = values.direction === '-|' ? [End[0], Start[1]] : [Start[0], End[1]];

  return (
    <Layout width={400} height={220} viewBox={{ x: -170, y: -110, width: 340, height: 220 }}>
      <Node id="A" position={Start} stroke="gray" dashed>
        a
      </Node>
      <Node id="B" position={End} stroke="gray" dashed>
        b
      </Node>
      <Draw way={['A.center', 'B.center']} stroke="gray" dashPattern={[1, 4]} lineCap="round" />
      <Draw way={['A.center', values.direction, 'B.center']} stroke="dodgerblue" strokeWidth={2} />
      <Circle center={corner} radius={4} fill="white" stroke="gray" />
    </Layout>
  );
});

export const previewSource = controlledPreview.source;

/** 用固定端点和投影拐点展示 Way 折角方向 */
const Demo: FC = controlledPreview.Component;

export default Demo;
