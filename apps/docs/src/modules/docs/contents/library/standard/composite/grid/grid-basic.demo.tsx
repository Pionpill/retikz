import { Layout } from '@retikz/react';
import { Grid } from '@retikz/standard-react';
import type { FC } from 'react';

const Demo: FC = () => (
  <Layout>
    <Grid
      bounds={{ start: [20, 20], end: [260, 150] }}
      line={{ spacing: 20, style: { stroke: 'lightgray' } }}
      border={{ style: { stroke: 'gray' } }}
    />
  </Layout>
);

export default Demo;
