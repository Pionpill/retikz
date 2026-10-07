import { Layout } from '@retikz/react';
import { Stack } from '@retikz/standard-react/collection';
import type { FC } from 'react';

/** 首页展示集合的结构特征 */
const Demo: FC = () => (
  <Layout>
    <Stack items={['A', 'B', 'C']} arrow />
  </Layout>
);
export default Demo;
