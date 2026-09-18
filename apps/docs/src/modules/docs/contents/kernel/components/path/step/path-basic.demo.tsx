import { Layout, Path, Step } from '@retikz/react';
import type { FC } from 'react';

const PathBasic: FC = () => (
  <Layout>
    <Path>
      <Step kind="move" to={[0, 0]} />
      <Step kind="line" to={[120, 0]} />
    </Path>
  </Layout>
);

export default PathBasic;
