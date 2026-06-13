import { Draw, Layout, Node } from '@retikz/react';
import type { FC } from 'react';

const Demo: FC = () => (
  <Layout width={610} height={80} viewBox={{ x: -320, y: -40, width: 610, height: 80 }} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node id="s1" position={[-247, 0]} stroke="none">position + 文本</Node>
    <Node id="s2" position={[-137, 0]} stroke="none">内框</Node>
    <Node id="s3" position={[3, 0]} stroke="none">外接框</Node>
    <Node id="s4" position={[108, 0]} stroke="none">视觉轮廓</Node>
    <Node id="s5" position={[218, 0]} stroke="none">boundary / anchor</Node>

    <Draw way={['s1', { label: { text: '度量', side: 'above', textColor: 'gray', font: { size: 12 } } }, 's2']} arrow="->" />
    <Draw way={['s2', { label: { text: 'circumscribe', side: 'above', textColor: 'gray', font: { size: 12 } } }, 's3']} arrow="->" />
    <Draw way={['s3', { label: { text: 'emit', side: 'above', textColor: 'gray', font: { size: 12 } } }, 's4']} arrow="->" />
    <Draw way={['s4', 's5']} arrow="->" />
  </Layout>
);

export default Demo;
