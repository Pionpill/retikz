import { GridLayout, GridLayoutItem } from '@retikz/layout-react';
import { GRID_LAYOUT_INSPECTOR_KEY } from '@retikz/layout/inspect';
import { Layout, Node } from '@retikz/react';
import type { FC } from 'react';

import { defineGridPreview } from '../preview';
import { previewControlContract } from './grid-overlap.controls';

export { createPreviewControlContract } from './grid-overlap.controls';
export const previewControls = previewControlContract.controls;

const preview = defineGridPreview(
  previewControlContract,
  values => (
    <Layout>
      <GridLayout
        columns={[
          { kind: 'fixed', value: 160 },
          { kind: 'fixed', value: 160 },
        ]}
        rows={[{ kind: 'fixed', value: 70 }]}
        size={{ x: { kind: 'fixed', value: 250 } }}
        padding={12}
        columnGap={12}
        overlap={values.overlap ? 'allow' : 'reject'}
        overflow={values.overflow}
        justifyItems="center"
        alignItems="center"
      >
        <GridLayoutItem column={{ start: 0 }} row={{ start: 0 }}>
          <Node text="First Node" style={{ stroke: 'dodgerblue' }} />
        </GridLayoutItem>
        <GridLayoutItem column={{ start: values.overlap ? 0 : 1 }} row={{ start: 0 }}>
          <Node text="Secondary Node" style={{ stroke: 'darkorange' }} />
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
