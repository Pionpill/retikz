import { GridLayout, GridLayoutItem } from '@retikz/layout-react';
import { GRID_LAYOUT_INSPECTOR_KEY } from '@retikz/layout/inspect';
import { Layout, Node } from '@retikz/react';
import type { FC } from 'react';

import { defineGridPreview } from '../preview';
import { previewControlContract } from './grid-alignment.controls';

export { createPreviewControlContract } from './grid-alignment.controls';
export const previewControls = previewControlContract.controls;
const preview = defineGridPreview(
  previewControlContract,
  values => (
    <Layout>
      <GridLayout
        columns={[
          { kind: 'fixed', value: 130 },
          { kind: 'fixed', value: 130 },
        ]}
        rows={[
          { kind: 'fixed', value: 60 },
          { kind: 'fixed', value: 60 },
        ]}
        size={{ x: { kind: 'fixed', value: 350 }, y: { kind: 'fixed', value: 190 } }}
        padding={12}
        columnGap={8}
        rowGap={8}
        justifyContent={values.justifyContent}
        alignContent={values.alignContent}
        justifyItems={values.justifyItems}
        alignItems={values.alignItems}
      >
        <GridLayoutItem itemKey="0">
          <Node text="First Node" style={{ stroke: 'dodgerblue' }} />
        </GridLayoutItem>
        <GridLayoutItem itemKey="1">
          <Node text="Secondary Node" style={{ stroke: 'darkorange' }} />
        </GridLayoutItem>
        <GridLayoutItem itemKey="2">
          <Node text="Third Node" style={{ stroke: 'seagreen' }} />
        </GridLayoutItem>
        <GridLayoutItem itemKey="3">
          <Node text="Fourth Node" style={{ stroke: 'gray' }} />
        </GridLayoutItem>
      </GridLayout>
    </Layout>
  ),
  () => ({
    rules: [
      {
        kind: 'request',
        inspector: GRID_LAYOUT_INSPECTOR_KEY,
        target: { kind: 'scene' },
        options: {
          bounds: { container: true, content: false, slot: true, allocation: false, visual: false },
          spacing: false,
          tracks: true,
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
