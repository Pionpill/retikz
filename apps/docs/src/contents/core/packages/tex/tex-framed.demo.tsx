import type { FC } from 'react';
import { Layout, Path, Step } from '@retikz/react';
import { TexNode, useLowerTex } from '@retikz/tex/react';

const Demo: FC = () => {
  const lowerTex = useLowerTex();
  return (
    <Layout width={460} height={160} lowerTex={lowerTex}>
      <TexNode
        id="box"
        position={[-100, 0]}
        shape="rectangle"
        fill="#eef2ff"
        stroke="#4f46e5"
        padding={12}
      >
        {'E = mc^2'}
      </TexNode>
      <TexNode
        id="circ"
        position={[100, 0]}
        shape="circle"
        fill="#fff"
        stroke="#0f766e"
        padding={12}
      >
        {'\\oint_C \\vec{F}'}
      </TexNode>
      <Path stroke="#94a3b8" arrow="->">
        <Step kind="move" to="box" />
        <Step kind="line" to="circ" />
      </Path>
    </Layout>
  );
};

export default Demo;
