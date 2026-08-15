import type { FC } from 'react';

import { Layout, Path, Step } from '@retikz/react';
import { RibbonPathKindDefinition } from '@retikz/standard/ribbon';

const Demo: FC = () => (
  <Layout
    width={560}
    height={240}
    viewBox={{ x: -280, y: -120, width: 560, height: 240 }}
    color="#172033"
    pathKinds={[RibbonPathKindDefinition]}
  >
    <Path
      kind="ribbon"
      kindOptions={{
        start: { width: 44 },
        end: { width: 18 },
        interpolation: 'smooth',
      }}
      fill="#5dade2"
      fillOpacity={0.84}
    >
      <Step kind="move" to={[-220, 0]} />
      <Step to={[220, 0]} />
    </Path>
  </Layout>
);

export default Demo;
