import { Layout } from '@retikz/react';
import { Rectangle } from '@retikz/standard-react/shape';
import type { FC } from 'react';

/** 展示四种接入方式共用的最小图形 */
const Demo: FC = () => (
  <Layout>
    <Rectangle center={[0, 0]} width={80} height={48} cornerRadius={6} />
  </Layout>
);
export default Demo;
