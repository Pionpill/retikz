import { Layout } from '@retikz/react';
import { Star } from '@retikz/standard-react/shape';
import type { FC } from 'react';

/** 展示四种接入方式共用的最小图形 */
const Demo: FC = () => (
  <Layout>
    <Star center={[0, 0]} outerRadius={36} innerRadius={16} points={5} />
  </Layout>
);
export default Demo;
