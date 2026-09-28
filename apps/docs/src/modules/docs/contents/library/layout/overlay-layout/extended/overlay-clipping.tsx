import { OverlayLayout, OverlayLayoutItem } from '@retikz/layout-react';
import { OVERLAY_LAYOUT_INSPECTOR_KEY } from '@retikz/layout/inspect';
import { Layout, Node } from '@retikz/react';
import type { FC } from 'react';

import { defineOverlayPreview } from '../preview';
import { previewControlContract } from './overlay-clipping.controls';

export { createPreviewControlContract } from './overlay-clipping.controls';
export const previewControls = previewControlContract.controls;
const preview = defineOverlayPreview(
  previewControlContract,
  values => (
    <Layout>
      <OverlayLayout
        size={{ x: { kind: 'fixed', value: 230 }, y: { kind: 'fixed', value: 110 } }}
        padding={12}
        overflow={values.overflow}
      >
        <OverlayLayoutItem>
          <Node text="First Node" style={{ stroke: 'dodgerblue' }} />
        </OverlayLayoutItem>
        <OverlayLayoutItem sizeParticipation="exclude" offset={{ x: values.offset, y: 20 }}>
          <Node text="Secondary Node" style={{ stroke: 'darkorange' }} />
        </OverlayLayoutItem>
      </OverlayLayout>
    </Layout>
  ),
  () => ({
    rules: [
      {
        kind: 'request',
        inspector: OVERLAY_LAYOUT_INSPECTOR_KEY,
        target: { kind: 'scene' },
        options: {
          bounds: { container: true, content: false, slot: true, allocation: false, visual: false },
          spacing: false,
          anchors: true,
          placements: true,
          stacking: true,
          alignmentGuides: false,
        },
      },
    ],
  }),
);
export const previewSource = preview.source;
/** 本节 API 的交互示例，所有入口共享场景与检查配置 */
const Demo: FC = preview.Component;
export default Demo;
