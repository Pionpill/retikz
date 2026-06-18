import type { FC } from 'react';
import { Layout } from '@retikz/react';
import { TexNode, useLowerTex } from '@retikz/tex/react';

const multilineFormula = String.raw`\begin{array}{rl}
f(x) &= ax^2 + bx + c\\
f'(x) &= 2ax + b\\
f''(x) &= 2a
\end{array}`;

/** One <TexNode> can carry a multiline LaTeX environment and remain frameable. */
const Demo: FC = () => {
  const lowerTex = useLowerTex();
  return (
    <Layout width={460} height={180} lowerTex={lowerTex}>
      <TexNode
        id="derivatives"
        position={[0, 0]}
        tex={multilineFormula}
        displayMode
        shape="rectangle"
        fill="#f8fafc"
        stroke="#475569"
        padding={14}
      />
    </Layout>
  );
};

export default Demo;
