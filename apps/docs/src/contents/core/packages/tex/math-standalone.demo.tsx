import type { FC } from 'react';
import { Layout, Node, Path, Step } from '@retikz/react';
import { useLowerMath } from '@retikz/tex/react';

/**
 * 独立公式块（A）：无 shape 的节点公式（children 对象写法）复用全套几何——定位、连线、视觉效果
 * @description useLowerMath 一行启动 MathJax 并经 <Layout lowerMath> 注入；displayMode 用块级度量（更大的求和号），
 *   公式块可被 <Path> 连线、可加 shadow
 */
const Demo: FC = () => {
  const lowerMath = useLowerMath();
  return (
    <Layout width={460} height={200} lowerMath={lowerMath}>
      <Node id="sum" position={[0, 50]}>
        {{ tex: '\\sum_{i=1}^{n} i^2 = \\frac{n(n+1)(2n+1)}{6}', displayMode: true }}
      </Node>
      <Node id="emc" position={[0, -50]} shadow="sm">
        {{ tex: 'E = mc^2' }}
      </Node>
      <Path stroke="#94a3b8">
        <Step kind="move" to="sum" />
        <Step kind="line" to="emc" />
      </Path>
    </Layout>
  );
};

export default Demo;
