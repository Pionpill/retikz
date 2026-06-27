import type { FC } from 'react';
import { Layout, Node } from '@retikz/react';
import { useLowerTex } from '@retikz/tex/react';

// 一个 `$$...$$` display 块里放一个多行 LaTeX 环境——仍是一个 node、一个 bbox、一个连接目标
const multilineFormula = String.raw`$$\begin{array}{rl}
f(x) &= ax^2 + bx + c\\
f'(x) &= 2ax + b\\
f''(x) &= 2a
\end{array}$$`;

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
