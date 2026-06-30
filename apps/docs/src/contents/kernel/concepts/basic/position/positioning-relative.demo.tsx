import type { FC } from 'react';

import { Layout, Node } from '@retikz/react';

const labelFont = { size: 12 };

const Demo: FC = () => (
  <Layout width={420} height={260} nodeDistance={70}>
    <Node id="center" position={[0, 0]}>
      A
    </Node>
    <Node id="top" position={{ direction: 'top', of: 'center' }} stroke="none" font={labelFont}>
      top
    </Node>
    <Node id="right" position={{ direction: 'right', of: 'center' }} stroke="none" font={labelFont}>
      right
    </Node>
    <Node id="bottom" position={{ direction: 'bottom', of: 'center' }} stroke="none" font={labelFont}>
      bottom
    </Node>
    <Node id="left" position={{ direction: 'left', of: 'center' }} stroke="none" font={labelFont}>
      left
    </Node>
    <Node id="topRight" position={{ direction: 'top-right', of: 'center' }} stroke="none" font={labelFont}>
      top-right
    </Node>
    <Node id="bottomRight" position={{ direction: 'bottom-right', of: 'center' }} stroke="none" font={labelFont}>
      bottom-right
    </Node>
    <Node id="bottomLeft" position={{ direction: 'bottom-left', of: 'center' }} stroke="none" font={labelFont}>
      bottom-left
    </Node>
    <Node id="topLeft" position={{ direction: 'top-left', of: 'center' }} stroke="none" font={labelFont}>
      top-left
    </Node>
  </Layout>
);

export default Demo;
