import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';
import { Fragment } from 'react';

const placementRows = [
  {
    id: 'authoring',
    y: -100,
    signal: 'Authoring convenience only',
    owner: 'Sugar / adapter',
    source: 'react/adapter · vanilla/spec',
  },
  {
    id: 'kernel',
    y: -50,
    signal: 'Shared drawing semantics',
    owner: 'Core IR / Scene',
    source: 'core/schemas · contract',
  },
  {
    id: 'tier2',
    y: 0,
    signal: 'High-level domain model',
    owner: 'Composite + lowering',
    source: 'core/contract · compile',
  },
  {
    id: 'provider',
    y: 50,
    signal: 'Pluggable compile policy',
    owner: 'Definition + registry',
    source: 'core/contract · providers',
  },
  {
    id: 'runtime',
    y: 100,
    signal: 'Backend runtime behavior',
    owner: 'Renderer / runtime',
    source: 'render · runtime',
  },
] as const;

/** Capability placement decision figure for the technical principles page */
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
