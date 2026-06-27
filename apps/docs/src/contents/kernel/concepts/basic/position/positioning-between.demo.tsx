import { Draw, Layout, Node } from '@retikz/react';
import type { FC } from 'react';

const pointStyle = {
  shape: 'circle',
  minimumSize: 10,
  padding: 0,
  fill: 'white',
} as const;

const labelFont = { size: 12 };

const Demo: FC = () => (
  <Layout width={420} height={140}>
    <Node id="a" position={[0, 0]}>
      A
    </Node>
    <Node id="b" position={[240, 0]}>
      B
    </Node>
    <Draw way={['a', 'b']} />
    <Node
      id="quarter"
      position={{ between: [{ id: 'a' }, { id: 'b' }], t: 0.25 }}
      label={{ text: '25%', position: 'above', distance: 16, font: labelFont }}
      {...pointStyle}
    />
    <Node
      id="middle"
      position={{ between: [{ id: 'a' }, { id: 'b' }], t: 0.5 }}
      label={{ text: '50%', position: 'above', distance: 16, font: labelFont }}
      {...pointStyle}
    />
    <Node
      id="threeQuarter"
      position={{ between: [{ id: 'a' }, { id: 'b' }], t: 0.75 }}
      label={{ text: '75%', position: 'above', distance: 16, font: labelFont }}
      {...pointStyle}
    />
  </Layout>
);

export default Demo;
