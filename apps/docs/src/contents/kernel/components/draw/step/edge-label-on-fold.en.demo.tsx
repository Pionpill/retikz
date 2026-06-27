import { Layout, Node, Path, Step } from '@retikz/react';
import type { FC } from 'react';

const Demo: FC = () => (
  <Layout width={420} height={260} nodeDefault={{ stroke: 'gray', dashed: true }}>
    <Node id="a" position={[60, 60]}>
      A
    </Node>
    <Node id="b" position={[360, 205]}>
      B
    </Node>
    <Path stroke="currentColor" arrow="->">
      <Step kind="move" to="a" />
      <Step kind="fold" via="-|" to="b" />
    </Path>
    <Path stroke="transparent">
      <Step kind="move" to="a" />
      <Step
        kind="fold"
        via="-|"
        to="b"
        label={{ text: 'near-start', position: 'near-start', side: 'above' }}
      />
    </Path>
    <Path stroke="transparent">
      <Step kind="move" to="a" />
      <Step
        kind="fold"
        via="-|"
        to="b"
        label={{ text: 'midway', position: 'midway', side: 'above' }}
      />
    </Path>
    <Path stroke="transparent">
      <Step kind="move" to="a" />
      <Step
        kind="fold"
        via="-|"
        to="b"
        label={{ text: 'near-end', position: 'near-end', side: 'left' }}
      />
    </Path>
    <Path stroke="currentColor" arrow="->" dashPattern={[4, 3]}>
      <Step kind="move" to="a" />
      <Step kind="fold" via="|-" to="b" />
    </Path>
    <Path stroke="transparent">
      <Step kind="move" to="a" />
      <Step kind="fold" via="|-" to="b" label={{ text: '0.25', position: 0.25, side: 'left' }} />
    </Path>
    <Path stroke="transparent">
      <Step kind="move" to="a" />
      <Step
        kind="fold"
        via="|-"
        to="b"
        label={{ text: '0.5', position: 0.5, side: 'below' }}
      />
    </Path>
    <Path stroke="transparent">
      <Step kind="move" to="a" />
      <Step kind="fold" via="|-" to="b" label={{ text: '0.75', position: 0.75, side: 'below' }} />
    </Path>
  </Layout>
);

export default Demo;
