import type { FC } from 'react';

import { Circle, Draw, Layout, Node } from '@retikz/react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract, wayFoldControls } from './way-fold.controls';

export const previewControls = wayFoldControls;

const Start: [number, number] = [-120, -50];
const End: [number, number] = [120, 50];

const controlledPreview = defineControlledPreview(previewControlContract, values => {
  const corners: Array<[number, number]> = (() => {
    if (values.direction === '-|') return [[End[0], Start[1]]];
    if (values.direction === '|-') return [[Start[0], End[1]]];
    if (values.direction === '-|-') {
      const x = Start[0] + (End[0] - Start[0]) * values.fraction;
      return [
        [x, Start[1]],
        [x, End[1]],
      ];
    }
    const y = Start[1] + (End[1] - Start[1]) * values.fraction;
    return [
      [Start[0], y],
      [End[0], y],
    ];
  })();
  const fold =
    values.direction === '-|-' || values.direction === '|-|'
      ? { via: values.direction, fraction: values.fraction }
      : values.direction;

  return (
    <Layout width={400} height={220} viewBox={{ x: -170, y: -110, width: 340, height: 220 }}>
      <Node id="A" position={Start} stroke="gray" dashed>
        a
      </Node>
      <Node id="B" position={End} stroke="gray" dashed>
        b
      </Node>
      <Draw way={['A.center', 'B.center']} stroke="gray" dashPattern={[1, 4]} lineCap="round" />
      <Draw way={['A.center', fold, 'B.center']} stroke="dodgerblue" strokeWidth={2} />
      {corners.map((corner, index) => (
        <Circle key={index} center={corner} radius={4} fill="white" stroke="gray" />
      ))}
    </Layout>
  );
});

export const previewSource = controlledPreview.source;

/** 用固定端点和投影拐点展示 Way 折角方向 */
const Demo: FC = controlledPreview.Component;

export default Demo;
