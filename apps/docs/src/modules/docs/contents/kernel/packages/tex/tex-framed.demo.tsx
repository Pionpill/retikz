import type { FC } from 'react';

import { Layout, Node, Path, Step } from '@retikz/react';
import { useLowerTex } from '@retikz/tex/react';

const Demo: FC = () => {
  const lowerTex = useLowerTex();
  return (
    <Layout width={460} height={160} lowerTex={lowerTex}>
      {/* 带框公式 = 给含公式的 node 配 shape；容器由公式 bbox + padding 自动定尺寸 */}
      <Node id="box" position={[-100, 0]} shape="rectangle" fill="#eef2ff" stroke="#4f46e5" padding={12}>
        {'$E = mc^2$'}
      </Node>
      <Node id="circ" position={[100, 0]} shape="circle" fill="#fff" stroke="#0f766e" padding={12}>
        {'$\\oint_C \\vec{F}$'}
      </Node>
      <Path stroke="#94a3b8" arrow="->">
        <Step kind="move" to="box" />
        <Step kind="line" to="circ" />
      </Path>
    </Layout>
  );
};

export default Demo;
