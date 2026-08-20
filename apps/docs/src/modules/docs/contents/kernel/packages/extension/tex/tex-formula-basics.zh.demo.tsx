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
    return <Layout width={560} height={280} viewBox={{ x: -280, y: -140, width: 560, height: 280 }} />;
  }

  const lowerTex: LowerTex = lowerTexState.lowerTex;

  return (
    <Layout width={560} height={280} viewBox={{ x: -280, y: -140, width: 560, height: 280 }} lowerTex={lowerTex}>
      <Node position={[0, -78]} stroke="none" padding={0} font={{ size: 18 }}>
        {'行内公式：当 $v = d/t$ 时，位移 $s = vt$'}
      </Node>
      <Node
        position={[0, 0]}
        stroke="none"
        padding={0}
        font={{ size: 18 }}
        text={[{ runs: [{ text: '显式 math run：' }, { tex: '\\sin\\alpha = \\frac{1}{2}', fill: 'crimson' }] }]}
      />
      <Node position={[0, 78]} stroke="none" padding={0} font={{ size: 18 }}>
        {'display 公式：$$\\sum_{i=1}^{n} i^2$$'}
      </Node>
    </Layout>
  );
};

export default Demo;
