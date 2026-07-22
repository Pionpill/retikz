import type { FC } from 'react';

import { Layout } from '@retikz/react';
import { Grid } from '@retikz/standard-react';

const Demo: FC = () => (
  <Layout width={300} height={190}>
    <Grid
      bounds={{ min: [34, 26], max: [266, 164] }}
      spacing={24}
      origin={[150, 95]}
      lines={{ includeBoundary: true, style: { stroke: 'lightgray' } }}
      major={{ every: 2, style: { stroke: 'gray', dashPattern: [4, 3] } }}
      border={{ padding: 4, order: 'behind', extendLines: true, style: { stroke: 'dimgray' } }}
    />
  </Layout>
);

export default Demo;
