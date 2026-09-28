import { Layout } from '@retikz/react';
import { Circle } from '@retikz/standard-react/shape';
import type { FC } from 'react';

/** 展示四种接入方式共用的最小图形 */
const Demo: FC = () => (
  <Layout>
    <Circle center={[0, 0]} radius={32} />
  </Layout>
);
export default Demo;
