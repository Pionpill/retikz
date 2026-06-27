import { Layout, Node } from '@retikz/react';
import type { FC } from 'react';

const Demo: FC = () => (
  <Layout width={300} height={300}>
    <Node id="o" position={[0, 0]}>
      O
    </Node>
    <Node id="n0" position={{ origin: 'o', angle: 0, radius: 80 }}>
      0°
    </Node>
    <Node id="n60" position={{ origin: 'o', angle: 60, radius: 80 }}>
      60°
    </Node>
    <Node id="n120" position={{ origin: 'o', angle: 120, radius: 80 }}>
      120°
    </Node>
    <Node id="n180" position={{ origin: 'o', angle: 180, radius: 80 }}>
      180°
    </Node>
    <Node id="n240" position={{ origin: 'o', angle: 240, radius: 80 }}>
      240°
    </Node>
    <Node id="n300" position={{ origin: 'o', angle: 300, radius: 80 }}>
      300°
    </Node>
  </Layout>
);

export default Demo;
