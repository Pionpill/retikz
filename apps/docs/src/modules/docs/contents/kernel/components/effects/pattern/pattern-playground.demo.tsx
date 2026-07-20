import type { FC } from 'react';

import { Layout, Node } from '@retikz/react';

import type { PreviewSourceConfig } from '@/modules/docs/components/component-preview/author';

import { usePreviewControls } from '@/modules/docs/components/component-preview/author';

import { patternPlaygroundControls } from './pattern-playground.controls';

export const previewControls = patternPlaygroundControls;

export const previewSource = {
  deriveIR: false,
} satisfies PreviewSourceConfig;

/** 固定图元和取景，只让 pattern 规格变化 */
const Demo: FC = () => {
  const values = usePreviewControls(patternPlaygroundControls);
  const background = values.background === 'transparent' ? undefined : values.background;

  return (
    <Layout width={280} height={190} viewBox={{ x: -140, y: -95, width: 280, height: 190 }}>
      <Node
        position={[0, 0]}
        shape="rectangle"
        minimumSize={{ width: 210, height: 125 }}
        fill={{
          kind: 'pattern',
          shape: values.shape,
          size: values.size,
          lineWidth: values.lineWidth,
          rotation: values.rotation,
          color: values.color,
          background,
        }}
        stroke={values.color}
      >
        {values.shape}
      </Node>
    </Layout>
  );
};

export default Demo;
