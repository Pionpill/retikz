import type { FC } from 'react';

import { Draw, Layout, Node, Text } from '@retikz/react';

/**
 * Complete string-channel path from build-time selection to runtime resolution
 * @description A string flat style prop first matches a field name, then tries a valid constant after a miss; the fixed binding type reads either a canonical row or its constant value before reaching the channel consumer
 */
const Demo: FC = () => (
  <Layout width={620} height={320} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node
      id="input"
      position={[-225, -80]}
      minimumSize={{ width: 100, height: 60 }}
      stroke="gray"
      fill="gray"
      fillOpacity={0.06}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>String prop</Text>
      <Text fill="gray" font={{ size: 12 }}>
        {'color="value"'}
      </Text>
    </Node>

    <Node
      id="field-candidate"
      position={[-90, -80]}
      minimumSize={{ width: 110, height: 60 }}
      stroke="gray"
      fill="gray"
      fillOpacity={0.06}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>① Field?</Text>
      <Text fill="gray" font={{ size: 12 }}>
        Match data model
      </Text>
    </Node>

    <Node
      id="field-path"
      position={[58, -80]}
      minimumSize={{ width: 125, height: 60 }}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>Field → row</Text>
      <Text fill="gray" font={{ size: 12 }}>
        {"{ field: 'value' } → row"}
      </Text>
    </Node>

    <Node
      id="constant-candidate"
      position={[-90, 30]}
      minimumSize={{ width: 110, height: 60 }}
      stroke="gray"
      fill="gray"
      fillOpacity={0.06}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>② Constant?</Text>
      <Text fill="gray" font={{ size: 12 }}>
        Validate prop
      </Text>
    </Node>

    <Node
      id="constant-path"
      position={[58, 30]}
      minimumSize={{ width: 125, height: 60 }}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>Constant → value</Text>
      <Text fill="gray" font={{ size: 12 }}>
        {"{ value: 'value' } → own"}
      </Text>
    </Node>

    <Node
      id="warning"
      position={[-90, 140]}
      minimumSize={{ width: 110, height: 60 }}
      stroke="red"
      fill="red"
      fillOpacity={0.05}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>③ Warn and skip</Text>
      <Text fill="gray" font={{ size: 12 }}>
        No channel binding
      </Text>
    </Node>

    <Node
      id="channel-consumer"
      position={[213, -25]}
      minimumSize={{ width: 125, height: 60 }}
      stroke="gray"
      fill="gray"
      fillOpacity={0.06}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>Channel use</Text>
      <Text fill="gray" font={{ size: 12 }}>
        Position / style / text
      </Text>
    </Node>

    <Draw way={['input', 'field-candidate']} arrow="->" stroke="gray" />
    <Draw way={['field-candidate', 'field-path']} arrow="->" stroke="gray" />
    <Draw
      way={[
        'field-candidate',
        {
          label: {
            text: 'continue on miss',
            position: 'midway',
            side: 'right',
            sloped: false,
            textColor: 'gray',
            font: { size: 12 },
          },
        },
        'constant-candidate',
      ]}
      arrow="->"
      stroke="gray"
    />
    <Draw way={['constant-candidate', 'constant-path']} arrow="->" stroke="gray" />
    <Draw
      way={[
        'constant-candidate',
        {
          label: {
            text: 'invalid',
            position: 'midway',
            side: 'right',
            sloped: false,
            textColor: 'gray',
            font: { size: 12 },
          },
        },
        'warning',
      ]}
      arrow="->"
      stroke="gray"
    />
    <Draw way={['field-path', 'channel-consumer']} arrow="->" stroke="gray" />
    <Draw way={['constant-path', 'channel-consumer']} arrow="->" stroke="gray" />
  </Layout>
);

export default Demo;
