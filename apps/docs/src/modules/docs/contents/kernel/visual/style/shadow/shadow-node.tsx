import { Layout, Node } from '@retikz/react';
import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract } from './shadow-node.controls';
/** 宿主控件注册回退 */
export const previewControls = previewControlContract.controls;
const controlledPreview = defineControlledPreview(previewControlContract, values => (
  <Layout viewBox={{ x: -150, y: -130, width: 300, height: 260 }}>
    <Node
      position={[0, 0]}
      label={{ text: 'label', position: 'top' }}
      layout={{ minimumSize: { width: 100, height: 64 } }}
      style={{
        fill: 'lightskyblue',
        shadow: values.enabled
          ? {
              offsetX: values.offsetX,
              offsetY: values.offsetY,
              blur: values.blur,
              color: values.color,
              opacity: values.opacity,
            }
          : 'none',
      }}
    >
      Node
    </Node>
  </Layout>
));
/** 与实时预览共用的源码状态 */
export const previewSource = controlledPreview.source;
/** 阴影边界交互示例 */
const ShadowDemo: FC = controlledPreview.Component;
export default ShadowDemo;
