import { Layout, Node, Path, Scope, Step } from '@retikz/react';
import type { FC } from 'react';

/**
 * 基础平移：scope 包一组节点 + 一条 path，整体右移 180
 * @description 左侧 0 是参照原点，右侧 scope 内 A/B/C 三节点 + path 共享同一 translate；组内坐标都在 y=0 baseline，整组横向出现在原点右侧。
 */
const Demo: FC = () => (
  <Layout width={560} height={120}>
    <Node id="origin" position={[0, 0]} shape="circle" padding={4} stroke="gray">
      0
    </Node>
    <Scope transforms={[{ kind: 'translate', x: 180, y: 0 }]}>
      <Node id="A" position={[0, 0]}>A</Node>
      <Node id="B" position={[80, 0]}>B</Node>
      <Node id="C" position={[160, 0]}>C</Node>
      <Path arrow="->">
        <Step kind="move" to="A" />
        <Step to="B" />
        <Step to="C" />
      </Path>
    </Scope>
  </Layout>
);

export default Demo;
