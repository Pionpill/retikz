import { Layout } from '@retikz/react';
import { Axes } from '@retikz/standard-react/presentation';
import type { FC } from 'react';

/** 四种接入方式共用的最小示例 */
const Demo: FC = () => (
  <Layout>
    <Axes x={{ extent: 80 }} y={{ extent: 50 }} />
  </Layout>
);
export default Demo;
