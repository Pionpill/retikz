import { Layout, Path, Step } from '@retikz/react';
import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract } from './shadow-path.controls';
/** 宿主控件注册回退 */
export const previewControls = previewControlContract.controls;
const controlledPreview = defineControlledPreview(previewControlContract, values => (
  <Layout viewBox={{ x: -150, y: -130, width: 300, height: 260 }}>
    <Path
      arrow="->"
      label={{ text: 'Path', side: 'top', position: 'midway', sloped: false }}
      style={{
        stroke: 'currentColor',
        strokeWidth: 4,
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
      <Step kind="move" to={[-70, 20]} />
      <Step kind="line" to={[70, -20]} />
    </Path>
  </Layout>
));
/** 与实时预览共用的源码状态 */
export const previewSource = controlledPreview.source;
/** 阴影边界交互示例 */
const ShadowDemo: FC = controlledPreview.Component;
export default ShadowDemo;
