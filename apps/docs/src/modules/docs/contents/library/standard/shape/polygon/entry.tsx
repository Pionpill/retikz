import { Layout } from '@retikz/react';
import { Polygon } from '@retikz/standard-react/shape';
import type { FC } from 'react';

/** 展示四种接入方式共用的最小图形 */
const Demo: FC = () => (
  <Layout>
    <Polygon center={[0, 0]} radius={36} sides={6} />
  </Layout>
);
export default Demo;
