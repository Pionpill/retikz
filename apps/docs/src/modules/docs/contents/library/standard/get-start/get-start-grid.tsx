import { Layout } from '@retikz/react';
import { Grid } from '@retikz/standard-react/presentation';
import type { FC } from 'react';

const GetStartGrid: FC = () => (
  <Layout>
    <Grid bounds={{ start: [0, 0], end: [240, 120] }} line={{ spacing: 20 }} />
  </Layout>
);

export default GetStartGrid;
