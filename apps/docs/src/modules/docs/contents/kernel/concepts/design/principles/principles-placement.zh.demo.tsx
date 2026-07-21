import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';
import { Fragment } from 'react';

const placementRows = [
  {
    id: 'authoring',
    y: -104,
    signal: '只优化书写体验',
    owner: 'Sugar / adapter',
    anchor: 'react/adapter · vanilla/spec',
  },
  {
    id: 'kernel',
    y: -52,
    signal: '新增通用绘图语义',
    owner: 'Core IR / Scene',
    anchor: 'core/schemas · contract',
  },
  {
    id: 'tier2',
    y: 0,
    signal: '保留高层领域模型',
    owner: 'Composite + lowering',
    anchor: 'core/contract · compile',
  },
  {
    id: 'provider',
    y: 52,
    signal: '需要可替换编译策略',
    owner: 'Definition + registry',
    anchor: 'core/contract · providers',
  },
  {
    id: 'runtime',
    y: 104,
    signal: '处理后端运行细节',
    owner: 'Renderer / runtime',
    anchor: 'render · runtime',
  },
] as const;

/** 技术原理页的能力归属决策图 */
const Demo: FC = () => (
  <Layout width={600} height={260} style={{ maxWidth: '100%', height: 'auto' }}>
    {placementRows.map(({ id, y, signal, owner, anchor }) => (
      <Fragment key={id}>
        <Node
          id={`${id}-signal`}
          position={[-160, y]}
          minimumSize={{ width: 220, height: 34 }}
          stroke="dimgray"
          fill="lightgray"
          fillOpacity={0.16}
          cornerRadius={4}
          font={{ size: 13 }}
        >
          {signal}
        </Node>
        <Node
          id={`${id}-owner`}
          position={[155, y]}
          minimumSize={{ width: 260, height: 38 }}
          stroke="dodgerblue"
          fill="dodgerblue"
          fillOpacity={0.08}
          cornerRadius={4}
          font={{ size: 13 }}
          text={[
            { text: owner, font: { size: 14, weight: 'bold' } },
            { text: anchor, fill: 'gray', font: { size: 12 } },
          ]}
        />
        <Draw way={[`${id}-signal`, `${id}-owner`]} arrow="->" />
      </Fragment>
    ))}
  </Layout>
);

export default Demo;
