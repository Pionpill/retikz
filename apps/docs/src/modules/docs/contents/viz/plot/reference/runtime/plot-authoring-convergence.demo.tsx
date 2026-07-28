import type { FC } from 'react';

import { Draw, Layout, Node, Text } from '@retikz/react';

/** 多种 authoring 入口汇入 JSON-safe Plot IR，运行时依赖保持在 IR 外 */
const Demo: FC = () => (
  <Layout width={520} height={420} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node
      id="jsx-dsl"
      position={[-130, -140]}
      minimumSize={{ width: 132, height: 50 }}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>JSX DSL</Text>
      <Text fill="gray" font={{ size: 12 }}>
        buildPlotSpec
      </Text>
    </Node>
    <Node
      id="spec-prop"
      position={[130, -140]}
      minimumSize={{ width: 132, height: 50 }}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>spec prop</Text>
      <Text fill="gray" font={{ size: 12 }}>
        React
      </Text>
    </Node>
    <Node
      id="plot-helper"
      position={[-130, -70]}
      minimumSize={{ width: 132, height: 50 }}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>plot()</Text>
      <Text fill="gray" font={{ size: 12 }}>
        Vanilla
      </Text>
    </Node>
    <Node
      id="plain-ir"
      position={[130, -70]}
      minimumSize={{ width: 132, height: 50 }}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>plain JSON</Text>
      <Text fill="gray" font={{ size: 12 }}>
        generated spec
      </Text>
    </Node>

    <Node
      id="authoring"
      position={[-95, 10]}
      minimumSize={{ width: 146, height: 58 }}
      stroke="dimgray"
      fill="dimgray"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={17}
    >
      <Text font={{ size: 14, weight: 'bold' }}>binding normalization</Text>
      <Text fill="gray" font={{ size: 12 }}>
        shared Plot owner
      </Text>
    </Node>
    <Node
      id="validation"
      position={[95, 10]}
      minimumSize={{ width: 146, height: 58 }}
      stroke="dimgray"
      fill="dimgray"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={17}
    >
      <Text font={{ size: 14, weight: 'bold' }}>schema validation</Text>
      <Text fill="gray" font={{ size: 12 }}>
        parse complete spec
      </Text>
    </Node>
    <Node
      id="plot-ir"
      position={[0, 90]}
      minimumSize={{ width: 132, height: 58 }}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={17}
    >
      <Text font={{ size: 14, weight: 'bold' }}>IRPlotSpec</Text>
      <Text fill="gray" font={{ size: 12 }}>
        JSON-safe
      </Text>
    </Node>
    <Node
      id="runtime"
      position={[0, 175]}
      minimumSize={{ width: 142, height: 58 }}
      stroke="dimgray"
      fill="dimgray"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={17}
    >
      <Text font={{ size: 14, weight: 'bold' }}>runtime execution</Text>
      <Text fill="gray" font={{ size: 12 }}>
        resolve + lower
      </Text>
    </Node>
    <Node
      id="runtime-inputs"
      position={[165, 90]}
      minimumSize={{ width: 156, height: 58 }}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={17}
    >
      <Text font={{ size: 14, weight: 'bold' }}>runtime inputs</Text>
      <Text fill="gray" font={{ size: 12 }}>
        datasets · Definitions
      </Text>
    </Node>

    <Draw way={['jsx-dsl', 'authoring']} arrow="->" stroke="gray" />
    <Draw way={['plot-helper', 'authoring']} arrow="->" stroke="gray" />
    <Draw way={['spec-prop', 'validation']} arrow="->" stroke="gray" />
    <Draw way={['plain-ir', 'validation']} arrow="->" stroke="gray" />
    <Draw way={['authoring', 'validation']} arrow="->" stroke="gray" />
    <Draw way={['validation', 'plot-ir']} arrow="->" stroke="gray" />
    <Draw way={['plot-ir', 'runtime']} arrow="->" stroke="gray" />
    <Draw way={['runtime-inputs', 'runtime']} arrow="->" stroke="gray" dashPattern={[4, 3]} />
  </Layout>
);

export default Demo;
