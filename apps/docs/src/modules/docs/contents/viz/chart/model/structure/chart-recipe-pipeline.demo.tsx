import type { FC } from 'react';

import { Draw, Layout, Node, Text } from '@retikz/react';

const nodeStyle = {
  cornerRadius: 4,
  minimumSize: { width: 132, height: 58 },
  padding: 8,
  align: 'middle',
  lineHeight: 17,
} as const;

/** Chart Source 经 family / chartType recipe 进入 Plot 与 Surface 的运行链路 */
const Demo: FC = () => (
  <Layout
    width={720}
    height={180}
    viewBox={{ x: -360, y: -90, width: 720, height: 180 }}
    style={{ maxWidth: '100%', height: 'auto' }}
  >
    <Node id="source" position={[-285, 0]} stroke="darkorange" fill="darkorange" fillOpacity={0.08} {...nodeStyle}>
      <Text font={{ size: 14, weight: 'bold' }}>Chart Source</Text>
      <Text fill="gray" font={{ size: 12 }}>
        family + chartType
      </Text>
    </Node>
    <Node id="recipe" position={[-95, 0]} stroke="dodgerblue" fill="dodgerblue" fillOpacity={0.08} {...nodeStyle}>
      <Text font={{ size: 14, weight: 'bold' }}>Type Recipe</Text>
      <Text fill="gray" font={{ size: 12 }}>
        exact schema
      </Text>
    </Node>
    <Node id="merge" position={[95, 0]} stroke="dodgerblue" fill="dodgerblue" fillOpacity={0.08} {...nodeStyle}>
      <Text font={{ size: 14, weight: 'bold' }}>Plot Merge</Text>
      <Text fill="gray" font={{ size: 12 }}>
        semantic mark
      </Text>
    </Node>
    <Node id="plot" position={[285, 0]} stroke="darkviolet" fill="darkviolet" fillOpacity={0.08} {...nodeStyle}>
      <Text font={{ size: 14, weight: 'bold' }}>IRPlot</Text>
      <Text fill="gray" font={{ size: 12 }}>
        marks + guides
      </Text>
    </Node>

    <Draw
      way={[
        'source',
        {
          label: {
            text: 'match',
            position: 'midway',
            side: 'top',
            sloped: false,
            textColor: 'gray',
            font: { size: 12 },
          },
        },
        'recipe',
      ]}
      arrow="->"
    />
    <Draw
      way={[
        'recipe',
        {
          label: {
            text: 'resolve',
            position: 'midway',
            side: 'top',
            sloped: false,
            textColor: 'gray',
            font: { size: 12 },
          },
        },
        'merge',
      ]}
      arrow="->"
    />
    <Draw
      way={[
        'merge',
        {
          label: {
            text: 'lower',
            position: 'midway',
            side: 'top',
            sloped: false,
            textColor: 'gray',
            font: { size: 12 },
          },
        },
        'plot',
      ]}
      arrow="->"
    />
  </Layout>
);

export default Demo;
