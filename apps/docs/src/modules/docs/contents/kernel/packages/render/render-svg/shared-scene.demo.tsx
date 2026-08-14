import type { FC } from 'react';

import { Layout } from '@retikz/react';

import { sharedRendererScene } from '../render/shared-renderer-scene.data';

/** 使用 SVG 渲染 render 分组共用的同一份 IR。 */
const Demo: FC = () => (
  <Layout
    ir={sharedRendererScene}
    renderer="svg"
    width={440}
    height={160}
    style={{ maxWidth: '100%', height: 'auto' }}
  />
);

export default Demo;
