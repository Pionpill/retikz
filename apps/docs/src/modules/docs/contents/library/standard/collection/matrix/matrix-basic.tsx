import { Layout } from '@retikz/react';
import { Matrix } from '@retikz/standard-react/collection';
import type { FC } from 'react';

const Demo: FC = () => (
  <Layout>
    <Matrix
      items={[
        ['a₁₁', 'a₁₂'],
        ['a₂₁', 'a₂₂'],
      ]}
    />
  </Layout>
);
export default Demo;
