import type { FC } from 'react';

import { Draw, Layout, Node, Text } from '@retikz/react';

/** 来源身份从外部数据进入 Data 管线并随结果交付的主流程 */
const Demo: FC = () => (
  <Layout>
    <Node
      id="source"
      position={[-290, 0]}
      cornerRadius={4}
      style={{ stroke: 'darkorange', fill: 'darkorange', fillOpacity: 0.08 }}
      layout={{ minimumSize: { width: 112, height: 58 }, align: 'middle', lineHeight: 16 }}
    >
      <Text font={{ size: 14, weight: 'bold' }}>外部数据行</Text>
      <Text fill="gray" font={{ size: 12 }}>
        原始顺序
      </Text>
    </Node>
    <Node
      id="tag"
      position={[-145, 0]}
      cornerRadius={4}
      style={{ stroke: 'dodgerblue', fill: 'dodgerblue', fillOpacity: 0.08 }}
      layout={{ minimumSize: { width: 112, height: 58 }, align: 'middle', lineHeight: 16 }}
    >
      <Text font={{ size: 14, weight: 'bold' }}>标记来源</Text>
      <Text fill="gray" font={{ size: 12 }}>
        SOURCE_INDEX
      </Text>
    </Node>
    <Node
      id="canonical"
      position={[0, 0]}
      cornerRadius={4}
      style={{ stroke: 'gray', fill: 'gray', fillOpacity: 0.06 }}
      layout={{ minimumSize: { width: 112, height: 58 }, align: 'middle', lineHeight: 16 }}
    >
      <Text font={{ size: 14, weight: 'bold' }}>规范化行</Text>
      <Text fill="gray" font={{ size: 12 }}>
        字段与值对齐
      </Text>
    </Node>
    <Node
      id="transform"
      position={[145, 0]}
      cornerRadius={4}
      style={{ stroke: 'dodgerblue', fill: 'dodgerblue', fillOpacity: 0.08 }}
      layout={{ minimumSize: { width: 112, height: 58 }, align: 'middle', lineHeight: 16 }}
    >
      <Text font={{ size: 14, weight: 'bold' }}>数据变换</Text>
      <Text fill="gray" font={{ size: 12 }}>
        保留或汇集来源
      </Text>
    </Node>
    <Node
      id="consumer"
      position={[290, 0]}
      cornerRadius={4}
      style={{ stroke: 'darkviolet', fill: 'darkviolet', fillOpacity: 0.07 }}
      layout={{ minimumSize: { width: 112, height: 58 }, align: 'middle', lineHeight: 16 }}
    >
      <Text font={{ size: 14, weight: 'bold' }}>消费模块</Text>
      <Text fill="gray" font={{ size: 12 }}>
        数据 + 来源
      </Text>
    </Node>

    <Draw way={['source', 'tag']} arrow="->" style={{ stroke: 'gray' }} />
    <Draw way={['tag', 'canonical']} arrow="->" style={{ stroke: 'gray' }} />
    <Draw way={['canonical', 'transform']} arrow="->" style={{ stroke: 'gray' }} />
    <Draw way={['transform', 'consumer']} arrow="->" style={{ stroke: 'gray' }} />

    <Node
      position={[0, 76]}
      style={{ stroke: 'none', fill: 'none', textColor: 'gray', font: { size: 12 } }}
      layout={{ padding: 0 }}
    >
      来源身份在变换之前建立；后续阶段只传播、汇集或读取，不重新猜测
    </Node>
  </Layout>
);

export default Demo;
