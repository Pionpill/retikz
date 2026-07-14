import type { FC } from 'react';

import { Layout, Node } from '@retikz/react';
import { useLowerTex } from '@retikz/tex/react';

import type { PreviewSourceConfig } from '@/modules/docs/components/component-preview';

// A multiline LaTeX environment remains one node, one bbox, and one connection target.
const multilineFormula = String.raw`$$\begin{array}{rl}
f(x) &= ax^2 + bx + c\\
f'(x) &= 2ax + b\\
f''(x) &= 2a
\end{array}$$`;

export const previewSource = {
  deriveIR: false,
} satisfies PreviewSourceConfig;

/** One node can carry a multiline LaTeX environment inside `$$...$$` and remain frameable. */
const Demo: FC = () => {
  const lowerTex = useLowerTex();
  return (
    <Layout width={460} height={180} lowerTex={lowerTex}>
      <Node id="derivatives" position={[0, 0]} shape="rectangle" fill="#f8fafc" stroke="#475569" padding={14}>
        {multilineFormula}
      </Node>
    </Layout>
  );
};

export default Demo;
