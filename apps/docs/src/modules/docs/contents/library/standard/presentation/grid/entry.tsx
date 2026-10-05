import { Layout } from '@retikz/react';
import { Grid } from '@retikz/standard-react/presentation';
import type { FC } from 'react';

/** 四种接入方式共用的最小示例 */
const Demo: FC = () => (
  <Layout>
    <Grid bounds={{ start: [0, 0], end: [120, 80] }} line={{ spacing: 20 }} />
  </Layout>
);
export default Demo;
