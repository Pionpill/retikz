import { Draw, Layout, Node } from '@retikz/react';
import type { FC } from 'react';

const Demo: FC = () => (
  <Layout width={430} height={260} viewBox={{ x: -130, y: -115, width: 290, height: 230 }} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node id="O" position={[0, 0]} stroke="none" textColor="gray">
      O
    </Node>
    <Node id="n0" position={{ origin: 'O', angle: 0, radius: 90 }} stroke="none" textColor="gray">
      0°
    </Node>
    <Node id="n90" position={{ origin: 'O', angle: 90, radius: 90 }} stroke="none" textColor="gray">
      90°
    </Node>
    <Node id="n180" position={{ origin: 'O', angle: 180, radius: 90 }} stroke="none" textColor="gray">
      180°
    </Node>
    <Node id="n270" position={{ origin: 'O', angle: 270, radius: 90 }} stroke="none" textColor="gray">
      270°
    </Node>
    <Node id="p" position={{ origin: 'O', angle: 35, radius: 90 }} shape="circle" minimumSize={6} padding={0} fill="currentColor" stroke="none" />
    <Node id="p-label" position={{ of: 'p', offset: [0, 18] }} stroke="none" textColor="gray" font={{ size: 12 }}>
      angle 35° / radius 90
    </Node>

    <Draw way={['O', 'n0']} arrow="->" stroke="lightgray" dashPattern={[4, 3]} />
    <Draw way={['O', 'n90']} arrow="->" stroke="lightgray" dashPattern={[4, 3]} />
    <Draw way={['O', 'n180']} arrow="->" stroke="lightgray" dashPattern={[4, 3]} />
    <Draw way={['O', 'n270']} arrow="->" stroke="lightgray" dashPattern={[4, 3]} />
    <Draw way={['O', 'p']} arrow="->" stroke="currentColor" />
  </Layout>
);

export default Demo;
