import type { FC } from 'react';

import { Draw, Layout, Node, Text } from '@retikz/react';

import { LogicFigureFrame, LogicFigureFrameTitle } from '@/modules/docs/components/logic-figure';

/** Relationship between Data contracts, runtime dependencies, processing stages, and results */
const Demo: FC = () => (
  <Layout width={520} height={300} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node
      id="external-rows"
      position={[0, -130]}
      minimumSize={{ width: 132, height: 54 }}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>External rows</Text>
      <Text fill="gray" font={{ size: 12 }}>
        host-provided data
      </Text>
    </Node>

    <Node
      id="data-model"
      position={[-180, -37]}
      minimumSize={{ width: 136, height: 50 }}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>Data model</Text>
      <Text fill="gray" font={{ size: 12 }}>
        JSON contract
      </Text>
    </Node>

    <Node
      id="format-registry"
      position={[180, -37]}
      minimumSize={{ width: 146, height: 50 }}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>format registry</Text>
      <Text fill="gray" font={{ size: 12 }}>
        built-in · custom
      </Text>
    </Node>

    <Node
      id="operations"
      position={[-180, 37]}
      minimumSize={{ width: 136, height: 50 }}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>Operations</Text>
      <Text fill="gray" font={{ size: 12 }}>
        JSON contracts
      </Text>
    </Node>

    <Node
      id="operation-registries"
      position={[180, 37]}
      minimumSize={{ width: 168, height: 50 }}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>operation registries</Text>
      <Text fill="gray" font={{ size: 12 }}>
        transform · reducer · selector
      </Text>
    </Node>

    <LogicFigureFrame id="data-runtime">
      <LogicFigureFrameTitle>@retikz/data runtime</LogicFigureFrameTitle>
      <Node
        id="field-preparation"
        position={[0, -37]}
        minimumSize={{ width: 150, height: 58 }}
        stroke="dimgray"
        fill="dimgray"
        fillOpacity={0.08}
        cornerRadius={4}
        align="middle"
        lineHeight={17}
      >
        <Text font={{ size: 14, weight: 'bold' }}>field preparation</Text>
        <Text fill="gray" font={{ size: 12 }}>
          resolve · normalize
        </Text>
      </Node>
      <Node
        id="transforms"
        position={[0, 37]}
        minimumSize={{ width: 136, height: 58 }}
        stroke="dimgray"
        fill="dimgray"
        fillOpacity={0.08}
        cornerRadius={4}
        align="middle"
        lineHeight={17}
      >
        <Text font={{ size: 14, weight: 'bold' }}>transforms</Text>
        <Text fill="gray" font={{ size: 12 }}>
          validate · execute
        </Text>
      </Node>
    </LogicFigureFrame>

    <Node
      id="rows"
      position={[0, 114]}
      minimumSize={{ width: 144, height: 50 }}
      stroke="gray"
      fill="gray"
      fillOpacity={0.06}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>rows</Text>
      <Text fill="gray" font={{ size: 12 }}>
        canonical · Symbol provenance
      </Text>
    </Node>

    <Node
      id="lineage"
      position={[180, 114]}
      minimumSize={{ width: 132, height: 50 }}
      stroke="gray"
      fill="gray"
      fillOpacity={0.06}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>lineage</Text>
      <Text fill="gray" font={{ size: 12 }}>
        optional run · events
      </Text>
    </Node>

    <Draw
      way={[
        { id: 'external-rows', anchor: 'bottom', offset: [55, 0] },
        { id: 'field-preparation', anchor: 'top', offset: [55, 0] },
      ]}
      arrow="->"
      stroke="gray"
    />
    <Draw way={['field-preparation', 'transforms']} arrow="->" stroke="gray" />
    <Draw way={['transforms', 'rows']} arrow="->" stroke="gray" />
    <Draw
      way={[
        { id: 'transforms', anchor: 'bottom', offset: [55, 0] },
        [55, 78],
        [100, 78],
        [100, 114],
        { id: 'lineage', anchor: 'left' },
      ]}
      arrow="->"
      stroke="gray"
      dashPattern={[4, 3]}
    />
    <Draw way={['data-model', 'field-preparation']} arrow="->" stroke="gray" dashPattern={[4, 3]} />
    <Draw way={['format-registry', 'field-preparation']} arrow="->" stroke="gray" dashPattern={[4, 3]} />
    <Draw way={['operations', 'transforms']} arrow="->" stroke="gray" dashPattern={[4, 3]} />
    <Draw way={['operation-registries', 'transforms']} arrow="->" stroke="gray" dashPattern={[4, 3]} />
  </Layout>
);

export default Demo;
