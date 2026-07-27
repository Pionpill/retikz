import type { FC } from 'react';

import { Draw, Layout, Node, Text } from '@retikz/react';

/**
 * 变换落地页 "变换在图形语法中的位置" 插图（英文版）
 * @description 根级 transform 先生成共享行；图元局部 transform 再从共享行派生当前图元独有的数据视图
 */
const Demo: FC = () => (
  <Layout width={460} height={240} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node id="data" position={[-160, -70]} stroke="none" align="middle" lineHeight={18}>
      <Text font={{ size: 14, weight: 'bold' }}>Data layer</Text>
      <Text fill="gray" font={{ size: 12 }}>
        canonical rows
      </Text>
    </Node>
    <Node id="root" position={[0, -70]} stroke="none" align="middle" lineHeight={18}>
      <Text font={{ size: 14, weight: 'bold' }}>Root transform</Text>
      <Text fill="gray" font={{ size: 12 }}>
        ordered · rows may change
      </Text>
    </Node>
    <Node id="shared" position={[160, -70]} stroke="none" align="middle" lineHeight={18}>
      <Text font={{ size: 14, weight: 'bold' }}>Shared rows</Text>
      <Text fill="gray" font={{ size: 12 }}>
        read by every mark
      </Text>
    </Node>
    <Node id="local" position={[-10, 40]} stroke="none" align="middle" lineHeight={18}>
      <Text font={{ size: 14, weight: 'bold' }}>Mark A local transform</Text>
      <Text fill="gray" font={{ size: 12 }}>
        private derivation
      </Text>
    </Node>
    <Node id="mark-a" position={[160, 40]} stroke="none" align="middle" lineHeight={18}>
      <Text font={{ size: 14, weight: 'bold' }}>Mark A data view</Text>
      <Text fill="gray" font={{ size: 12 }}>
        local result
      </Text>
    </Node>
    <Node id="mark-b" position={[160, 100]} stroke="none" align="middle" lineHeight={18}>
      <Text font={{ size: 14, weight: 'bold' }}>Mark B data view</Text>
      <Text fill="gray" font={{ size: 12 }}>
        shared rows unchanged
      </Text>
    </Node>

    <Draw way={['data', 'root']} arrow="->" />
    <Draw way={['root', 'shared']} arrow="->" />
    <Draw way={['shared', 'local']} arrow="->" />
    <Draw way={['local', 'mark-a']} arrow="->" />
    <Draw way={['shared', 'mark-b']} arrow="->" />
  </Layout>
);

export default Demo;
