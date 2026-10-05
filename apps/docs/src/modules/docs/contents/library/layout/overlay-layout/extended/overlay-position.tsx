import { OverlayLayout, OverlayLayoutItem } from '@retikz/layout-react';
import { OVERLAY_LAYOUT_INSPECTOR_KEY } from '@retikz/layout/inspect';
import { Layout, Node } from '@retikz/react';
import type { FC } from 'react';

import { defineOverlayPreview } from '../preview';
import { previewControlContract } from './overlay-position.controls';

export { createPreviewControlContract } from './overlay-position.controls';
export const previewControls = previewControlContract.controls;

const preview = defineOverlayPreview(
  previewControlContract,
  values => (
    <Layout>
      <OverlayLayout size={{ x: { kind: 'fixed', value: 300 }, y: { kind: 'fixed', value: 150 } }} padding={12}>
        <OverlayLayoutItem justifySelf="start" alignSelf="end">
          <Node text="First Node" style={{ stroke: 'dodgerblue' }} />
        </OverlayLayoutItem>
        <OverlayLayoutItem
          placement={{
            kind: 'positioned',
            at: { x: values.x, y: values.y },
            anchor: {
              x: values.anchor === 'left' ? 0 : values.anchor === 'center' ? 0.5 : 1,
              y: values.anchor === 'center' ? 0.5 : 0,
            },
            width: values.width,
            height: 44,
          }}
        >
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
