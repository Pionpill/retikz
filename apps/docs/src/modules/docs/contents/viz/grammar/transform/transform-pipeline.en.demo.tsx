import type { FC } from 'react';

import { Draw, Layout, Node, Text } from '@retikz/react';

/**
 * 变换落地页 "变换在图形语法中的位置" 插图（英文版）
 * @description transform 上接数据层产出的 canonical 行，把多个变换按声明顺序折叠成一条管线，
 *   再把结果交给 scale 推断 / mark lowering / locator；每个变换可保行数也可改行数。
 */
const Demo: FC = () => (
  <Layout width={640} height={180} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node id="data" position={[-205, -16]} stroke="none" align="middle" lineHeight={16}>
      <Text font={{ size: 15, weight: 'bold' }}>Data layer</Text>
      <Text fill="gray" font={{ size: 12 }}>
        canonical rows
      </Text>
    </Node>
    <Node id="pipe" position={[0, -16]} stroke="none" align="middle" lineHeight={16}>
      <Text font={{ size: 15, weight: 'bold' }}>Transform pipeline</Text>
      <Text fill="gray" font={{ size: 12 }}>
        t1 → t2 → …
      </Text>
    </Node>
    <Node id="down" position={[205, -16]} stroke="none" align="middle" lineHeight={16}>
      <Text font={{ size: 15, weight: 'bold' }}>Downstream</Text>
      <Text fill="gray" font={{ size: 12 }}>
        scale · mark · locator
      </Text>
    </Node>

    <Draw way={['data', 'pipe']} arrow="->" />
    <Draw way={['pipe', 'down']} arrow="->" />

    <Node id="note" position={[0, 70]} stroke="none" align="middle">
      <Text fill="gray" font={{ size: 12 }}>
        Folds in declaration order · may keep or change row count
      </Text>
    </Node>
    <Draw way={['note', 'pipe']} arrow="->" stroke="gray" dashPattern={[4, 3]} />
  </Layout>
);

export default Demo;
