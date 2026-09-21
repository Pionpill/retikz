import { Draw, Layout } from '@retikz/react';
import type { FC } from 'react';

const ArrowBasic: FC = () => (
  <Layout>
    <Draw
      way={[
        [0, 0],
        [120, 0],
      ]}
      arrow="<->"
    />
  </Layout>
);

export default ArrowBasic;
