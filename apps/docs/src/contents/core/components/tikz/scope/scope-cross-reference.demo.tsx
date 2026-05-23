import { Layout, Node, Path, Scope, Step } from '@retikz/react';
import type { FC } from 'react';

/**
 * 跨 scope 引用：scope 内 node id 可被 scope 外 path 引用
 * @description external 在最左，scope 内 inner / inner-2 横向排在右侧；外层 path 用字符串 id 引用 inner / inner-2，端点取 nodeIndex 全局坐标（已 apply scope translate）——scope 不引入局部命名空间。
 */
const Demo: FC = () => (
  <Layout width={560} height={120}>
    <Node id="external" position={[0, 0]}>external</Node>
    <Scope transforms={[{ kind: 'translate', x: 220, y: 0 }]}>
      <Node id="inner" position={[0, 0]}>inner</Node>
      <Node id="inner-2" position={[100, 0]}>inner-2</Node>
    </Scope>
    <Path arrow="->">
      <Step kind="move" to="external" />
      <Step to="inner" />
    </Path>
    <Path arrow="->">
      <Step kind="move" to="inner" />
      <Step to="inner-2" />
    </Path>
  </Layout>
);

export default Demo;
