import type { FC } from 'react';

import { Draw, Layout, Node, Text } from '@retikz/react';

const stage = {
  minimumSize: { width: 132, height: 54 },
  cornerRadius: 4,
  align: 'middle' as const,
  lineHeight: 16,
};

/** 从 JSON IR 到 Core IR 与类型化产物的 Standard Legend 职责链 */
const Demo: FC = () => (
  <Layout width={790} height={185} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node id="ir" position={[-300, 0]} {...stage} stroke="darkorange" fill="darkorange" fillOpacity={0.08}>
      <Text font={{ size: 14, weight: 'bold' }}>Standard JSON IR</Text>
      <Text fill="gray" font={{ size: 12 }}>
        items / ramp
      </Text>
    </Node>
    <Node id="definition" position={[-150, 0]} {...stage} stroke="dodgerblue" fill="dodgerblue" fillOpacity={0.08}>
      <Text font={{ size: 14, weight: 'bold' }}>LegendDefinition</Text>
      <Text fill="gray" font={{ size: 12 }}>
        validate + structural probes
      </Text>
    </Node>
    <Node id="resolve" position={[0, 0]} {...stage} stroke="dodgerblue" fill="dodgerblue" fillOpacity={0.08}>
      <Text font={{ size: 14, weight: 'bold' }}>Resolve slot</Text>
      <Text fill="gray" font={{ size: 12 }}>
        title range / body exact
      </Text>
    </Node>
    <Node id="replay" position={[150, 0]} {...stage} stroke="dodgerblue" fill="dodgerblue" fillOpacity={0.08}>
      <Text font={{ size: 14, weight: 'bold' }}>replay</Text>
      <Text fill="gray" font={{ size: 12 }}>
        selected child results
      </Text>
    </Node>
    <Node id="core-ir" position={[310, -36]} {...stage} stroke="darkviolet" fill="darkviolet" fillOpacity={0.08}>
      <Text font={{ size: 14, weight: 'bold' }}>Core IR[]</Text>
      <Text fill="gray" font={{ size: 12 }}>
        ordinary children
      </Text>
    </Node>
    <Node id="artifact" position={[310, 36]} {...stage} stroke="darkviolet" fill="darkviolet" fillOpacity={0.08}>
      <Text font={{ size: 14, weight: 'bold' }}>LegendArtifact</Text>
      <Text fill="gray" font={{ size: 12 }}>
        parallel compile output
      </Text>
    </Node>
    <Draw way={['ir', 'definition']} arrow="->" />
    <Draw way={['definition', 'resolve']} arrow="->" />
    <Draw way={['resolve', 'replay']} arrow="->" />
    <Draw way={['replay', 'core-ir']} arrow="->" />
    <Draw way={['replay', 'artifact']} arrow="->" />
  </Layout>
);

export default Demo;
