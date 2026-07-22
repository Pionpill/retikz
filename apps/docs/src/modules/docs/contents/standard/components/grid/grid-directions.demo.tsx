import type { FC } from 'react';

import { Layout } from '@retikz/react';
import { Grid } from '@retikz/standard-react';

const Demo: FC = () => (
  <Layout width={300} height={190}>
    <Grid
      bounds={{ min: [35, 25], max: [265, 80] }}
      spacing={{ x: 18, y: 24 }}
      lines={{ horizontal: false, style: { stroke: 'lightgray' } }}
      major={{ every: 2, style: { stroke: 'gray' } }}
    />
    <Grid
      bounds={{ min: [35, 115], max: [265, 160] }}
      spacing={18}
      lines={{ vertical: false, style: { stroke: 'lightgray' } }}
      major={{ every: 2, style: { stroke: 'gray' } }}
    />
  </Layout>
);

export default Demo;
