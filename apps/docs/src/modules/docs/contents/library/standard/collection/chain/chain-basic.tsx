import { Layout } from '@retikz/react';
import { Chain } from '@retikz/standard-react/collection';
import type { FC } from 'react';
/** 最小线性链 */
const Demo: FC = () => (
  <Layout>
    <Chain items={['A', 'B', 'C']} />
  </Layout>
);
export default Demo;
