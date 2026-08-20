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
    return <Layout width={560} height={280} viewBox={{ x: -280, y: -140, width: 560, height: 280 }} />;
  }

  const lowerTex: LowerTex = lowerTexState.lowerTex;

  return (
    <Layout width={560} height={280} viewBox={{ x: -280, y: -140, width: 560, height: 280 }} lowerTex={lowerTex}>
      <Node position={[0, -78]} stroke="none" padding={0} font={{ size: 18 }}>
        {'Inline formula: when $v = d/t$, displacement is $s = vt$'}
      </Node>
      <Node
        position={[0, 0]}
        stroke="none"
        padding={0}
        font={{ size: 18 }}
        text={[{ runs: [{ text: 'Explicit math run: ' }, { tex: '\\sin\\alpha = \\frac{1}{2}', fill: 'crimson' }] }]}
      />
      <Node position={[0, 78]} stroke="none" padding={0} font={{ size: 18 }}>
        {'Display formula: $$\\sum_{i=1}^{n} i^2$$'}
      </Node>
    </Layout>
  );
};

export default Demo;
