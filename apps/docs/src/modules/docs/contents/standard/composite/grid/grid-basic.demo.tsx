import type { FC } from 'react';

import { Layout } from '@retikz/react';
import { Grid } from '@retikz/standard-react';

const Demo: FC = () => (
  <Layout width={280} height={170}>
    <Grid
      bounds={{ min: [20, 20], max: [260, 150] }}
      spacing={20}
      lines={{ style: { stroke: 'lightgray' } }}
      border={{ style: { stroke: 'gray' } }}
    />
  </Layout>
);

export default Demo;
