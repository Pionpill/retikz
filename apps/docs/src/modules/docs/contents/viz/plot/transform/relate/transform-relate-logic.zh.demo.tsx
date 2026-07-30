import type { FC } from 'react';

import { Draw, Layout, Node, Text } from '@retikz/react';

/** relate 的分组、双端点选择、字段投影与关系行输出 */
const Demo: FC = () => (
  <Layout width={780} height={190} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node
      id="rows"
      position={[-330, 0]}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>输入明细行</Text>
      <Text fill="gray" font={{ size: 12 }}>
        N rows
      </Text>
    </Node>
    <Node
      id="group"
      position={[-195, 0]}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>按 groupBy 分组</Text>
      <Text fill="gray" font={{ size: 12 }}>
        缺省时全行一组
      </Text>
    </Node>
    <Node
      id="source"
      position={[-25, -42]}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>选择 source</Text>
      <Text fill="gray" font={{ size: 12 }}>
        source.selector 的首行
      </Text>
    </Node>
    <Node
      id="target"
      position={[-25, 42]}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>选择 target</Text>
      <Text fill="gray" font={{ size: 12 }}>
        target.selector 的首行
      </Text>
    </Node>
    <Node
      id="config"
      position={[155, 78]}
      stroke="gray"
      fill="gray"
      fillOpacity={0.06}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>投影与度量配置</Text>
      <Text fill="gray" font={{ size: 12 }}>
        fields · measures
      </Text>
    </Node>
    <Node
      id="project"
      position={[155, 0]}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>汇合并派生字段</Text>
      <Text fill="gray" font={{ size: 12 }}>
        sourceX · targetX · difference
      </Text>
    </Node>
    <Node
      id="output"
      position={[325, 0]}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>输出关系行</Text>
      <Text fill="gray" font={{ size: 12 }}>
        每组 0 或 1 行
      </Text>
    </Node>

    <Draw way={['rows', 'group']} arrow="->" />
    <Draw way={['group', 'source']} arrow="->" />
    <Draw way={['group', 'target']} arrow="->" />
    <Draw way={['source', 'project']} arrow="->" />
    <Draw way={['target', 'project']} arrow="->" />
    <Draw way={['project', 'output']} arrow="->" />
    <Draw way={['config', 'project']} arrow="->" stroke="gray" dashPattern={[4, 3]} />
  </Layout>
);

export default Demo;
