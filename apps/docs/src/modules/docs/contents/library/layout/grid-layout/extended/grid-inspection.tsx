import { GridLayout, GridLayoutItem } from '@retikz/layout-react';
import { GRID_LAYOUT_INSPECTOR_KEY } from '@retikz/layout/inspect';
import { Layout, Node } from '@retikz/react';
import type { FC } from 'react';

import { defineGridPreview } from '../preview';
import { previewControlContract } from './grid-inspection.controls';

export { createPreviewControlContract } from './grid-inspection.controls';
export const previewControls = previewControlContract.controls;
const preview = defineGridPreview(
  previewControlContract,
  values => (
    <Layout>
      <GridLayout
        columns={[
          { kind: 'fraction', factor: 1 },
          { kind: 'fraction', factor: 1 },
        ]}
        size={{ x: { kind: 'fixed', value: values.width } }}
        padding={12}
        columnGap={12}
        rowGap={12}
        justifyItems="center"
        alignItems="center"
      >
        <GridLayoutItem itemKey="0">
          <Node position={[0, 0]} text="First Node" style={{ stroke: 'dodgerblue' }} />
        </GridLayoutItem>
        <GridLayoutItem itemKey="1">
          <Node position={[0, 0]} text="Secondary Node" style={{ stroke: 'darkorange' }} />
        </GridLayoutItem>
        <GridLayoutItem itemKey="2">
          <Node position={[0, 0]} text="Third Node" style={{ stroke: 'seagreen' }} />
        </GridLayoutItem>
        <GridLayoutItem itemKey="3">
          <Node position={[0, 0]} text="Fourth Node" style={{ stroke: 'gray' }} />
        </GridLayoutItem>
      </GridLayout>
    </Layout>
  ),
  values => ({
    rules: [
      {
        kind: 'request',
        inspector: GRID_LAYOUT_INSPECTOR_KEY,
        target: { kind: 'scene' },
        options: {
          bounds: { container: true, content: false, slot: values.slots, allocation: values.allocation, visual: false },
          spacing: false,
          tracks: values.details,
          cells: false,
          gaps: true,
          spans: true,
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
