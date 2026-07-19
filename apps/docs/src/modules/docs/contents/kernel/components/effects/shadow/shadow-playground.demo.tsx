import type { FC } from 'react';

import { Layout, Node } from '@retikz/react';

import type { PreviewSourceConfig } from '@/modules/docs/components/component-preview/author';

import { usePreviewControls } from '@/modules/docs/components/component-preview/author';

import { shadowPlaygroundControls } from './shadow-playground.controls';

export const previewSource = {
  deriveIR: false,
} satisfies PreviewSourceConfig;

/** 固定一张卡片，让面板只探索 shadow 对象的连续参数 */
const Demo: FC = () => {
  const values = usePreviewControls(shadowPlaygroundControls);

  return (
    <Layout width={280} height={230} viewBox={{ x: -140, y: -115, width: 280, height: 230 }}>
      <Node
        position={[0, 0]}
        shape="rectangle"
        fill="white"
        padding={{ x: 34, y: 22 }}
        shadow={{
          offsetX: values.offsetX,
          offsetY: values.offsetY,
          blur: values.blur,
          color: values.color,
          opacity: values.opacity,
        }}
      >
        shadow
      </Node>
    </Layout>
  );
};

export default Demo;
