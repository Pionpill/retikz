import type { FC } from 'react';

import { Draw, Layout, Node, Text } from '@retikz/react';

/** Overall data-model flow from external rows to downstream consumers */
const Demo: FC = () => (
  <Layout width={700} height={220} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node
      id="rows"
      position={[-245, 25]}
      cornerRadius={4}
      style={{ stroke: 'gray', fill: 'lightgray', fillOpacity: 0.12 }}
      layout={{ minimumSize: { width: 120, height: 58 }, align: 'middle', lineHeight: 17 }}
    >
      <Text font={{ size: 14, weight: 'bold' }}>External rows</Text>
      <Text fill="gray" font={{ size: 12 }}>
        APIs · files · databases
      </Text>
    </Node>
    <Node
      id="canonical"
      position={[-25, 25]}
      cornerRadius={4}
      style={{ stroke: 'gray', fill: 'lightgray', fillOpacity: 0.12 }}
      layout={{ minimumSize: { width: 126, height: 58 }, align: 'middle', lineHeight: 17 }}
    >
      <Text font={{ size: 14, weight: 'bold' }}>Canonical rows</Text>
      <Text fill="gray" font={{ size: 12 }}>
        logical fields + values
      </Text>
    </Node>
    <Node
      id="consumers"
      position={[225, 25]}
      cornerRadius={4}
      style={{ stroke: 'dodgerblue', fill: 'dodgerblue', fillOpacity: 0.08 }}
      layout={{ minimumSize: { width: 164, height: 58 }, align: 'middle', lineHeight: 17 }}
    >
      <Text font={{ size: 14, weight: 'bold' }}>Downstream use</Text>
      <Text fill="gray" font={{ size: 12 }}>
        transforms · consumer modules
      </Text>
    </Node>
    <Node
      id="contract"
      position={[-25, -70]}
      cornerRadius={4}
      style={{ stroke: 'darkorange', fill: 'darkorange', fillOpacity: 0.08 }}
      layout={{ minimumSize: { width: 150, height: 50 }, align: 'middle', lineHeight: 16 }}
    >
      <Text font={{ size: 14, weight: 'bold' }}>Field contract</Text>
      <Text fill="gray" font={{ size: 12 }}>
        type · format · order
      </Text>
    </Node>

    <Draw
      way={[
        'rows',
        {
          label: {
            text: 'parse',
            position: 'midway',
            side: 'top',
            sloped: false,
            textColor: 'gray',
            font: { size: 12 },
          },
        },
        'canonical',
      ]}
      arrow="->"
      style={{ stroke: 'gray' }}
    />
    <Draw
      way={[
        'canonical',
        {
          label: {
            text: 'consume',
            position: 'midway',
            side: 'top',
            sloped: false,
            textColor: 'gray',
            font: { size: 12 },
          },
        },
        'consumers',
      ]}
      arrow="->"
      style={{ stroke: 'gray' }}
    />
    <Draw
      way={[
        'contract',
        {
          label: {
            text: 'constrain',
            position: 'midway',
            side: 'right',
            sloped: false,
            textColor: 'gray',
            font: { size: 12 },
          },
        },
        'canonical',
      ]}
      arrow="->"
      style={{ stroke: 'darkorange', dashPattern: [4, 3] }}
    />
  </Layout>
);

export default Demo;
