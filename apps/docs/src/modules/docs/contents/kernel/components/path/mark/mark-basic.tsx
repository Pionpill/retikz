import { Draw, Layout } from '@retikz/react';
import type { FC } from 'react';

/** 四种内置标记 */
const Demo: FC = () => (
  <Layout>
    <Draw
      way={[
        [0, 0],
        [240, 0],
      ]}
      style={{ stroke: 'currentColor', strokeWidth: 2 }}
      marks={[
        { pos: 0.2, shape: 'times', scale: 1.5 },
        { pos: 0.4, shape: 'plus', scale: 1.5 },
        { pos: 0.6, shape: 'check', scale: 1.5, rotate: 0 },
        { pos: 0.8, shape: 'star', scale: 1.5 },
      ]}
    />
  </Layout>
);

export default Demo;
