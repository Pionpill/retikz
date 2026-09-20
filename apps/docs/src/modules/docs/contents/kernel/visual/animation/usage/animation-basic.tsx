import { Layout, Node } from '@retikz/react';
import type { FC } from 'react';

const Demo: FC = () => (
  <Layout>
    <Node
      position={[0, 0]}
      layout={{ minimumSize: 80 }}
      animations={[
        {
          property: 'opacity',
          keyframes: [
            { at: 0, value: 0 },
            { at: 1, value: 1 },
          ],
          duration: 800,
        },
      ]}
    />
  </Layout>
);
export default Demo;
