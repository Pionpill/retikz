import { Layout, Node, Path, Scope, Step } from '@retikz/react';
import type { FC } from 'react';

/**
 * 嵌套 localNamespace shadowing：每层都注册同名 id="A"，path 从最内层引用 'A' 命中最内层
 * @description 横向 baseline 三个 A：左侧根 frame 的 outer A、中间 `<Scope localNamespace>` 内 middle A、最右内层 `<Scope localNamespace>` 内 inner A。
 *   最内层 path 从 inner A 出发引用 'A'——inside-out lookup 命中本 frame 的 inner A，不串到中层 / 外层；
 *   中层 path 同理命中中层 middle A。三层栈式 frame 各自的 'A' 互不冲突、不发 DUPLICATE_NODE_ID warn。
 */
const Demo: FC = () => (
  <Layout width={600} height={160}>
    <Node id="A" position={[0, 0]} shape="circle" padding={6}>outer A</Node>
    <Scope localNamespace transforms={[{ kind: 'translate', x: 220, y: 0 }]}>
      <Node id="A" position={[0, 0]} shape="circle" padding={6}>middle A</Node>
      <Path arrow="->">
        <Step kind="move" to={[0, -60]} />
        <Step to="A" />
      </Path>
      <Scope localNamespace transforms={[{ kind: 'translate', x: 200, y: 0 }]}>
        <Node id="A" position={[0, 0]} shape="circle" padding={6}>inner A</Node>
        <Path arrow="->">
          <Step kind="move" to={[0, 60]} />
          <Step to="A" />
        </Path>
      </Scope>
    </Scope>
  </Layout>
);

export default Demo;
