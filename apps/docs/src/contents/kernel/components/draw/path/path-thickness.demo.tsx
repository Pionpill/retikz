import { Layout, Path, Step } from '@retikz/react';
import type { FC } from 'react';

const PRESETS = [
  'ultraThin',
  'veryThin',
  'thin',
  'semithick',
  'thick',
  'veryThick',
  'ultraThick',
] as const;

const Demo: FC = () => (
  <Layout width={420} height={240}>
    {PRESETS.map((thickness, i) => (
      <Path key={thickness} stroke="currentColor" thickness={thickness}>
        <Step kind="move" to={[0, i * 28]} />
        <Step kind="line" to={[200, i * 28]} />
      </Path>
    ))}
  </Layout>
);

export default Demo;
