import { Layout, Node } from '@retikz/react';
import type { FC } from 'react';

/** Compare multiply on the left with screen on the right */
const BlendModes: FC = () => (
  <Layout style={{ maxWidth: '100%', height: 'auto' }}>
    <Node
      position={[-166, -18]}
      shape="circle"
      style={{ fill: '#e11d48', stroke: 'none' }}
      layout={{ minimumSize: 90 }}
    />
    <Node
      position={[-114, -18]}
      shape="circle"
      style={{ fill: '#22c55e', stroke: 'none', blendMode: 'multiply' }}
      layout={{ minimumSize: 90 }}
    />
    <Node
      position={[-140, 28]}
      shape="circle"
      style={{ fill: '#3b82f6', stroke: 'none', blendMode: 'multiply' }}
      layout={{ minimumSize: 90 }}
    />

    <Node
      position={[140, 0]}
      shape="rectangle"
      style={{ fill: '#0f172a', stroke: 'none' }}
      layout={{ minimumSize: { width: 220, height: 160 } }}
    />
    <Node
      position={[114, 0]}
      shape="circle"
      style={{ fill: '#f97316', stroke: 'none', blendMode: 'screen' }}
      layout={{ minimumSize: 100 }}
    />
    <Node
      position={[166, 0]}
      shape="circle"
      style={{ fill: '#06b6d4', stroke: 'none', blendMode: 'screen' }}
      layout={{ minimumSize: 100 }}
    />
  </Layout>
);

export default BlendModes;
