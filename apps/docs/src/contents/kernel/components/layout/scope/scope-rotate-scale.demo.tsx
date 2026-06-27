import { Draw, Layout, Node, Scope } from '@retikz/react';
import type { FC } from 'react';

/**
 * 旋转与缩放：rotate / scale 两个 scope 横向并排展示
 * @description 左侧 scope rotate 15 度，整组三节点 + path 绕 scope 局部原点小幅倾斜；右侧 scope scale 1.3，节点尺寸 + 间距 + 字号同步放大；path 端点 boundary clip 也按 scope 缩放 / 旋转后的视觉边界对齐。
 */
const Demo: FC = () => (
  <Layout width={600} height={200}>
    <Scope transforms={[{ kind: 'translate', x: -170, y: 0 }, { kind: 'rotate', degrees: 15 }]}>
      <Node id="r1" position={[0, 0]}>1</Node>
      <Node id="r2" position={[60, 0]}>2</Node>
      <Node id="r3" position={[120, 0]}>3</Node>
      <Draw way={['r1', 'r2', 'r3']} arrow="->" />
    </Scope>
    <Scope transforms={[{ kind: 'translate', x: 70, y: 0 }, { kind: 'scale', x: 1.3 }]}>
      <Node id="s1" position={[0, 0]}>1</Node>
      <Node id="s2" position={[60, 0]}>2</Node>
      <Node id="s3" position={[120, 0]}>3</Node>
      <Draw way={['s1', 's2', 's3']} arrow="->" />
    </Scope>
  </Layout>
);

export default Demo;
