import { Draw, Layout, Node, Scope } from '@retikz/react';
import type { FC } from 'react';

/**
 * 布局家族示意图
 * @description 同一组 A→B→C：左侧直接画在 <Layout> 顶层坐标，右侧包进 <Scope>（translate + rotate）
 *   被当作整体平移并旋转。对照点出 Scope「把一组 children 当作单元变换」；灰色备注置于下方，
 *   纯技术 label、单文件双语共用。
 */
const Demo: FC = () => (
  <Layout width={620} height={260}>
    {/* 左：直接画在 Layout 顶层坐标 */}
    <Node id="a0" position={[-260, 0]}>
      A
    </Node>
    <Node id="b0" position={[-200, 0]}>
      B
    </Node>
    <Node id="c0" position={[-140, 0]}>
      C
    </Node>
    <Draw way={['a0', 'b0', 'c0']} arrow="->" />
    <Node id="capPlain" position={[-200, 50]} stroke="none" fill="none" textColor="gray" font={{ size: 12 }}>
      Layout
    </Node>

    {/* 右：同一组包进 Scope，整组 translate + rotate */}
    <Scope transforms={[{ kind: 'translate', x: 90, y: 0 }, { kind: 'rotate', degrees: -15 }]}>
      <Node id="a1" position={[0, 0]}>
        A
      </Node>
      <Node id="b1" position={[60, 0]}>
        B
      </Node>
      <Node id="c1" position={[120, 0]}>
        C
      </Node>
      <Draw way={['a1', 'b1', 'c1']} arrow="->" />
    </Scope>
    <Node id="capScope" position={[150, 90]} stroke="none" fill="none" textColor="gray" font={{ size: 12 }}>
      Scope: translate + rotate
    </Node>
  </Layout>
);

export default Demo;
