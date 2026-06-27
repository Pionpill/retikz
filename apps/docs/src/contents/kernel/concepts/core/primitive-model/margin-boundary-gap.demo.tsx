import { Circle, Draw, Layout, Node, Rectangle } from '@retikz/react';
import type { FC } from 'react';

// 每列三层嵌套：文本区（内容盒，lightgray）→ shape（内框，currentColor 实线）→ 连接面（虚线）。
// 连接面随 margin 离 shape 越来越远；第三列把 boundary 换成 circle：margin 同样推开它，形状由 boundary 决定。
const HW = 35; // 内框（shape）半宽
const HH = 22; // 内框（shape）半高
const CW = 22; // 内容盒半宽
const CH = 11; // 内容盒半高
const DOT = { radius: 2.5, fill: 'gray', stroke: 'none' } as const;
const SHAPE = { fill: 'none', stroke: 'currentColor' } as const;
const CONTENT = { fill: 'lightgray', stroke: 'none' } as const;

const Demo: FC = () => (
  <Layout width={580} height={210} viewBox={{ x: -235, y: -74, width: 480, height: 174 }} style={{ maxWidth: '100%', height: 'auto' }}>
    {/* ── 列 1：boundary=shape，margin 小 ── */}
    <Rectangle center={[-175, 0]} width={HW * 2 + 16} height={HH * 2 + 16} fill="none" stroke="gray" dashPattern={[4, 3]} />
    <Rectangle center={[-175, 0]} width={HW * 2} height={HH * 2} {...SHAPE} />
    <Rectangle center={[-175, 0]} width={CW * 2} height={CH * 2} {...CONTENT} />
    <Circle center={[-175, -30]} {...DOT} />
    <Circle center={[-132, 0]} {...DOT} />
    <Circle center={[-175, 30]} {...DOT} />
    <Circle center={[-218, 0]} {...DOT} />
    <Draw way={[[-140, 0], [-132, 0]]} arrow="<->" stroke="gray" />
    <Node id="cap-1" position={[-175, 76]} stroke="none" textColor="gray" font={{ size: 12 }}>
      shape · m=8
    </Node>

    {/* ── 列 2：boundary=shape，margin 大（shape 不变，连接面更远） ── */}
    <Rectangle center={[-5, 0]} width={HW * 2 + 48} height={HH * 2 + 48} fill="none" stroke="gray" dashPattern={[4, 3]} />
    <Rectangle center={[-5, 0]} width={HW * 2} height={HH * 2} {...SHAPE} />
    <Rectangle center={[-5, 0]} width={CW * 2} height={CH * 2} {...CONTENT} />
    <Circle center={[-5, -46]} {...DOT} />
    <Circle center={[54, 0]} {...DOT} />
    <Circle center={[-5, 46]} {...DOT} />
    <Circle center={[-64, 0]} {...DOT} />
    <Draw way={[[30, 0], [54, 0]]} arrow="<->" stroke="gray" />
    <Node id="m-lbl" position={[42, 15]} stroke="none" textColor="gray" font={{ size: 12 }}>
      margin
    </Node>
    <Node id="cap-2" position={[-5, 76]} stroke="none" textColor="gray" font={{ size: 12 }}>
      shape · m=24
    </Node>

    {/* ── 列 3：boundary=circle，同样的 margin（连接面换成圆，半径 = 较长半轴 + margin） ── */}
    <Circle center={[165, 0]} radius={HW + 24} fill="none" stroke="dodgerblue" dashPattern={[4, 3]} />
    <Rectangle center={[165, 0]} width={HW * 2} height={HH * 2} {...SHAPE} />
    <Rectangle center={[165, 0]} width={CW * 2} height={CH * 2} {...CONTENT} />
    <Circle center={[165, -59]} {...DOT} />
    <Circle center={[224, 0]} {...DOT} />
    <Circle center={[165, 59]} {...DOT} />
    <Circle center={[106, 0]} {...DOT} />
    <Draw way={[[200, 0], [224, 0]]} arrow="<->" stroke="gray" />
    <Node id="cap-3" position={[165, 76]} stroke="none" textColor="dodgerblue" font={{ size: 12 }}>
      circle · m=24
    </Node>
  </Layout>
);

export default Demo;
