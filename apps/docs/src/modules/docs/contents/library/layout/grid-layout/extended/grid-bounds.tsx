import { GridLayout, GridLayoutItem } from '@retikz/layout-react';
import { GRID_LAYOUT_INSPECTOR_KEY } from '@retikz/layout/inspect';
import { Layout, Node } from '@retikz/react';
import type { FC } from 'react';

import { defineGridPreview } from '../preview';
import { previewControlContract } from './grid-bounds.controls';

export { createPreviewControlContract } from './grid-bounds.controls';
export const previewControls = previewControlContract.controls;

const preview = defineGridPreview(
  previewControlContract,
  values => (
    <Layout>
      <GridLayout
        columns={[
          { kind: 'content', mode: values.mode },
          {
            kind: 'minmax',
            min: { kind: 'fixed', value: values.minimum },
            max: { kind: 'fixed', value: values.maximum },
          },
        ]}
        size={{ x: { kind: 'fixed', value: values.width } }}
        padding={12}
        columnGap={12}
        rowGap={12}
        justifyItems="center"
        alignItems="center"
      >
        <GridLayoutItem itemKey="0">
          <Node text="First Node" style={{ stroke: 'dodgerblue' }} />
        </GridLayoutItem>
        <GridLayoutItem itemKey="1">
          <Node
            text="Secondary Node"
            layout={{ minimumSize: { width: values.childWidth } }}
            style={{ stroke: 'darkorange' }}
          />
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
