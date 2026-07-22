import type { FC } from 'react';

import { Layout } from '@retikz/react';
import { Axes } from '@retikz/standard-react';

const Demo: FC = () => (
  <Layout width={280} height={170}>
    <Axes
      bounds={{ x: { min: 30, max: 250 }, y: { min: 30, max: 140 } }}
      origin={[140, 90]}
      grid={{ spacing: 20, style: { stroke: '#e2e8f0', strokeWidth: 1 } }}
      axes={{ style: { stroke: '#334155', strokeWidth: 1.5 } }}
      ticks={{ x: 20, y: 20, size: 6, style: { stroke: '#334155' } }}
    />
  </Layout>
);

export default Demo;
