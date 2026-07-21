import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';
import { Fragment } from 'react';

const placementRows = [
  {
    id: 'authoring',
    y: -104,
    signal: 'Authoring convenience only',
    owner: 'Sugar / adapter',
    anchor: 'react/adapter · vanilla/spec',
  },
  {
    id: 'kernel',
    y: -52,
    signal: 'Shared drawing semantics',
    owner: 'Core IR / Scene',
    anchor: 'core/schemas · contract',
  },
  {
    id: 'tier2',
    y: 0,
    signal: 'High-level domain model',
    owner: 'Composite + lowering',
    anchor: 'core/contract · compile',
  },
  {
    id: 'provider',
    y: 52,
    signal: 'Pluggable compile policy',
    owner: 'Definition + registry',
    anchor: 'core/contract · providers',
  },
  {
    id: 'runtime',
    y: 104,
    signal: 'Backend runtime behavior',
    owner: 'Renderer / runtime',
    anchor: 'render · runtime',
  },
] as const;

/** Capability placement decision figure for the technical principles page */
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
