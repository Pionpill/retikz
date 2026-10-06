import { Layout } from '@retikz/react';
import { Stack } from '@retikz/standard-react/collection';
import type { FC } from 'react';

/** 最后一项显示在栈顶 */
const Demo: FC = () => (
  <Layout>
    <Stack items={['A', 'B', 'C']} />
  </Layout>
);
export default Demo;
