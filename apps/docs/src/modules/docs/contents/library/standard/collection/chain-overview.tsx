import { Layout } from '@retikz/react';
import { Chain } from '@retikz/standard-react/collection';
import type { FC } from 'react';

/** 首页展示集合的结构特征 */
const Demo: FC = () => (
  <Layout>
    <Chain skeleton={{ items: ['A', { branches: [['B'], ['C']] }, 'D'] }} />
  </Layout>
);
export default Demo;
