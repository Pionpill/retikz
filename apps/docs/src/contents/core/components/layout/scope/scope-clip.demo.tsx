import { Layout, Node, Scope } from '@retikz/react';
import type { FC } from 'react';

/**
 * Scope clip 圆形取景窗
 * @description 一块 220×220 的网格填充矩形被 scope 的 clip 裁到 cx=0/cy=0/r=95 的圆——只露出圆内部分。
 *   clip 坐标用 scope 局部坐标系；裁剪区编译成 renderer-agnostic ClipResource，adapter 物化 `<clipPath>`。
 */
const Demo: FC = () => (
  <Layout width={240} height={240}>
    <Scope clip={{ kind: 'circle', cx: 0, cy: 0, r: 95 }}>
      <Node
        id="grid"
        position={[0, 0]}
        shape="rectangle"
        minimumWidth={220}
        minimumHeight={220}
        stroke="none"
        fill={{ type: 'pattern', shape: 'grid', color: 'darkorange', size: 16 }}
      />
    </Scope>
    <Node id="ring" position={[0, 0]} shape="circle" minimumSize={190} fill="none" stroke="gray" />
  </Layout>
);

export default Demo;
