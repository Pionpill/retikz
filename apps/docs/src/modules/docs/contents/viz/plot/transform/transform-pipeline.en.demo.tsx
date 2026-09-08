import type { FC } from 'react';

import { Draw, Layout, Node, Text } from '@retikz/react';

/**
 * 变换落地页 "变换在图形语法中的位置" 插图（英文版）
 * @description 根级 transform 先生成共享行；图元局部 transform 再从共享行派生当前图元独有的数据视图
 */
const Demo: FC = () => (
  <Layout>
    <Node
      id="data"
      position={[-215, 0]}
      cornerRadius={4}
      style={{ stroke: 'darkorange', fill: 'darkorange', fillOpacity: 0.08 }}
      layout={{ minimumSize: { width: 106, height: 58 }, align: 'middle', lineHeight: 17 }}
    >
      <Text font={{ size: 14, weight: 'bold' }}>Data layer</Text>
      <Text fill="gray" font={{ size: 12 }}>
        normalized rows
      </Text>
    </Node>
    <Node
      id="root"
      position={[-80, 0]}
      cornerRadius={4}
      style={{ stroke: 'dodgerblue', fill: 'dodgerblue', fillOpacity: 0.08 }}
      layout={{ minimumSize: { width: 120, height: 58 }, align: 'middle', lineHeight: 17 }}
    >
      <Text font={{ size: 14, weight: 'bold' }}>Root transform</Text>
      <Text fill="gray" font={{ size: 12 }}>
        rewrites shared rows
      </Text>
    </Node>
    <Node
      id="shared"
      position={[60, 0]}
      cornerRadius={4}
      style={{ stroke: 'darkorange', fill: 'darkorange', fillOpacity: 0.08 }}
      layout={{ minimumSize: { width: 106, height: 58 }, align: 'middle', lineHeight: 17 }}
    >
      <Text font={{ size: 14, weight: 'bold' }}>Shared rows</Text>
      <Text fill="gray" font={{ size: 12 }}>
        read by every mark
      </Text>
    </Node>
    <Node
      id="mark-a"
      position={[205, -63]}
      cornerRadius={4}
      style={{ stroke: 'darkorange', fill: 'darkorange', fillOpacity: 0.08 }}
      layout={{ minimumSize: { width: 132, height: 58 }, align: 'middle', lineHeight: 17 }}
    >
      <Text font={{ size: 14, weight: 'bold' }}>Mark A data view</Text>
      <Text fill="gray" font={{ size: 12 }}>
        local result
      </Text>
    </Node>
    <Node
      id="mark-b"
      position={[205, 63]}
      cornerRadius={4}
      style={{ stroke: 'darkorange', fill: 'darkorange', fillOpacity: 0.08 }}
      layout={{ minimumSize: { width: 132, height: 58 }, align: 'middle', lineHeight: 17 }}
    >
      <Text font={{ size: 14, weight: 'bold' }}>Mark B data view</Text>
      <Text fill="gray" font={{ size: 12 }}>
        reads shared rows
      </Text>
    </Node>

    <Draw way={['data', 'root']} arrow="->" style={{ stroke: 'gray' }} />
    <Draw way={['root', 'shared']} arrow="->" style={{ stroke: 'gray' }} />
    <Draw
      way={[
        'shared',
        {
          label: {
            text: 'local transform',
            position: 'midway',
            side: 'top',
            sloped: false,
            textColor: 'gray',
            font: { size: 12 },
          },
        },
        'mark-a',
      ]}
      arrow="->"
      style={{ stroke: 'gray' }}
    />
    <Draw way={['shared', 'mark-b']} arrow="->" style={{ stroke: 'gray' }} />
  </Layout>
);

export default Demo;
