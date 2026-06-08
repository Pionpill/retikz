import { Layout, Node } from '@retikz/react';
import type { FC } from 'react';

const labelFont = { size: 12 };

const Demo: FC = () => (
  <Layout width={420} height={260} nodeDistance={70}>
    <Node id="center" position={[0, 0]}>
      A
    </Node>
    <Node id="above" position={{ direction: 'above', of: 'center' }} stroke="none" font={labelFont}>
      above
    </Node>
    <Node id="right" position={{ direction: 'right', of: 'center' }} stroke="none" font={labelFont}>
      right
    </Node>
    <Node id="below" position={{ direction: 'below', of: 'center' }} stroke="none" font={labelFont}>
      below
    </Node>
    <Node id="left" position={{ direction: 'left', of: 'center' }} stroke="none" font={labelFont}>
      left
    </Node>
    <Node id="aboveRight" position={{ direction: 'above-right', of: 'center' }} stroke="none" font={labelFont}>
      above-right
    </Node>
    <Node id="belowRight" position={{ direction: 'below-right', of: 'center' }} stroke="none" font={labelFont}>
      below-right
    </Node>
    <Node id="belowLeft" position={{ direction: 'below-left', of: 'center' }} stroke="none" font={labelFont}>
      below-left
    </Node>
    <Node id="aboveLeft" position={{ direction: 'above-left', of: 'center' }} stroke="none" font={labelFont}>
      above-left
    </Node>
  </Layout>
);

export default Demo;
