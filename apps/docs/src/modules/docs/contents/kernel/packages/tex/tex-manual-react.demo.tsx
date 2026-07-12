import type { LowerTex } from '@retikz/core';
import type { FC } from 'react';

import { Layout, Node } from '@retikz/react';
import { createLowerTex, createMathJaxEngine } from '@retikz/tex';
import { useEffect, useState } from 'react';

import type { PreviewSourceConfig } from '@/modules/docs/components/component-preview';

const formula = String.raw`$$\int_0^1 x^2\,dx = \frac{1}{3}$$`;

export const previewSource = {
  deriveIR: false,
} satisfies PreviewSourceConfig;

const Demo: FC = () => {
  const [lowerTex, setLowerTex] = useState<LowerTex>();

  useEffect(() => {
    let alive = true;
    void createMathJaxEngine().then(engine => {
      if (alive) setLowerTex(() => createLowerTex(engine));
    });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <Layout width={460} height={160} lowerTex={lowerTex}>
      <Node id="manual" position={[0, 0]} shape="rectangle" fill="#f8fafc" stroke="#475569" padding={14}>
        {formula}
      </Node>
    </Layout>
  );
};

export default Demo;
