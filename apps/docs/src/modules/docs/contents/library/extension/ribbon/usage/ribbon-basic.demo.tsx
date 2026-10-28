import type { IRRibbonPathOptions } from '@retikz/extension';
import { ribbonPathDefinition } from '@retikz/extension';
import { Layout, Path, Step } from '@retikz/react';
import type { FC } from 'react';

const Demo: FC = () => (
  <Layout extensions={{ paths: [ribbonPathDefinition] }} rootScope={{ defaults: { style: { color: '#172033' } } }}>
    <Path
      kind="ribbon"
      kindOptions={
        {
          width: { kind: 'taper', start: 44, end: 18, interpolation: 'smooth' },
        } satisfies IRRibbonPathOptions
      }
      style={{ fill: '#5dade2', opacity: { fill: 0.84 } }}
    >
      <Step kind="move" to={[-220, 0]} />
      <Step to={[220, 0]} />
    </Path>
  </Layout>
);

export default Demo;
