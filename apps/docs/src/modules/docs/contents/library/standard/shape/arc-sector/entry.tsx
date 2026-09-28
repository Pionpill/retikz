import { Layout } from '@retikz/react';
import { Arc } from '@retikz/standard-react/shape';
import type { FC } from 'react';

/** 展示四种接入方式共用的最小图形 */
const Demo: FC = () => (
  <Layout>
    <Arc center={[0, 0]} radius={40} startAngle={0} endAngle={90} />
  </Layout>
);
export default Demo;
