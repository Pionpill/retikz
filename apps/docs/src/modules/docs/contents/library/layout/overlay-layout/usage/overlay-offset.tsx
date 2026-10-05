import { OverlayLayout, OverlayLayoutItem } from '@retikz/layout-react';
import { OVERLAY_LAYOUT_INSPECTOR_KEY } from '@retikz/layout/inspect';
import { Layout, Node } from '@retikz/react';
import type { FC } from 'react';

import { defineOverlayPreview } from '../preview';
import { previewControlContract } from './overlay-offset.controls';

export { createPreviewControlContract } from './overlay-offset.controls';
export const previewControls = previewControlContract.controls;

const preview = defineOverlayPreview(
  previewControlContract,
  values => (
    <Layout>
      <OverlayLayout size={{ x: { kind: 'fixed', value: 300 }, y: { kind: 'fixed', value: 150 } }} padding={12}>
        <OverlayLayoutItem>
          <Node text="First Node" style={{ stroke: 'dodgerblue' }} />
        </OverlayLayoutItem>
        <OverlayLayoutItem offset={{ x: values.x, y: values.y }} alignSelf={values.alignSelf}>
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
