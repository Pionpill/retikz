import type { LowerTex } from '@retikz/core';
import type { Lang } from '@/i18n';
import type { FC } from 'react';

import { Layout, Node } from '@retikz/react';
import { useLowerTex } from '@retikz/tex/react';

import { texFormulaBasicsI18n } from './tex-formula-basics.i18n';

import type { PreviewSourceConfig } from '@/modules/docs/components/component-preview';

export const previewSource = {
  deriveIR: false,
} satisfies PreviewSourceConfig;

/** 展示字符串公式、显式 math run 与 display 公式的中文基础写法 */
const Demo: FC<{ lang?: Lang }> = props => {
  const { lang = 'zh' } = props;
  const i18n = texFormulaBasicsI18n[lang];
  const lowerTexState = useLowerTex({ profile: 'math' });

  if (lowerTexState.status !== 'ready') {
    return <Layout />;
  }

  const lowerTex: LowerTex = lowerTexState.lowerTex;

  return (
    <Layout lowerTex={lowerTex}>
      <Node position={[0, -48]} style={{ stroke: 'none', font: { size: 18 } }} layout={{ padding: 0 }}>
        {i18n.inlineFormula}
      </Node>
      <Node
        position={[0, 0]}
        text={[{ runs: [{ text: i18n.explicitMathRun }, { tex: '\\sin\\alpha = \\frac{1}{2}', fill: 'crimson' }] }]}
        style={{ stroke: 'none', font: { size: 18 } }}
        layout={{ padding: 0 }}
      />
      <Node position={[0, 48]} style={{ stroke: 'none', font: { size: 18 } }} layout={{ padding: 0 }}>
        {i18n.displayFormula}
      </Node>
    </Layout>
  );
};

export default Demo;
