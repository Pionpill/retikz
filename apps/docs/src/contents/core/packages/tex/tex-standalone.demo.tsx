import type { FC } from 'react';
import { Layout, Path, Step } from '@retikz/react';
import { TexNode, useLowerTex } from '@retikz/tex/react';

const Demo: FC = () => {
  const lowerTex = useLowerTex();
  return (
    <Layout width={460} height={200} lowerTex={lowerTex}>
      <TexNode id="sum" position={[0, 50]} displayMode>
        {'\\sum_{i=1}^{n} i^2 = \\frac{n(n+1)(2n+1)}{6}'}
      </TexNode>
      <TexNode id="emc" position={[0, -50]} shadow="sm">
        {'E = mc^2'}
      </TexNode>
      <Path stroke="#94a3b8">
        <Step kind="move" to="sum" />
        <Step kind="line" to="emc" />
      </Path>
    </Layout>
  );
};

export default Demo;
