import type { FC } from 'react';

import { Draw, Layout, Node, Text } from '@retikz/react';

/** 多种 authoring 入口汇入 JSON-safe Plot IR，运行时依赖保持在 IR 外 */
const Demo: FC = () => (
  <Layout width={820} height={300} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node
      id="dsl-inputs"
      position={[-310, 10]}
      minimumSize={{ width: 126, height: 58 }}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={17}
    >
      <Text font={{ size: 14, weight: 'bold' }}>DSL inputs</Text>
      <Text fill="gray" font={{ size: 12 }}>
        JSX DSL · plot()
      </Text>
    </Node>
    <Node
      id="authoring"
      position={[-145, 10]}
      minimumSize={{ width: 142, height: 58 }}
      stroke="dimgray"
      fill="dimgray"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={17}
    >
      <Text font={{ size: 14, weight: 'bold' }}>normalization</Text>
      <Text fill="gray" font={{ size: 12 }}>
        shared Plot owner
      </Text>
    </Node>
    <Node
      id="validation"
      position={[20, 10]}
      minimumSize={{ width: 132, height: 58 }}
      stroke="dimgray"
      fill="dimgray"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={17}
    >
      <Text font={{ size: 14, weight: 'bold' }}>validation</Text>
      <Text fill="gray" font={{ size: 12 }}>
        PlotSchema
      </Text>
    </Node>
    <Node
      id="plot-ir"
      position={[175, 10]}
      minimumSize={{ width: 124, height: 58 }}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={17}
    >
      <Text font={{ size: 14, weight: 'bold' }}>IRPlot</Text>
      <Text fill="gray" font={{ size: 12 }}>
        JSON-safe
      </Text>
    </Node>
    <Node
      id="runtime"
      position={[330, 10]}
      minimumSize={{ width: 126, height: 58 }}
      stroke="dimgray"
      fill="dimgray"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={17}
    >
      <Text font={{ size: 14, weight: 'bold' }}>execution</Text>
      <Text fill="gray" font={{ size: 12 }}>
        resolve + lower
      </Text>
    </Node>

    <Node
      id="complete-spec"
      position={[20, -90]}
      minimumSize={{ width: 142, height: 50 }}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>complete spec</Text>
      <Text fill="gray" font={{ size: 12 }}>
        spec prop · plain JSON
      </Text>
    </Node>
    <Node
      id="runtime-inputs"
      position={[330, 110]}
      minimumSize={{ width: 142, height: 50 }}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>runtime inputs</Text>
      <Text fill="gray" font={{ size: 12 }}>
        datasets · Definitions
      </Text>
    </Node>

    <Draw way={['dsl-inputs', 'authoring']} arrow="->" stroke="gray" />
    <Draw way={['authoring', 'validation']} arrow="->" stroke="gray" />
    <Draw way={['validation', 'plot-ir']} arrow="->" stroke="gray" />
    <Draw way={['plot-ir', 'runtime']} arrow="->" stroke="gray" />
    <Draw way={['complete-spec', 'validation']} arrow="->" stroke="gray" />
    <Draw way={['runtime-inputs', 'runtime']} arrow="->" stroke="gray" dashPattern={[4, 3]} />
  </Layout>
);

export default Demo;
