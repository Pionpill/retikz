import type { FC } from 'react';

import { Layout } from '@retikz/react';
import { Grid } from '@retikz/standard-react';

const Demo: FC = () => (
  <Layout width={280} height={170}>
    <Grid
      bounds={{ start: [20, 20], end: [260, 150] }}
      line={{ spacing: 20, style: { stroke: 'lightgray' } }}
      border={{ style: { stroke: 'gray' } }}
    />
  </Layout>
);

export default Demo;
