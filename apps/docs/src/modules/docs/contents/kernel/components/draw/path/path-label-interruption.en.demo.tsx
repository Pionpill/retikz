import type { FC } from 'react';

import { Layout, Path, Step } from '@retikz/react';

/** Compare centered defaults with explicit continuous and forced-gap labels */
const Demo: FC = () => (
  <Layout width={480} height={280} viewBox={{ x: -240, y: -140, width: 480, height: 280 }}>
    <Path
      label={{ text: 'center: automatic gap', sloped: true, textColor: 'currentColor', font: { size: 13 } }}
      stroke="currentColor"
    >
      <Step kind="move" to={[-210, -110]} />
      <Step kind="line" to={[210, -110]} />
    </Path>
    <Path stroke="currentColor">
      <Step kind="move" to={[-210, -65]} />
      <Step
        kind="line"
        label={{ text: 'sloped: automatic gap', sloped: true, textColor: 'currentColor', font: { size: 13 } }}
        to={[210, -15]}
      />
    </Path>
    <Path stroke="currentColor">
      <Step kind="move" to={[-210, 25]} />
      <Step
        kind="line"
        label={{
          text: 'center: continuous',
          sloped: true,
          interrupt: false,
          textColor: 'currentColor',
          font: { size: 13 },
        }}
        to={[210, 25]}
      />
    </Path>
    <Path stroke="currentColor">
      <Step kind="move" to={[-210, 75]} />
      <Step
        kind="line"
        label={{ text: 'top: continuous by default', side: 'top', textColor: 'currentColor', font: { size: 13 } }}
        to={[210, 75]}
      />
    </Path>
    <Path stroke="currentColor">
      <Step kind="move" to={[-210, 115]} />
      <Step
        kind="line"
        label={{ text: 'top: forced gap', side: 'top', interrupt: true, textColor: 'currentColor', font: { size: 13 } }}
        to={[210, 115]}
      />
    </Path>
  </Layout>
);

export default Demo;
