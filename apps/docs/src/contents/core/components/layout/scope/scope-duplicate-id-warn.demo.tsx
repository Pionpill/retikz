import { Draw, Layout, Node } from '@retikz/react';
import type { FC } from 'react';

/**
 * 同 frame 重复 id 触发 DUPLICATE_NODE_ID warn + 后定义覆盖
 * @description 两个 id="dup" 都在根 frame（无 Scope localNamespace 隔离）；compile 阶段第二条 register 触发 onWarn 一次 DUPLICATE_NODE_ID（默认 dev 模式 console.warn）；nodeIndex 末态保留 second-dup 的 layout，path 引用 'dup' 命中右侧节点。
 */
const Demo: FC = () => (
  <Layout width={520} height={140}>
    <Node id="dup" position={[80, 0]}>first dup</Node>
    <Node id="dup" position={[360, 0]}>second dup</Node>
    <Draw way={[[0, 50], 'dup']} arrow="->" />
  </Layout>
);

export default Demo;
