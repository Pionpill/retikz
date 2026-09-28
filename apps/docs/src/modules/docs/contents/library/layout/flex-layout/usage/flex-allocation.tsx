import { FlexLayout, FlexLayoutItem } from '@retikz/layout-react';
import { FLEX_LAYOUT_INSPECTOR_KEY } from '@retikz/layout/inspect';
import { Layout, Node } from '@retikz/react';
import type { FC } from 'react';

import { defineFlexPreview } from '../preview';
import { previewControlContract } from './flex-allocation.controls';

export { createPreviewControlContract } from './flex-allocation.controls';
export const previewControls = previewControlContract.controls;
const preview = defineFlexPreview(
  previewControlContract,
  values => (
    <Layout>
      <FlexLayout
        size={{ x: { kind: 'fixed', value: values.width }, y: { kind: 'content' } }}
        padding={12}
        gap={8}
        alignItems="center"
      >
        <FlexLayoutItem itemKey="a" basis={values.basis} min={32} grow={values.grow} shrink={1}>
          <Node
            position={[0, 0]}
            text="First Node"
            layout={{ minimumSize: { width: 32, height: 36 } }}
            style={{ stroke: 'dodgerblue' }}
          />
        </FlexLayoutItem>
        <FlexLayoutItem itemKey="b" basis={values.basis} min={32} grow={0} shrink={values.shrink}>
          <Node
            position={[0, 0]}
            text="Secondary Node"
            layout={{ minimumSize: { width: 32, height: 36 } }}
            style={{ stroke: 'gray' }}
          />
        </FlexLayoutItem>
        <FlexLayoutItem itemKey="c" basis={values.basis} min={32} grow={1} shrink={1}>
          <Node
            position={[0, 0]}
            text="Third Node"
            layout={{ minimumSize: { width: 32, height: 36 } }}
            style={{ stroke: 'gray' }}
          />
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
