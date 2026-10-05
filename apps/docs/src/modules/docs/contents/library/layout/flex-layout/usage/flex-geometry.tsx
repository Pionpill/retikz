import { FlexLayout, FlexLayoutItem } from '@retikz/layout-react';
import { FLEX_LAYOUT_INSPECTOR_KEY } from '@retikz/layout/inspect';
import { Layout, Node } from '@retikz/react';
import type { FC } from 'react';

import { defineFlexPreview } from '../preview';
import { previewControlContract } from './flex-geometry.controls';

export { createPreviewControlContract } from './flex-geometry.controls';
export const previewControls = previewControlContract.controls;

const preview = defineFlexPreview(
  previewControlContract,
  values => (
    <Layout>
      <FlexLayout
        direction={values.direction}
        size={{
          x: values.widthMode === 'fixed' ? { kind: 'fixed', value: values.width } : { kind: 'content' },
          y: values.heightMode === 'fixed' ? { kind: 'fixed', value: values.height } : { kind: 'content' },
        }}
        padding={values.padding}
        gap={values.gap}
      >
        <FlexLayoutItem itemKey="a">
          <Node
            text="First Node"
            layout={{ minimumSize: { width: 36, height: 36 } }}
            style={{ stroke: 'dodgerblue' }}
          />
        </FlexLayoutItem>
        <FlexLayoutItem itemKey="b">
          <Node text="Secondary Node" layout={{ minimumSize: { width: 36, height: 36 } }} style={{ stroke: 'gray' }} />
        </FlexLayoutItem>
        <FlexLayoutItem itemKey="c">
          <Node text="Third Node" layout={{ minimumSize: { width: 36, height: 36 } }} style={{ stroke: 'gray' }} />
        </FlexLayoutItem>
      </FlexLayout>
    </Layout>
  ),
  () => ({
    rules: [
      {
        kind: 'request',
        inspector: FLEX_LAYOUT_INSPECTOR_KEY,
        target: { kind: 'scene' },
        options: {
          bounds: { container: true, content: false, slot: true, allocation: false, visual: false },
          spacing: { padding: true, margin: false },
          lines: false,
          gaps: true,
          distributedSpace: false,
          overflow: false,
          alignmentGuides: false,
        },
      },
    ],
  }),
);

export const previewSource = preview.source;

/** 当前功能的交互示例 */
const Demo: FC = preview.Component;
export default Demo;
