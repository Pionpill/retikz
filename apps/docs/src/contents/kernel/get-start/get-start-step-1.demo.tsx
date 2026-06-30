import type { FC } from 'react';

import { Layout, Node } from '@retikz/react';

const GetStartStep1: FC = () => (
  <Layout width={420} height={80}>
    <Node id="a" position={[0, 0]}>
      A
    </Node>
  </Layout>
);

export default GetStartStep1;
