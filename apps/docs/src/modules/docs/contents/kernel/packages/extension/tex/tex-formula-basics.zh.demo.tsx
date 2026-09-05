import type { LowerTex } from '@retikz/core';
import type { FC } from 'react';

import { Layout, Node } from '@retikz/react';
import { useLowerTex } from '@retikz/tex/react';

import type { PreviewSourceConfig } from '@/modules/docs/components/component-preview';

export const previewSource = {
  deriveIR: false,
} satisfies PreviewSourceConfig;

/** 展示字符串公式、显式 math run 与 display 公式的中文基础写法 */
const Demo: FC = () => {
  const lowerTexState = useLowerTex({ profile: 'math' });

  if (lowerTexState.status !== 'ready') {
    return <Layout />;
  }

  const lowerTex: LowerTex = lowerTexState.lowerTex;

  return (
    <Layout lowerTex={lowerTex}>
      <Node position={[0, -78]} style={{ stroke: 'none', font: { size: 18 } }} layout={{ padding: 0 }}>
        {'行内公式：当 $v = d/t$ 时，位移 $s = vt$'}
      </Node>
      <Node
        position={[0, 0]}
        text={[{ runs: [{ text: '显式 math run：' }, { tex: '\\sin\\alpha = \\frac{1}{2}', fill: 'crimson' }] }]}
        style={{ stroke: 'none', font: { size: 18 } }}
        layout={{ padding: 0 }}
      />
      <Node position={[0, 78]} style={{ stroke: 'none', font: { size: 18 } }} layout={{ padding: 0 }}>
        {'display 公式：$$\\sum_{i=1}^{n} i^2$$'}
      </Node>
    </Layout>
  );
};

export default Demo;
