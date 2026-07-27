import type { FC } from 'react';

import { Draw, Layout, Node, Text } from '@retikz/react';

/**
 * 变换落地页 "变换在图形语法中的位置" 插图
 * @description 根级 transform 先生成共享行；图元局部 transform 再从共享行派生当前图元独有的数据视图
 */
const Demo: FC = () => (
  <Layout width={460} height={240} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node id="data" position={[-160, -70]} stroke="none" align="middle" lineHeight={18}>
      <Text font={{ size: 14, weight: 'bold' }}>数据层</Text>
      <Text fill="gray" font={{ size: 12 }}>
        canonical 行
      </Text>
    </Node>
    <Node id="root" position={[0, -70]} stroke="none" align="middle" lineHeight={18}>
      <Text font={{ size: 14, weight: 'bold' }}>根级 transform</Text>
      <Text fill="gray" font={{ size: 12 }}>
        声明顺序 · 行数可变
      </Text>
    </Node>
    <Node id="shared" position={[160, -70]} stroke="none" align="middle" lineHeight={18}>
      <Text font={{ size: 14, weight: 'bold' }}>共享行</Text>
      <Text fill="gray" font={{ size: 12 }}>
        所有图元读取
      </Text>
    </Node>
    <Node id="local" position={[-10, 40]} stroke="none" align="middle" lineHeight={18}>
      <Text font={{ size: 14, weight: 'bold' }}>图元 A 局部 transform</Text>
      <Text fill="gray" font={{ size: 12 }}>
        私有派生
      </Text>
    </Node>
    <Node id="mark-a" position={[160, 40]} stroke="none" align="middle" lineHeight={18}>
      <Text font={{ size: 14, weight: 'bold' }}>图元 A 数据视图</Text>
      <Text fill="gray" font={{ size: 12 }}>
        局部结果
      </Text>
    </Node>
    <Node id="mark-b" position={[160, 100]} stroke="none" align="middle" lineHeight={18}>
      <Text font={{ size: 14, weight: 'bold' }}>图元 B 数据视图</Text>
      <Text fill="gray" font={{ size: 12 }}>
        仍用共享行
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
