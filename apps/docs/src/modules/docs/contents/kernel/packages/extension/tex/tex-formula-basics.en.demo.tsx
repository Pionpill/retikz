import type { LowerTex } from '@retikz/core';
import type { FC } from 'react';

import { Layout, Node } from '@retikz/react';
import { useLowerTex } from '@retikz/tex/react';

import type { PreviewSourceConfig } from '@/modules/docs/components/component-preview';

export const previewSource = {
  deriveIR: false,
} satisfies PreviewSourceConfig;

/** Shows basic string formulas, an explicit math run, and a display formula */
const Demo: FC = () => {
  const lowerTexState = useLowerTex({ profile: 'math' });

  if (lowerTexState.status !== 'ready') {
    return <Layout />;
  }

  const lowerTex: LowerTex = lowerTexState.lowerTex;

  return (
    <Layout lowerTex={lowerTex}>
      <Node position={[0, -78]} style={{ stroke: 'none', font: { size: 18 } }} layout={{ padding: 0 }}>
        {'Inline formula: when $v = d/t$, displacement is $s = vt$'}
      </Node>
      <Node
        position={[0, 0]}
        text={[{ runs: [{ text: 'Explicit math run: ' }, { tex: '\\sin\\alpha = \\frac{1}{2}', fill: 'crimson' }] }]}
        style={{ stroke: 'none', font: { size: 18 } }}
        layout={{ padding: 0 }}
      />
      <Node position={[0, 78]} style={{ stroke: 'none', font: { size: 18 } }} layout={{ padding: 0 }}>
        {'Display formula: $$\\sum_{i=1}^{n} i^2$$'}
      </Node>
    </Layout>
  );
};

export default Demo;
