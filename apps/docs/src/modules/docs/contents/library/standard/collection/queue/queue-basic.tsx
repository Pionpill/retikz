import { Layout } from '@retikz/react';
import { Queue } from '@retikz/standard-react/collection';
import type { FC } from 'react';

/** 输入顺序始终是队首到队尾 */
const Demo: FC = () => (
  <Layout>
    <Queue items={['A', 'B', 'C']} />
  </Layout>
);
export default Demo;
