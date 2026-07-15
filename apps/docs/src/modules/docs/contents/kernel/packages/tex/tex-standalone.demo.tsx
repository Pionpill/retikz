import type { FC } from 'react';

import { Layout, Node, Path, Step } from '@retikz/react';
import { useLowerTex } from '@retikz/tex/react';

import type { PreviewSourceConfig } from '@/modules/docs/components/component-preview';

export const previewSource = {
  deriveIR: false,
} satisfies PreviewSourceConfig;

const Demo: FC = () => {
  const lowerTex = useLowerTex();
  return (
    <Layout width={460} height={200} lowerTex={lowerTex}>
      {/* A display-only node is sized from the formula glyph bbox. */}
      <Node id="sum" position={[0, 50]}>
        {'$$\\sum_{i=1}^{n} i^2 = \\frac{n(n+1)(2n+1)}{6}$$'}
      </Node>
      {/* `$...$` uses inline formula metrics. */}
      <Node id="emc" position={[0, -50]} shadow="sm">
        {'$E = mc^2$'}
      </Node>
      <Path stroke="#94a3b8">
        <Step kind="move" to="sum" />
        <Step kind="line" to="emc" />
      </Path>
    </Layout>
  );
};

export default Demo;
