import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';

/** Grid IR 下沉为 Core Path 的中文逻辑图 */
const Demo: FC = () => (
  <Layout>
    <Node
      id="grid-ir"
      position={[-310, 0]}
      text={[
        { text: 'Grid IR', font: { size: 14, weight: 'bold' } },
        { text: '范围 · 格线 · 定位', fill: 'gray', font: { size: 12 } },
      ]}
      cornerRadius={4}
      style={{ stroke: 'darkorange', fill: 'darkorange', fillOpacity: 0.08 }}
      layout={{ padding: 8 }}
    />
    <Node
      id="normalize"
      position={[-160, 0]}
      text={[
        { text: '规范化输入', font: { size: 14, weight: 'bold' } },
        { text: '角点排序 · 局部中心', fill: 'gray', font: { size: 12 } },
      ]}
      cornerRadius={4}
      style={{ stroke: 'gray', fill: 'gray', fillOpacity: 0.08 }}
      layout={{ padding: 8 }}
    />
    <Node
      id="lattice"
      position={[0, 0]}
      text={[
        { text: '枚举格点', font: { size: 14, weight: 'bold' } },
        { text: 'x / y 值与相对索引', fill: 'gray', font: { size: 12 } },
      ]}
      cornerRadius={4}
      style={{ stroke: 'gray', fill: 'gray', fillOpacity: 0.08 }}
      layout={{ padding: 8 }}
    />
    <Node
      id="assemble"
      position={[165, 0]}
      text={[
        { text: '分类与组装', font: { size: 14, weight: 'bold' } },
        { text: '格线 · 主线 · 边框', fill: 'gray', font: { size: 12 } },
      ]}
      cornerRadius={4}
      style={{ stroke: 'gray', fill: 'gray', fillOpacity: 0.08 }}
      layout={{ padding: 8 }}
    />
    <Node
      id="paths"
      position={[315, 0]}
      text={[
        { text: 'Core Path[] / Scope', font: { size: 14, weight: 'bold' } },
        { text: '中心定位由 Core 解析', fill: 'gray', font: { size: 12 } },
      ]}
      cornerRadius={4}
      style={{ stroke: 'dodgerblue', fill: 'dodgerblue', fillOpacity: 0.08 }}
      layout={{ padding: 8 }}
    />

    <Draw way={['grid-ir', 'normalize']} arrow="->" style={{ stroke: 'gray' }} />
    <Draw way={['normalize', 'lattice']} arrow="->" style={{ stroke: 'gray' }} />
    <Draw way={['lattice', 'assemble']} arrow="->" style={{ stroke: 'gray' }} />
    <Draw way={['assemble', 'paths']} arrow="->" style={{ stroke: 'gray' }} />
  </Layout>
);

export default Demo;
