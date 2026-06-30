import type { FC } from 'react';

import { Layout, Path, Step } from '@retikz/react';

const Demo: FC = () => (
  <Layout width={260} height={140}>
    <Path fill="lightgray" stroke="currentColor">
      <Step kind="rectangle" from={[-80, -40]} to={[80, 40]} cornerRadius={10} />
    </Path>
  </Layout>
);

export default Demo;
