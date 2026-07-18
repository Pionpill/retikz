import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';
import { Fragment } from 'react';

const placementRows = [
  {
    id: 'authoring',
    y: -100,
    signal: '只优化书写体验',
    owner: 'Sugar / adapter',
    source: 'react/adapter · vanilla/spec',
  },
  {
    id: 'kernel',
    y: -50,
    signal: '新增通用绘图语义',
    owner: 'Core IR / Scene',
    source: 'core/schemas · contract',
  },
  {
    id: 'tier2',
    y: 0,
    signal: '保留高层领域模型',
    owner: 'Composite + lowering',
    source: 'core/contract · compile',
  },
  {
    id: 'provider',
    y: 50,
    signal: '需要可替换编译策略',
    owner: 'Definition + registry',
    source: 'core/contract · providers',
  },
  {
    id: 'runtime',
    y: 100,
    signal: '处理后端运行细节',
    owner: 'Renderer / runtime',
    source: 'render · runtime',
  },
] as const;

/** 技术原理页的能力归属决策图 */
const Demo: FC = () => (
  <Layout width={660} height={280} style={{ maxWidth: '100%', height: 'auto' }}>
    {placementRows.map(({ id, y, signal, owner, source }) => (
      <Fragment key={id}>
        <Node
          id={`${id}-signal`}
          position={[-195, y]}
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
          position={[0, y]}
          stroke="dodgerblue"
          fill="dodgerblue"
          fillOpacity={0.08}
          cornerRadius={4}
          font={{ size: 13, weight: 'bold' }}
        >
          {owner}
        </Node>
        <Node
          id={`${id}-source`}
          position={[195, y]}
          stroke="darkviolet"
          fill="darkviolet"
          fillOpacity={0.08}
          cornerRadius={4}
          font={{ size: 13 }}
        >
          {source}
        </Node>
        <Draw way={[`${id}-signal`, `${id}-owner`]} arrow="->" />
        <Draw way={[`${id}-owner`, `${id}-source`]} arrow="->" />
      </Fragment>
    ))}
  </Layout>
);

export default Demo;
