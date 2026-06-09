import { Draw, Layout, Node } from '@retikz/react';
import type { FC } from 'react';

const Demo: FC = () => (
  <Layout width={430} height={260} viewBox={{ x: -130, y: -115, width: 260, height: 230 }} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node id="O" position={[0, 0]} shape="circle" minimumSize={26} fill="darkorange" textColor="white" stroke="none">
      O
    </Node>
    <Node id="n0" position={{ origin: 'O', angle: 0, radius: 90 }} shape="circle" minimumSize={24} stroke="none">
      0°
    </Node>
    <Node id="n90" position={{ origin: 'O', angle: 90, radius: 90 }} shape="circle" minimumSize={24} stroke="none">
      90°
    </Node>
    <Node id="n180" position={{ origin: 'O', angle: 180, radius: 90 }} shape="circle" minimumSize={24} stroke="none">
      180°
    </Node>
    <Node id="n270" position={{ origin: 'O', angle: 270, radius: 90 }} shape="circle" minimumSize={24} stroke="none">
      270°
    </Node>
    <Node id="p" position={{ origin: 'O', angle: 35, radius: 90 }} shape="circle" minimumSize={10} fill="dodgerblue" stroke="none" />
    <Node id="p-label" position={{ of: 'p', offset: [50, -14] }} stroke="none" textColor="gray">
      angle 35° / radius 90
    </Node>

    <Draw way={['O', 'n0']} arrow="->" stroke="gray" dashPattern={[4, 3]} />
    <Draw way={['O', 'n90']} arrow="->" stroke="gray" dashPattern={[4, 3]} />
    <Draw way={['O', 'n180']} arrow="->" stroke="gray" dashPattern={[4, 3]} />
    <Draw way={['O', 'n270']} arrow="->" stroke="gray" dashPattern={[4, 3]} />
    <Draw way={['O', 'p']} arrow="->" stroke="dodgerblue" />
  </Layout>
);

export default Demo;
