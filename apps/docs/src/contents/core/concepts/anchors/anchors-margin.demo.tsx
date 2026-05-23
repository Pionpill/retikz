import { Draw, Layout, Node } from '@retikz/react';
import type { FC } from 'react';

const Demo: FC = () => (
  <Layout width={620} height={160}>
    <Node id="plain-a" position={[-270, -10]} padding={10}>
      plain
    </Node>
    <Node id="plain-b" position={[-160, -10]} padding={10}>
      border
    </Node>
    <Draw way={['plain-a', 'plain-b']} stroke="currentColor" strokeWidth={2} />

    <Node id="margin-a" position={[-40, -10]} padding={10} margin={10}>
      margin
    </Node>
    <Node id="margin-b" position={[70, -10]} padding={10} margin={10}>
      gap
    </Node>
    <Draw way={['margin-a', 'margin-b']} stroke="currentColor" strokeWidth={2} />

    <Node id="fixed-a" position={[190, -10]} padding={10} margin={10}>
      margin
    </Node>
    <Node id="fixed-b" position={[300, -10]} padding={10} margin={10}>
      fixed
    </Node>
    <Draw way={['fixed-a.east', 'fixed-b.west']} stroke="currentColor" strokeWidth={2} />

    <Node position={[-215, 42]} stroke="none" padding={0} textColor="#6b7280">
      auto: no margin
    </Node>
    <Node position={[15, 42]} stroke="none" padding={0} textColor="#6b7280">
      auto: margin=10
    </Node>
    <Node position={[245, 42]} stroke="none" padding={0} textColor="#6b7280">
      explicit anchor
    </Node>
  </Layout>
);

export default Demo;
