import type { FC } from 'react';
import { Draw, Node, TikZ } from '@retikz/react';

const ARROW_COLOR = '#9ca3af';

const Demo: FC = () => (
  <TikZ width={640} height={160} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node id="v01" position={[-250, -45]} stroke="none">v0.1 (current)</Node>
    <Node id="v02" position={[-150, -45]} stroke="none">v0.2</Node>
    <Node id="v03" position={[-50, -45]} stroke="none">v0.3</Node>
    <Node id="v04" position={[50, -45]} stroke="none">v0.4</Node>
    <Node id="v10" position={[150, -45]} stroke="none">v1.0</Node>
    <Node id="future" position={[250, -45]} stroke="none">future</Node>

    <Draw way={['v01', 'v02']} arrow="->" stroke={ARROW_COLOR} />
    <Draw way={['v02', 'v03']} arrow="->" stroke={ARROW_COLOR} />
    <Draw way={['v03', 'v04']} arrow="->" stroke={ARROW_COLOR} />
    <Draw way={['v04', 'v10']} arrow="->" stroke={ARROW_COLOR} />
    <Draw way={['v10', 'future']} arrow="->" stroke={ARROW_COLOR} />

    <Node position={[-250, 10]} stroke="none">primitives</Node>
    <Node position={[-150, 10]} stroke="none">Scope + Shape</Node>
    <Node position={[-50, 10]} stroke="none">positioning</Node>
    <Node position={[50, 10]} stroke="none">libraries</Node>
    <Node position={[150, 10]} stroke="none">+ canvas</Node>
    <Node position={[250, 10]} stroke="none">+ plot</Node>
  </TikZ>
);

export default Demo;
