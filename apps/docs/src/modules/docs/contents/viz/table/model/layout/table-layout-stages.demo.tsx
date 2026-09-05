import type { FC } from 'react';

import { Draw, Layout, Node, Text } from '@retikz/react';

type Stage = Readonly<{
  id: string;
  x: number;
  title: string;
  detail: string;
}>;

const stages: ReadonlyArray<Stage> = [
  { id: 'measure', x: -235, title: 'Measure', detail: 'natural content' },
  { id: 'tracks', x: -80, title: 'Solve tracks', detail: 'columns · wrap · rows' },
  { id: 'place', x: 95, title: 'Place Cells', detail: 'box · fit · overflow' },
  { id: 'borders', x: 245, title: 'Border Graph', detail: 'resolve · merge' },
];

/** 渲染 Table layout transaction 中的稳定阶段 */
const stageNode = (stage: Stage) => (
  <Node
    key={stage.id}
    id={stage.id}
    position={[stage.x, 0]}
    cornerRadius={4}
    style={{ stroke: 'gray', fill: 'lightgray', fillOpacity: 0.16 }}
    layout={{
      minimumSize: { width: stage.id === 'tracks' || stage.id === 'place' ? 144 : 122, height: 50 },
      align: 'middle',
      lineHeight: 15,
    }}
  >
    <Text font={{ size: 13, weight: 'bold' }}>{stage.title}</Text>
    <Text fill="gray" font={{ size: 10 }}>
      {stage.detail}
    </Text>
  </Node>
);

/** Cell 内容从自然测量到最终 replay 的布局主链 */
const Demo: FC = () => (
  <Layout>
    {stages.map(stageNode)}
    <Draw way={['measure', 'tracks']} arrow="->" />
    <Draw way={['tracks', 'place']} arrow="->" />
    <Draw way={['place', 'borders']} arrow="->" />
    <Node
      id="output"
      position={[95, 62]}
      cornerRadius={4}
      style={{ stroke: 'dodgerblue', fill: 'dodgerblue', fillOpacity: 0.08, font: { size: 12, weight: 'bold' } }}
      layout={{ minimumSize: { width: 144, height: 34 } }}
    >
      Final replay
    </Node>
    <Draw
      way={[
        'place',
        {
          label: {
            text: 'selected child',
            position: 'midway',
            side: 'right',
            sloped: false,
            textColor: 'gray',
            font: { size: 10 },
          },
        },
        'output',
      ]}
      arrow="->"
      style={{ dashPattern: [5, 4] }}
    />
  </Layout>
);

export default Demo;
