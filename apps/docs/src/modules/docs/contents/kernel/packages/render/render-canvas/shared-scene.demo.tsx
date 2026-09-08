import type { FC } from 'react';

import { Layout } from '@retikz/react';

import { sharedRendererScene } from '../render/shared-renderer-scene.data';

/** 使用 Canvas 渲染 render 分组共用的同一份 IR。 */
const Demo: FC = () => <Layout ir={sharedRendererScene} renderer="canvas" />;

export default Demo;
