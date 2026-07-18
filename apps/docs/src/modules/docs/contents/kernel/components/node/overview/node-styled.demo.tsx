import type { FC } from 'react';

import { Layout, Node } from '@retikz/react';

import type { PreviewSourceConfig } from '@/modules/docs/components/component-preview/author';

import { usePreviewControls } from '@/modules/docs/components/component-preview/author';

import { nodeStyledControls } from './node-styled.controls';

export const previewSource = {
  deriveIR: false,
} satisfies PreviewSourceConfig;

const Demo: FC = () => {
  const values = usePreviewControls(nodeStyledControls);

  return (
    <Layout width={400} height={180}>
      <Node
        id="node"
        position={[0, 0]}
        shape={values.shape}
        fill={values.fill}
        stroke={values.stroke}
        strokeWidth={values.strokeWidth}
        dashed={values.dashed}
        opacity={values.opacity}
        padding={18}
      >
        {values.text}
      </Node>
    </Layout>
  );
};

export default Demo;
