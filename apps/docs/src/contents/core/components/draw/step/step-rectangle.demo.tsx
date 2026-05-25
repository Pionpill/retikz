import { Layout, Path, Step } from '@retikz/react';
import type { FC } from 'react';

const Demo: FC = () => (
  <Layout width={260} height={140}>
    <Path fill="var(--muted)" stroke="currentColor">
      <Step kind="rectangle" from={[-80, -40]} to={[80, 40]} roundedCorners={10} />
    </Path>
  </Layout>
);

export default Demo;
