import { Draw, Layout, Node } from '@retikz/react';
import type { FC } from 'react';

const Demo: FC = () => (
  <Layout width={724} height={80} viewBox={{ x: -378, y: -40, width: 724, height: 80 }} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node id="s1" position={[-300, 0]} stroke="none">position + text</Node>
    <Node id="s2" position={[-170, 0]} stroke="none">inner frame</Node>
    <Node id="s3" position={[10, 0]} stroke="none">bounding box</Node>
    <Node id="s4" position={[145, 0]} stroke="none">visual outline</Node>
    <Node id="s5" position={[270, 0]} stroke="none">boundary / anchor</Node>

    <Draw way={['s1', { label: { text: 'measure', side: 'above', textColor: 'gray', font: { size: 12 } } }, 's2']} arrow="->" />
    <Draw way={['s2', { label: { text: 'circumscribe', side: 'above', textColor: 'gray', font: { size: 12 } } }, 's3']} arrow="->" />
    <Draw way={['s3', { label: { text: 'emit', side: 'above', textColor: 'gray', font: { size: 12 } } }, 's4']} arrow="->" />
    <Draw way={['s4', 's5']} arrow="->" />
  </Layout>
);

export default Demo;
