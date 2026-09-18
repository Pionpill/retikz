import { Draw, Layout } from '@retikz/react';
import type { FC } from 'react';

const DrawLabelBasic: FC = () => (
  <Layout>
    <Draw way={[[0, 0], { label: 'status' }, [120, 0]]} />
  </Layout>
);

export default DrawLabelBasic;
