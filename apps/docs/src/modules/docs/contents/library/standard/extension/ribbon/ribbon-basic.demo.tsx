import type { FC } from 'react';

import { Layout, Path, Step } from '@retikz/react';
import { RibbonPathKindDefinition } from '@retikz/standard/ribbon';

const Demo: FC = () => (
  <Layout pathKinds={[RibbonPathKindDefinition]} rootScope={{ style: { color: '#172033' } }}>
    <Path
      kind="ribbon"
      kindOptions={{
        start: { width: 44 },
        end: { width: 18 },
        interpolation: 'smooth',
      }}
      style={{ fill: '#5dade2', fillOpacity: 0.84 }}
    >
      <Step kind="move" to={[-220, 0]} />
      <Step to={[220, 0]} />
    </Path>
  </Layout>
);

export default Demo;
